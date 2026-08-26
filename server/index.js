const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Segredo do JWT: em producao falha claro (padrao LILP — segredo por ambiente,
// sem fallback). Fora de producao gera um segredo efemero por processo, para o
// repositorio nao publicar nenhuma constante que sirva para forjar token.
// Efeito colateral aceito: reiniciar o servidor invalida as sessoes abertas.
function resolveJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;
  if (IS_PRODUCTION) {
    console.error('ERRO: JWT_SECRET nao definido. Defina a variavel antes de subir em producao.');
    console.error('      Gere um valor com: openssl rand -hex 32');
    process.exit(1);
  }
  console.warn('AVISO: JWT_SECRET nao definido. Usando segredo efemero — as sessoes caem a cada reinicio.');
  return require('crypto').randomBytes(32).toString('hex');
}
const JWT_SECRET = resolveJwtSecret();

// Chave da YouTube Data API. Vazia e um estado valido: sem ela a importacao de
// playlists fica desligada e diz isso, em vez de chamar a API sem credencial e
// repassar o erro cru do Google.
const YOUTUBE_API_KEY = (process.env.YOUTUBE_API_KEY || '').trim();
const YOUTUBE_ENABLED = YOUTUBE_API_KEY.length > 0;
if (!YOUTUBE_ENABLED) {
  console.warn('AVISO: YOUTUBE_API_KEY nao definido. A importacao de playlists fica desativada.');
}

// Atras de proxy reverso, req.ip precisa vir do X-Forwarded-For: sem isto o
// rate limit de autenticacao conta todos os usuarios como um IP so e a
// contagem de visualizacoes deduplica visitantes distintos.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'forum.db');
const db = new Database(dbPath);

// Ativar verificação de foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Função SQL customizada para normalizar acentos
db.function('normalize_text', (text) => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
});

// Limites de entrada, num lugar so. Cadastro e edicao de perfil gravam a mesma
// tabela: quem validar menos vira a porta de entrada.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const MAX_USERNAME = 60;
const MAX_EMAIL = 254; // limite de endereco do RFC 5321
const MAX_LOCATION = 120;
const MAX_ORGANIZATION = 160;
const MAX_BIO = 1000;
const MAX_TITLE = 200;
const MAX_CONTENT = 50000;
const MAX_QUESTION = 100;
const MAX_MESSAGE = 5000;

// Regras dos campos livres de perfil, compartilhadas pelas duas rotas.
// Devolve a mensagem de erro, ou null quando esta tudo certo.
// Sao os campos que aparecem no perfil publico (GET /api/users/:id) — sem teto,
// o cadastro aceitava texto de qualquer tamanho em organization e location.
function validarCamposLivres({ location, organization, bio }) {
  for (const [campo, valor, limite] of [
    ['Localidade', location, MAX_LOCATION],
    ['Organização', organization, MAX_ORGANIZATION],
    ['Bio', bio, MAX_BIO],
  ]) {
    if (valor === undefined || valor === null) continue;
    if (typeof valor !== 'string') return `${campo} deve ser texto`;
    if (valor.length > limite) return `${campo} deve ter no máximo ${limite} caracteres`;
  }
  return null;
}

// =================== EXCLUSAO EM CASCATA ===================
// O schema declara as FK sem ON DELETE CASCADE, e o boot liga
// `PRAGMA foreign_keys = ON`. A limpeza portanto e responsabilidade do codigo:
// filho antes de pai, sempre. Antes cada rota repetia essa ordem por conta
// propria e nenhuma delas limpava post_likes/post_dislikes — apagar um topico
// cujo post tivesse uma curtida estourava a FK no meio da sequencia, deixando
// o topico vivo mas ja sem tags nem curtidas. Aqui a ordem existe uma vez so,
// e quem chama envolve tudo numa transacao.

// Remove as reacoes dos posts informados. Passo que faltava nas tres rotas.
function limparReacoesDosPosts(postIds) {
  if (postIds.length === 0) return;
  const delLikes = db.prepare('DELETE FROM post_likes WHERE post_id = ?');
  const delDislikes = db.prepare('DELETE FROM post_dislikes WHERE post_id = ?');
  for (const postId of postIds) {
    delLikes.run(postId);
    delDislikes.run(postId);
  }
}

// Apaga um topico e tudo que depende dele. NAO abre transacao: quem chama
// decide o escopo, para que apagar um usuario com 30 topicos siga atomico.
function apagarTopicoEmCascata(topicId) {
  const postIds = db.prepare('SELECT id FROM posts WHERE topic_id = ?').all(topicId).map((p) => p.id);
  limparReacoesDosPosts(postIds);
  db.prepare('DELETE FROM poll_votes WHERE topic_id = ?').run(topicId);
  db.prepare('DELETE FROM poll_options WHERE topic_id = ?').run(topicId);
  db.prepare('DELETE FROM topic_tags WHERE topic_id = ?').run(topicId);
  db.prepare('DELETE FROM likes WHERE topic_id = ?').run(topicId);
  db.prepare('DELETE FROM posts WHERE topic_id = ?').run(topicId);
  // notifications nao tem FK, mas reference_id apontando para topico apagado
  // faz o front navegar para um 404.
  db.prepare("DELETE FROM notifications WHERE type = 'moderation' AND reference_id = ?").run(topicId);
  db.prepare('DELETE FROM topics WHERE id = ?').run(topicId);
}

// Apaga um post e suas reacoes.
function apagarPostEmCascata(postId) {
  limparReacoesDosPosts([postId]);
  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
}

// =================== CONTA SENTINELA ===================
// Excluir uma conta nao pode apagar a discussao publica que outros orgaos
// construiram em cima dela. Topicos e respostas sao reatribuidos a esta conta;
// o que e pessoal (mensagens, notificacoes, interesses, reacoes) e eliminado.
const EMAIL_USUARIO_REMOVIDO = 'usuario-removido@recpsp.invalid';
const NOME_USUARIO_REMOVIDO = 'Usuário removido';

// A identidade da sentinela e reservada em TODA rota que grava users.email ou
// users.username — cadastro e edicao de perfil. Nao basta guardar o cadastro:
// bastaria criar uma conta comum e depois editar o perfil para o e-mail da
// sentinela (antes dela existir, o UNIQUE nao protege) para, na primeira
// exclusao de conta, passar a assinar o conteudo de todos os removidos.
function identidadeReservada(email, username) {
  // NFKC + remocao de invisiveis antes de comparar: sem normalizar, o mesmo
  // nome escrito em NFD, com espaco sem quebra ou com caractere de largura
  // zero passava pela guarda. Nao e desvio da protecao real (essa corre pelo
  // e-mail, comparado por igualdade exata), mas evita um sosia visual da
  // sentinela assinando conteudo no forum.
  const normalizar = (v) => String(v)
    .normalize('NFKC')
    .replace(/[\u00ad\u200b-\u200f\u2060\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (email !== undefined && email !== null && normalizar(email) === EMAIL_USUARIO_REMOVIDO) return true;
  if (username !== undefined && username !== null
      && normalizar(username) === normalizar(NOME_USUARIO_REMOVIDO)) return true;
  return false;
}

// Sentinela e criada sob demanda, banida (nao autentica) e com senha aleatoria
// que ninguem conhece — nem quem le o repositorio.
//
// A identidade e reservada nas rotas de escrita, mas um banco anterior a essa
// reserva pode ja ter alguem com o nome 'Usuário removido'. users.username e
// UNIQUE, entao o INSERT falharia e — por rodar dentro da transacao de
// exclusao — derrubaria TODA exclusao de conta com 500 enquanto o nome
// estivesse tomado. A sentinela nunca depende de um nome estar livre.
function obterUsuarioRemovido() {
  const existente = db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL_USUARIO_REMOVIDO);
  if (existente) return existente.id;

  const senhaInutilizavel = bcrypt.hashSync(require('crypto').randomBytes(32).toString('hex'), 10);
  const inserir = db.prepare(`
    INSERT INTO users (username, email, password, role, banned, bio)
    VALUES (?, ?, ?, 'user', 1, ?)
  `);
  const bio = 'Conta removida. As publicações abaixo foram mantidas para preservar o histórico das discussões.';

  let nome = NOME_USUARIO_REMOVIDO;
  const tomado = db.prepare('SELECT id FROM users WHERE username = ?').get(nome);
  if (tomado) {
    // Nao renomeamos a conta de terceiro: a sentinela cede e usa um sufixo.
    let sufixo = 2;
    while (db.prepare('SELECT id FROM users WHERE username = ?').get(`${NOME_USUARIO_REMOVIDO} (${sufixo})`)) sufixo++;
    nome = `${NOME_USUARIO_REMOVIDO} (${sufixo})`;
    console.warn(`AVISO: o nome "${NOME_USUARIO_REMOVIDO}" ja pertence ao usuario ${tomado.id}; a sentinela ficou como "${nome}".`);
  }

  return Number(inserir.run(nome, EMAIL_USUARIO_REMOVIDO, senhaInutilizavel, bio).lastInsertRowid);
}

// Remove a conta preservando o conteudo publico. NAO abre transacao: quem
// chama define o escopo.
function anonimizarERemoverUsuario(userId) {
  const sentinelaId = obterUsuarioRemovido();

  // --- dado pessoal: sai ---
  db.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').run(userId, userId);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  // As notificacoes de mensagem vivem na caixa do DESTINATARIO e guardam o
  // nome do remetente no texto ("Nova mensagem de Fulano") com reference_id
  // apontando para ele. Sao de terceiros, entao sobreviviam a exclusao: o nome
  // real continuava visivel e o link levava a um perfil que nao existe mais.
  db.prepare("DELETE FROM notifications WHERE type = 'message' AND reference_id = ?").run(userId);
  db.prepare('DELETE FROM user_categories WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM user_specialties WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM specialist_requests WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM user_course_progress WHERE user_id = ?').run(userId);
  // Reacoes revelam o que a pessoa leu e endossou: tambem sao dado pessoal.
  db.prepare('DELETE FROM likes WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM post_likes WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM post_dislikes WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM poll_votes WHERE user_id = ?').run(userId);
  // Especializacoes concedidas por esta conta perdem o concedente, nao o efeito.
  db.prepare('UPDATE user_specialties SET granted_by = NULL WHERE granted_by = ?').run(userId);
  db.prepare('UPDATE specialist_requests SET reviewed_by = NULL WHERE reviewed_by = ?').run(userId);

  // --- conteudo publico: fica, sem autoria ---
  db.prepare('UPDATE topics SET user_id = ? WHERE user_id = ?').run(sentinelaId, userId);
  db.prepare('UPDATE posts SET user_id = ? WHERE user_id = ?').run(sentinelaId, userId);

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

function capitalizeInitial(value) {
  const text = String(value ?? '').trim();
  const firstLetter = text.search(/[A-Za-zÀ-ÖØ-öø-ÿ]/);
  if (firstLetter < 0) return text;
  return text.slice(0, firstLetter)
    + text[firstLetter].toLocaleUpperCase('pt-BR')
    + text.slice(firstLetter + 1);
}

// =================== SCHEMA ===================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    banned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    pinned INTEGER DEFAULT 0,
    locked INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    topic_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topic_tags (
    topic_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (topic_id, tag_id),
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS post_dislikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    reference_id INTEGER,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (option_id) REFERENCES poll_options(id),
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS user_specialties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    granted_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS specialist_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    justification TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    reviewed_by INTEGER,
    review_note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );
`);

// Adicionar coluna best_answer se nao existir
try { db.exec('ALTER TABLE posts ADD COLUMN best_answer INTEGER DEFAULT 0'); } catch {}

// Adicionar coluna type se nao existir
try { db.exec('ALTER TABLE topics ADD COLUMN type TEXT DEFAULT "discussion"'); } catch {}

// Adicionar coluna color se nao existir (para upgrade)
try { db.exec('ALTER TABLE categories ADD COLUMN color TEXT DEFAULT "#6366f1"'); } catch {}

// Adicionar colunas de perfil
try { db.exec('ALTER TABLE users ADD COLUMN location TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN organization TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ""'); } catch {}

// Adicionar colunas para tipos de topico
try { db.exec('ALTER TABLE topics ADD COLUMN image_url TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE topics ADD COLUMN video_url TEXT DEFAULT ""'); } catch {}

// Adicionar coluna status para moderacao de topicos com imagem/video
try { db.exec('ALTER TABLE topics ADD COLUMN status TEXT DEFAULT "approved"'); } catch {}

// Adicionar coluna de aceite dos termos de uso
try { db.prepare('ALTER TABLE users ADD COLUMN terms_accepted_at DATETIME').run(); } catch {}

// Adicionar coluna de aceite do comunicado de primeiro acesso ao forum
try { db.prepare('ALTER TABLE users ADD COLUMN forum_notice_accepted_at DATETIME').run(); } catch {}

// Tabela de categorias do usuario (interesses)
db.exec(`
  CREATE TABLE IF NOT EXISTS user_categories (
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );
`);

// Progresso individual nos cursos de capacitacao
db.exec(`
  CREATE TABLE IF NOT EXISTS user_course_progress (
    user_id INTEGER NOT NULL,
    course_id TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Tabela de recursos externos (videos, playlists)
db.exec(`
  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'video',
    source TEXT DEFAULT 'youtube',
    playlist_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// =================== SEED ===================
// Senha do admin inicial. Em producao nunca vem do codigo: ou o operador
// define ADMIN_PASSWORD, ou o servidor sorteia uma e imprime uma unica vez no
// log do boot. Fora de producao mantem o padrao conhecido, para nao quebrar
// desenvolvimento nem os testes de API.
function resolveAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return { senha: process.env.ADMIN_PASSWORD, origem: 'env' };
  if (IS_PRODUCTION) {
    return { senha: require('crypto').randomBytes(12).toString('base64url'), origem: 'sorteada' };
  }
  return { senha: 'admin123', origem: 'padrao-de-desenvolvimento' };
}

const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const { senha: adminPassword, origem } = resolveAdminPassword();
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  if (origem === 'sorteada') {
    console.log('='.repeat(72));
    console.log('SENHA DO ADMIN INICIAL (aparece uma unica vez, anote agora):');
    console.log(`   usuario: admin@forum.com`);
    console.log(`   senha  : ${adminPassword}`);
    console.log('   Troque-a no primeiro acesso, ou defina ADMIN_PASSWORD no ambiente.');
    console.log('='.repeat(72));
  } else if (origem === 'padrao-de-desenvolvimento') {
    console.warn('AVISO: admin criado com a senha padrao de desenvolvimento. Nao use este banco em producao.');
  }
  db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run('admin', 'admin@forum.com', hashedPassword, 'admin');

  const cats = [
    ['Planejamento', 'Planejamento de contratações públicas', '#3b82f6'],
    ['Obras Públicas', 'Contratação de obras e serviços de engenharia', '#ef4444'],
    ['Contratação Direta', 'Dispensa e inexigibilidade de licitação', '#22c55e'],
    ['Sustentabilidade', 'Critérios de sustentabilidade nas compras', '#6b7280'],
    ['Documentos', 'Modelos de editais e termos de referência', '#22c55e'],
    ['Gestão Contratual', 'Fiscalização e gestão de contratos', '#6b7280'],
    ['Licitação', 'Pregão eletrônico e processos licitatórios', '#ef4444'],
    ['Inovação', 'Ferramentas digitais e modernização', '#f97316'],
    ['Central de Compras', 'Centralização e registro de preços', '#0ea5e9'],
    ['Governança', 'Boas práticas e agentes públicos', '#f97316'],
    ['Capacitação', 'Formação e treinamento de agentes', '#6b7280'],
  ];
  for (const [name, desc, color] of cats) {
    db.prepare('INSERT INTO categories (name, description, color) VALUES (?, ?, ?)').run(name, desc, color);
  }

  const tags = ['Planejamento', 'Gestão Pública', 'Inexigibilidade', 'Dispensa', 'Compras Sustentáveis', 'ODS', 'Pregão', 'Licitação', 'Boas Práticas', 'Agentes Públicos'];
  for (const tag of tags) {
    db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tag);
  }

  console.log('Admin inicial criado com sucesso');
  console.log('Categorias e tags iniciais criadas');

  // =================== DADOS INICIAIS DO FÓRUM ===================
  // Conteudo de demonstracao: 5 contas com senha conhecida e 15 topicos
  // ficticios. Util em desenvolvimento, inaceitavel numa base real — em
  // producao so entra se SEED_DEMO_DATA=1 for pedido explicitamente.
  const semearDemo = process.env.SEED_DEMO_DATA === '1'
    || (process.env.SEED_DEMO_DATA !== '0' && !IS_PRODUCTION);
  if (!semearDemo) {
    console.log('Dados de demonstracao nao semeados (producao). Use SEED_DEMO_DATA=1 para forcar.');
  }
  if (semearDemo) {
  const testPass = bcrypt.hashSync(process.env.DEMO_PASSWORD || 'teste123', 10);
  const testUsers = [
    ['MariaLicitacao', 'maria@teste.com', testPass, 'user', 'SP', 'Prefeitura de Sao Paulo'],
    ['JoaoContratos', 'joao@teste.com', testPass, 'user', 'RJ', 'Tribunal de Contas do Estado'],
    ['AnaSustentavel', 'ana@teste.com', testPass, 'user', 'MG', 'Secretaria de Meio Ambiente'],
    ['CarlosPregao', 'carlos@teste.com', testPass, 'user', 'BA', 'Governo do Estado da Bahia'],
    ['FernandaGestao', 'fernanda@teste.com', testPass, 'user', 'DF', 'Ministerio da Economia'],
  ];
  for (const [username, email, pass, role, loc, org] of testUsers) {
    db.prepare('INSERT INTO users (username, email, password, role, location, organization) VALUES (?, ?, ?, ?, ?, ?)').run(username, email, pass, role, loc, org);
  }

  // IDs: admin=1, Maria=2, Joao=3, Ana=4, Carlos=5, Fernanda=6
  // Categorias: 1=Planejamento, 2=Obras, 3=Contratacao Direta, 4=Sustentabilidade, 5=Documentos, 6=Gestao Contratual, 7=Licitacao, 8=Inovacao, 9=Central de Compras, 10=Governanca, 11=Capacitacao

  // Categorias de interesse dos usuarios de teste
  const testUserCategories = [
    [2, [1, 7, 9]],       // Maria: Planejamento, Licitacao, Central de Compras
    [3, [2, 6]],           // Joao: Obras, Gestao Contratual
    [4, [4, 8, 11]],       // Ana: Sustentabilidade, Inovacao, Capacitacao
    [5, [3, 7, 10]],       // Carlos: Contratacao Direta, Licitacao, Governanca
    [6, [1, 5, 6, 9]],     // Fernanda: Planejamento, Documentos, Gestao Contratual, Central de Compras
  ];
  const insertUserCat = db.prepare('INSERT INTO user_categories (user_id, category_id) VALUES (?, ?)');
  for (const [userId, catIds] of testUserCategories) {
    for (const catId of catIds) {
      insertUserCat.run(userId, catId);
    }
  }

  const testTopics = [
    // Discussões
    { title: 'Impacto do PCA na eficiência das contratações', cat: 1, user: 2, type: 'discussion',
      content: 'Gostaria de abrir uma discussão sobre como o Plano de Contratações Anual tem impactado a eficiência dos processos nas suas instituições. Na minha experiência, a implementação do PCA trouxe mais previsibilidade, mas também alguns desafios operacionais. Como tem sido na prática de vocês?' },
    { title: 'Fiscalização de contratos de obras: melhores práticas', cat: 2, user: 3, type: 'discussion',
      content: 'Venho compartilhar algumas práticas que temos adotado na fiscalização de contratos de obras públicas. A medição por etapas com verificação fotográfica tem sido fundamental para garantir a qualidade. Quais ferramentas e metodologias vocês utilizam?' },
    { title: 'Critérios ESG em licitações: como implementar?', cat: 4, user: 4, type: 'discussion',
      content: 'Com a crescente demanda por sustentabilidade nas compras públicas, como vocês têm incorporado critérios ESG nos editais? Temos conseguido bons resultados com exigência de certificações ambientais, mas ainda há resistência de alguns fornecedores.' },
    { title: 'Papel do agente de contratação vs pregoeiro', cat: 10, user: 5, type: 'discussion',
      content: 'Com a Nova Lei de Licitações, o papel do agente de contratação ficou mais amplo que o do antigo pregoeiro. Na prática, como tem sido essa transição nos órgãos de vocês? Quais as principais dificuldades encontradas?' },
    { title: 'Portal PNCP: experiências e dificuldades', cat: 8, user: 6, type: 'discussion',
      content: 'O Portal Nacional de Contratações Públicas já é uma realidade. Gostaria de saber como tem sido a experiência de vocês com a plataforma. Encontraram dificuldades na integração com os sistemas internos? Quais melhorias sugerem?' },

    // Perguntas
    { title: 'Qual o prazo mínimo entre publicação do edital e abertura no pregão eletrônico?', cat: 7, user: 2, type: 'question',
      content: 'Qual o prazo mínimo entre publicação do edital e abertura no pregão eletrônico?' },
    { title: 'Qual o limite de valor atualizado para dispensa por baixo valor?', cat: 3, user: 5, type: 'question',
      content: 'Qual o limite de valor atualizado para dispensa por baixo valor?' },
    { title: 'ETP é obrigatório para todas as contratações?', cat: 1, user: 3, type: 'question',
      content: 'ETP é obrigatório para todas as contratações?' },
    { title: 'Precisa de certificação específica para ser agente de contratação?', cat: 10, user: 6, type: 'question',
      content: 'Precisa de certificação específica para ser agente de contratação?' },
    { title: 'Existem cursos gratuitos sobre a Nova Lei de Licitações?', cat: 11, user: 4, type: 'question',
      content: 'Existem cursos gratuitos sobre a Nova Lei de Licitações?' },

    // Votações
    { title: 'Qual ferramenta digital você mais utiliza nas contratações?', cat: 8, user: 2, type: 'poll',
      content: 'Queremos mapear as ferramentas mais utilizadas pelos profissionais de contratações públicas.',
      pollOptions: ['ComprasNet/ComprasGov', 'Sistemas próprios do órgão', 'Portal PNCP', 'Banco de Preços', 'Planilhas Excel'] },
    { title: 'Qual formato de capacitação você prefere?', cat: 11, user: 6, type: 'poll',
      content: 'Para melhorar nossos programas de treinamento, queremos saber a preferência de formato.',
      pollOptions: ['Cursos online ao vivo', 'Cursos gravados (EAD)', 'Workshops presenciais', 'Mentorias individuais'] },
    { title: 'Maior desafio no planejamento de contratações?', cat: 1, user: 3, type: 'poll',
      content: 'Identifique o maior desafio que você enfrenta na fase de planejamento.',
      pollOptions: ['Pesquisa de preços', 'Elaboração do ETP', 'Definição de requisitos técnicos', 'Análise de riscos', 'Cronograma apertado'] },

    // Vídeos
    { title: 'Aula completa sobre Sistema de Registro de Preços', cat: 9, user: 4, type: 'video',
      content: 'Excelente aula sobre o Sistema de Registro de Preços na Nova Lei de Licitações. Aborda desde os conceitos básicos até as particularidades da adesão à ata.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { title: 'Tutorial: Como elaborar o Orçamento Estimativo', cat: 1, user: 5, type: 'video',
      content: 'Tutorial prático mostrando passo a passo como elaborar o orçamento estimativo para contratações públicas utilizando diferentes fontes de pesquisa de preços.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  ];

  for (const t of testTopics) {
    const topicRes = db.prepare('INSERT INTO topics (title, category_id, user_id, type, video_url) VALUES (?, ?, ?, ?, ?)')
      .run(t.title, t.cat, t.user, t.type, t.videoUrl || '');
    db.prepare('INSERT INTO posts (content, topic_id, user_id) VALUES (?, ?, ?)').run(t.content, topicRes.lastInsertRowid, t.user);

    // Tags aleatorias por topico
    const topicTags = [];
    if (t.cat === 1) topicTags.push('Planejamento');
    if (t.cat === 7 || t.type === 'question') topicTags.push('Licitação');
    if (t.cat === 3) topicTags.push('Dispensa');
    if (t.cat === 4) topicTags.push('Compras Sustentáveis');
    if (t.cat === 10) topicTags.push('Agentes Públicos');
    if (t.cat === 8) topicTags.push('Boas Práticas');
    if (topicTags.length === 0) topicTags.push('Gestão Pública');
    for (const tagName of topicTags) {
      const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
      if (tag) db.prepare('INSERT OR IGNORE INTO topic_tags (topic_id, tag_id) VALUES (?, ?)').run(topicRes.lastInsertRowid, tag.id);
    }

    // Opcoes de votacao
    if (t.type === 'poll' && t.pollOptions) {
      for (const opt of t.pollOptions) {
        db.prepare('INSERT INTO poll_options (topic_id, text) VALUES (?, ?)').run(topicRes.lastInsertRowid, opt);
      }
    }
  }

  // Respostas nos topicos de discussao e perguntas
  const replies = [
    // Tópico 1 (PCA) - id 1 é o admin, tópicos de teste começam no id 2
    { topicId: 2, userId: 3, content: 'Na nossa instituição o PCA reduziu em 30% o tempo médio dos processos. A chave foi o envolvimento das áreas demandantes desde o início do planejamento.' },
    { topicId: 2, userId: 4, content: 'Concordo! Aqui também melhorou bastante. O maior desafio foi convencer as áreas a planejarem com antecedência, mas depois que viram os resultados, a adesão aumentou.' },
    { topicId: 2, userId: 6, content: 'No nosso caso, ainda estamos em fase de implementação. Uma dica que dou é começar com as contratações recorrentes — elas são mais fáceis de planejar e já mostram resultados rápidos.' },

    { topicId: 3, userId: 2, content: 'Ótimas práticas! Aqui usamos um checklist digital para cada etapa da obra. Cada item verificado gera automaticamente um registro com foto, data e responsável.' },
    { topicId: 3, userId: 5, content: 'A medição fotográfica realmente é essencial. Complementaria sugerindo o uso de drones para obras maiores — reduz muito o tempo de verificação em campo.' },

    { topicId: 4, userId: 2, content: 'Temos usado a exigência de logística reversa como critério de sustentabilidade. Funciona bem para contratos de materiais de consumo.' },
    { topicId: 4, userId: 6, content: 'Na nossa experiência, o importante é colocar critérios de sustentabilidade como requisito da contratação, não como critério de julgamento. Assim evita questionamentos.' },

    { topicId: 5, userId: 2, content: 'A transição tem sido desafiadora. O agente de contratação agora precisa dominar todo o processo, não apenas a sessão pública. Capacitação contínua é fundamental.' },
    { topicId: 5, userId: 4, content: 'Concordo. Aqui criamos um programa de mentoria onde agentes mais experientes acompanham os novos nos primeiros processos.' },

    // Respostas nas perguntas
    { topicId: 7, userId: 3, content: 'Para bens comuns o prazo mínimo é de 8 dias úteis. Para serviços comuns de engenharia, 10 dias úteis. Confira o art. 55 da Lei 14.133/21.' },
    { topicId: 8, userId: 6, content: 'O valor atualizado para dispensa por baixo valor é de R$ 59.906,02 para compras e serviços, e R$ 119.812,03 para obras e serviços de engenharia (Decreto 12.343/2024).' },
    { topicId: 9, userId: 2, content: 'O ETP é obrigatório como regra geral. Porém, há casos de dispensa em que pode ser simplificado. Veja o art. 18 da Lei 14.133/21.' },
    { topicId: 10, userId: 3, content: 'Não existe certificação obrigatória por lei, mas o agente deve comprovar formação compatível. Muitos órgãos exigem cursos da ENAP ou equivalentes.' },
    { topicId: 11, userId: 5, content: 'Sim! A ENAP oferece vários cursos gratuitos. Também recomendo os materiais do TCU e a plataforma EVG (Escola Virtual do Governo).' },

    { topicId: 6, userId: 4, content: 'Ótimo mapeamento! Na minha experiência, o Banco de Preços tem sido cada vez mais utilizado, especialmente para pesquisa de preços de referência.' },
    { topicId: 6, userId: 3, content: 'O PNCP ainda precisa evoluir bastante, mas já é uma ferramenta importante para transparência. A integração com outros sistemas ainda é um desafio.' },
  ];

  for (const r of replies) {
    db.prepare('INSERT INTO posts (content, topic_id, user_id) VALUES (?, ?, ?)').run(r.content, r.topicId, r.userId);
  }

  // Likes distribuidos nos topicos
  const topicLikes = [
    [2,3],[2,4],[2,5],[2,6],  // topico 2: 4 likes
    [3,2],[3,4],[3,6],         // topico 3: 3 likes
    [4,2],[4,3],[4,5],         // topico 4: 3 likes
    [5,2],[5,4],               // topico 5: 2 likes
    [6,3],[6,4],[6,5],[6,6],  // topico 6: 4 likes
    [7,4],[7,5],               // topico 7: 2 likes
    [8,2],[8,3],               // topico 8: 2 likes
    [9,5],[9,6],               // topico 9: 2 likes
    [12,2],[12,3],[12,4],[12,5],[12,6], // topico 12 (poll ferramentas): 5 likes
    [14,2],[14,3],             // topico 14 (video SRP): 2 likes
  ];
  for (const [tid, uid] of topicLikes) {
    try { db.prepare('INSERT INTO likes (user_id, topic_id) VALUES (?, ?)').run(uid, tid); } catch {}
  }

  // Votos nas enquetes (topicos 12, 13, 14 = polls - ids dependem da ordem de insercao)
  // Poll 1 (ferramentas digitais) = topico id 12, opcoes comecam no id 1
  // Poll 2 (formato capacitacao) = topico id 13
  // Poll 3 (desafio planejamento) = topico id 14
  // Buscar opcoes dinamicamente
  const poll1Options = db.prepare('SELECT id FROM poll_options WHERE topic_id = 12').all();
  const poll2Options = db.prepare('SELECT id FROM poll_options WHERE topic_id = 13').all();
  const poll3Options = db.prepare('SELECT id FROM poll_options WHERE topic_id = 14').all();

  if (poll1Options.length >= 5) {
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(2, poll1Options[0].id, 12); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(3, poll1Options[3].id, 12); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(4, poll1Options[0].id, 12); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(5, poll1Options[2].id, 12); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(6, poll1Options[0].id, 12); } catch {}
  }
  if (poll2Options.length >= 4) {
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(2, poll2Options[1].id, 13); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(3, poll2Options[0].id, 13); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(5, poll2Options[2].id, 13); } catch {}
  }
  if (poll3Options.length >= 5) {
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(2, poll3Options[0].id, 14); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(4, poll3Options[1].id, 14); } catch {}
    try { db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(6, poll3Options[4].id, 14); } catch {}
  }

  console.log('Dados iniciais criados: 5 usuarios, 15 topicos, respostas, likes e votos');
  } // fim do bloco de dados iniciais
}

// =================== IMPORTAR PLAYLISTS PADRÃO ===================
const defaultPlaylists = [
  'PLU90JTu_sKGNsH1MyhVhF5HX0psESZ4Lc',
  'PLU90JTu_sKGNYClHCtobIPFXP7TehERsL',
  'PLU90JTu_sKGMcBh4EwzWwrFjpP1caBYBz',
];

// Erro de importacao que ja carrega uma mensagem segura para o cliente: a
// resposta bruta do Google pode ecoar a requisicao, e a requisicao carrega a
// credencial. Nada vindo da API externa e repassado sem passar por aqui.
class YoutubeImportError extends Error {
  constructor(mensagemPublica, causa) {
    super(mensagemPublica);
    this.name = 'YoutubeImportError';
    this.causa = causa;
  }
}

// Ponto unico de contato com a YouTube Data API.
// A chave vai no cabecalho X-goog-api-key, nunca na query string: URL entra em
// log de proxy, em stack trace e em mensagem de erro — cabecalho, nao.
async function fetchPlaylistPage(playlistId, pageToken) {
  if (!YOUTUBE_ENABLED) {
    throw new YoutubeImportError('Importacao do YouTube desativada: defina YOUTUBE_API_KEY no ambiente do servidor.');
  }
  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('maxResults', '50');
  url.searchParams.set('playlistId', playlistId);
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  let response;
  try {
    response = await fetch(url, { headers: { 'X-goog-api-key': YOUTUBE_API_KEY } });
  } catch (err) {
    throw new YoutubeImportError('Nao foi possivel contatar a API do YouTube.', err);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) {
    // O detalhe do Google vai para o log do servidor; o cliente recebe o codigo.
    const detalhe = data?.error?.message || `HTTP ${response.status}`;
    throw new YoutubeImportError(
      `A API do YouTube recusou a consulta a playlist ${playlistId} (HTTP ${response.status}).`,
      new Error(detalhe),
    );
  }
  return data;
}

// Percorre todas as paginas de uma playlist e devolve os videos publicos.
async function fetchPlaylistVideos(playlistId) {
  const videos = [];
  let pageToken = '';
  do {
    const data = await fetchPlaylistPage(playlistId, pageToken);
    for (const item of data.items || []) {
      const title = item?.snippet?.title;
      const videoId = item?.snippet?.resourceId?.videoId;
      if (!title || !videoId) continue;
      if (title === 'Private video' || title === 'Deleted video') continue;
      videos.push({ title, url: `https://www.youtube.com/watch?v=${videoId}` });
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return videos;
}

async function importDefaultPlaylists() {
  if (!YOUTUBE_ENABLED) return;
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM resources').get().c;
  if (existingCount > 0) return; // já importado
  const insert = db.prepare('INSERT OR IGNORE INTO resources (title, url, type, source, playlist_id) VALUES (?, ?, ?, ?, ?)');
  let importados = 0;
  for (const playlistId of defaultPlaylists) {
    try {
      for (const video of await fetchPlaylistVideos(playlistId)) {
        const resultado = insert.run(video.title, video.url, 'video', 'youtube', playlistId);
        if (resultado.changes > 0) importados++;
      }
    } catch (err) {
      console.warn(`[playlists] Falha ao importar ${playlistId}: ${err.message}`);
      if (err.causa) console.warn(`[playlists]   detalhe: ${err.causa.message}`);
    }
  }
  // Conta o que esta importacao inseriu — antes o log somava a tabela inteira
  // (incluindo os cursos do seed) e anunciava videos que nunca chegaram.
  console.log(`[playlists] ${importados} video(s) importado(s) de ${defaultPlaylists.length} playlists`);
}

// Num banco vazio a importação dispara chamadas de rede ao YouTube no boot;
// SKIP_PLAYLIST_IMPORT=1 permite pular (testes usam banco vazio por execução).
// Sem YOUTUBE_API_KEY a função já retorna de imediato, mas a variável mantém o
// controle explícito — os testes não dependem de a chave estar ausente.
// Dispara sem bloquear o boot; a falha vira log, nunca rejeição não tratada.
if (process.env.SKIP_PLAYLIST_IMPORT !== '1') {
  importDefaultPlaylists().catch((err) => {
    console.warn('[playlists] Importacao inicial falhou:', err.message);
  });
}

// =================== CURSOS DE CAPACITAÇÃO (seed fixo) ===================
const cursos = [
  // Planejamento de contratação
  { title: 'Gestão de Riscos nas Contratações Públicas', url: 'https://suap.enap.gov.br/vitrine/curso/2070/?area=8', type: 'curso', source: 'enap' },
  { title: 'Planilha de Custos e Formação de Preços', url: 'https://suap.enap.gov.br/vitrine/curso/1522/?area=14', type: 'curso', source: 'enap' },
  { title: 'Elaboração de termos de referência para contratação de bens e serviços na Nova Lei de Licitações', url: 'https://www.escolavirtual.gov.br/curso/941', type: 'curso', source: 'escolavirtual' },
  { title: 'Praticando a Compra Pública - ETP e TR', url: 'https://suap.enap.gov.br/vitrine/search_results/?texto_curso=Praticando%20a%20Compra%20P%C3%BAblica:%20ETP%20e%20TR', type: 'curso', source: 'enap' },
  { title: 'Trilha de Aprendizagem ENAP - Planejamento da Contratação', url: 'https://sites.google.com/enap.gov.br/trilha-de-contratacoes/planejamento-da-contratacao', type: 'curso', source: 'enap' },
  // Seleção do Fornecedor
  { title: 'Nova Lei de Licitações - Modalidade e Seleção de Fornecedores', url: 'https://www.escolavirtual.gov.br/curso/439', type: 'curso', source: 'escolavirtual' },
  { title: 'Licitação por Concorrência, Concurso, Leilão e Diálogo Competitivo', url: 'https://www.escolavirtual.gov.br/curso/925', type: 'curso', source: 'escolavirtual' },
  { title: 'Série "Nova Lei de Licitações: Um ano para a construção do Futuro"', url: 'https://www.youtube.com/watch?v=Gf2IzXfPgdk', type: 'video', source: 'youtube' },
  { title: 'Trilha de Aprendizagem ENAP - Seleção do Fornecedor', url: 'https://sites.google.com/enap.gov.br/trilha-de-contratacoes/selecao-do-fornecedor', type: 'curso', source: 'enap' },
  // Gestão de Contrato
  { title: 'Gestão e Fiscalização de Contratos Administrativos', url: 'https://www.escolavirtual.gov.br/curso/939', type: 'curso', source: 'escolavirtual' },
  { title: 'Nova Lei de Licitações - Gestão Contratual', url: 'https://www.escolavirtual.gov.br/curso/440', type: 'curso', source: 'escolavirtual' },
  { title: 'Praticando a Gestão e Fiscalização de Contratos Administrativos', url: 'https://suap.enap.gov.br/vitrine/curso/2079/?area=13', type: 'curso', source: 'enap' },
  { title: 'Nova Lei de Licitações - Sanções ao Fornecedor', url: 'https://www.escolavirtual.gov.br/curso/441', type: 'curso', source: 'escolavirtual' },
  { title: 'Trilha de Aprendizagem ENAP - Gestão do Contrato', url: 'https://sites.google.com/enap.gov.br/trilha-de-contratacoes/gestao-do-contrato', type: 'curso', source: 'enap' },
];

const insertCurso = db.prepare('INSERT OR IGNORE INTO resources (title, url, type, source) VALUES (?, ?, ?, ?)');
for (const c of cursos) {
  insertCurso.run(c.title, c.url, c.type, c.source);
}
console.log(`[cursos] ${cursos.length} cursos de capacitação adicionados`);

// =================== CORRIGIR ACENTOS NAS CATEGORIAS (banco existente) ===================
const catFixes = [
  [1, 'Planejamento', 'Planejamento de contratações públicas'],
  [2, 'Obras Públicas', 'Contratação de obras e serviços de engenharia'],
  [3, 'Contratação Direta', 'Dispensa e inexigibilidade de licitação'],
  [4, 'Sustentabilidade', 'Critérios de sustentabilidade nas compras'],
  [5, 'Documentos', 'Modelos de editais e termos de referência'],
  [6, 'Gestão Contratual', 'Fiscalização e gestão de contratos'],
  [7, 'Licitação', 'Pregão eletrônico e processos licitatórios'],
  [8, 'Inovação', 'Ferramentas digitais e modernização'],
  [9, 'Central de Compras', 'Centralização e registro de preços'],
  [10, 'Governança', 'Boas práticas e agentes públicos'],
  [11, 'Capacitação', 'Formação e treinamento de agentes'],
];
for (const [id, name, desc] of catFixes) {
  try { db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, desc, id); } catch {}
}

// =================== CORRIGIR ACENTOS NAS TAGS (banco existente) ===================
const tagFixes = [
  ['Gestao Publica', 'Gestão Pública'],
  ['Compras Sustentaveis', 'Compras Sustentáveis'],
  ['Pregao', 'Pregão'],
  ['Licitacao', 'Licitação'],
  ['Boas Praticas', 'Boas Práticas'],
  ['Agentes Publicos', 'Agentes Públicos'],
];
for (const [oldName, newName] of tagFixes) {
  try { db.prepare('UPDATE tags SET name = ? WHERE name = ?').run(newName, oldName); } catch {}
}

// =================== MIDDLEWARES ===================
// Origens permitidas: configuráveis por ambiente (padrão LILP). Sem a variável,
// vale a lista original — o comportamento fora do container não muda.
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [
      'https://recpsp.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
// Origem recusada e decisao de politica, nao defeito do servidor: sinaliza com
// uma marca no erro para o handler global devolver 403 em vez de 500.
class CorsBloqueadoError extends Error {
  constructor(origin) {
    super(`Origem nao permitida: ${origin}`);
    this.name = 'CorsBloqueadoError';
    this.status = 403;
  }
}

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sem origin (mobile apps, curl, server-side)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new CorsBloqueadoError(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const authUserByIdStmt = db.prepare('SELECT id, username, role, banned FROM users WHERE id = ?');

// =================== SECURITY HEADERS ===================
// Content-Security-Policy estrita (padrao LILP). Estava desativada inteira
// "para permitir inline scripts do React": o build do CRA embute o runtime
// chunk no index.html, e isso exigiria 'unsafe-inline' em script-src — o que
// anula a protecao. A saida e desligar esse inline no build
// (INLINE_RUNTIME_CHUNK=false no Dockerfile), assim script-src 'self' basta.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      // Sem 'unsafe-inline' e sem 'unsafe-eval': todo script vem de arquivo.
      'script-src': ["'self'"],
      // React escreve o atributo style dos componentes; Tailwind entra por CSS
      // externo. O atributo inline exige 'unsafe-inline' aqui — risco baixo,
      // porque CSS nao executa codigo e script-src continua fechado.
      // fonts.googleapis.com serve a folha da Montserrat, importada em
      // src/index.css; os arquivos .woff2 vem de fonts.gstatic.com.
      // Pendencia registrada: hospedar a fonte no proprio servidor evita que
      // cada visitante do forum faca requisicao ao Google.
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      'connect-src': ["'self'"],
      // Videos de capacitacao sao embutidos destes players.
      'frame-src': ['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
    },
  },
  crossOriginEmbedderPolicy: false, // permitir embeds do YouTube
}));

// =================== RATE LIMITING ===================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 tentativas de login/registro por IP
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// =================== HEALTH CHECK ===================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token necessario' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const authUser = authUserByIdStmt.get(decoded.id);
    if (!authUser) return res.status(401).json({ error: 'Usuario nao encontrado' });
    if (authUser.banned) return res.status(403).json({ error: 'Sua conta foi banida' });
    req.user = {
      id: authUser.id,
      username: authUser.username,
      role: authUser.role,
      banned: !!authUser.banned,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const authUser = authUserByIdStmt.get(decoded.id);
      // Conta banida e rebaixada a visitante, nao promovida. Antes o papel era
      // copiado sem checar `banned`, entao um moderador banido continuava
      // enxergando topicos pendentes e rejeitados nas tres rotas que usam
      // optionalAuth. Rebaixar (em vez de 403 como faz `auth`) mantem a
      // navegacao publica do forum funcionando.
      if (authUser && !authUser.banned) {
        req.user = {
          id: authUser.id,
          username: authUser.username,
          role: authUser.role,
          banned: false,
        };
      }
    } catch {}
  }
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// =================== AUTH ===================

app.post('/api/auth/register', authLimiter, (req, res) => {
  const { username, email, password, organization, location, category_ids, accept_terms } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (typeof username !== 'string' || username.trim().length > MAX_USERNAME) {
    return res.status(400).json({ error: `Nome de usuário deve ter no máximo ${MAX_USERNAME} caracteres` });
  }
  if (typeof email !== 'string' || email.length > MAX_EMAIL || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Senha deve ter pelo menos ${MIN_PASSWORD} caracteres` });
  }
  const erroCampos = validarCamposLivres({ location, organization });
  if (erroCampos) return res.status(400).json({ error: erroCampos });
  if (!accept_terms) return res.status(400).json({ error: 'É necessário aceitar os Termos de Uso para criar uma conta' });
  if (identidadeReservada(email, username)) {
    return res.status(400).json({ error: 'Nome de usuario ou email ja em uso' });
  }
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(`INSERT INTO users (username, email, password, organization, location, terms_accepted_at)
                               VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(username, email, hashed, organization || '', location || '');
    const userId = result.lastInsertRowid;

    // Salvar categorias de interesse se fornecidas
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      const validCatIds = db.prepare('SELECT id FROM categories').all().map(c => c.id);
      const insertCat = db.prepare('INSERT INTO user_categories (user_id, category_id) VALUES (?, ?)');
      for (const catId of category_ids) {
        if (Number.isInteger(catId) && validCatIds.includes(catId)) insertCat.run(userId, catId);
      }
    }

    const user = db.prepare('SELECT id, username, email, role, forum_notice_accepted_at FROM users WHERE id = ?').get(userId);
    user.forum_notice_accepted = !!user.forum_notice_accepted_at;
    delete user.forum_notice_accepted_at;
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Nome de usuario ou email ja em uso' });
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  // Guarda de tipo ANTES de tocar o banco. Sem ela o login virava oraculo de
  // enumeracao: e-mail inexistente devolvia 401 (mensagem neutra), mas e-mail
  // existente com senha nao-string fazia o bcryptjs lancar "Illegal arguments"
  // e a resposta virava 500 — a diferenca de status entregava quais contas
  // existem, exatamente o que a mensagem neutra tenta esconder. E-mail
  // nao-string tambem fazia o better-sqlite3 lancar.
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(401).json({ error: 'Email ou senha invalidos' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Email ou senha invalidos' });
  if (user.banned) return res.status(403).json({ error: 'Sua conta foi banida' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      forum_notice_accepted: !!user.forum_notice_accepted_at,
    },
  });
});

// =================== PERFIL ===================

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, role, location, organization, bio, forum_notice_accepted_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  user.forum_notice_accepted = !!user.forum_notice_accepted_at;
  delete user.forum_notice_accepted_at;
  user.categories = db.prepare(`
    SELECT c.id, c.name, c.color FROM user_categories uc
    JOIN categories c ON uc.category_id = c.id
    WHERE uc.user_id = ?
  `).all(req.user.id);
  user.specialties = db.prepare(`
    SELECT c.id, c.name, c.color, us.created_at FROM user_specialties us
    JOIN categories c ON us.category_id = c.id
    WHERE us.user_id = ? ORDER BY c.name
  `).all(req.user.id);
  res.json(user);
});

app.post('/api/auth/forum-notice/accept', auth, (req, res) => {
  db.prepare(`
    UPDATE users
    SET forum_notice_accepted_at = COALESCE(forum_notice_accepted_at, CURRENT_TIMESTAMP)
    WHERE id = ?
  `).run(req.user.id);
  const accepted = db.prepare('SELECT forum_notice_accepted_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, accepted_at: accepted.forum_notice_accepted_at });
});

app.put('/api/auth/profile', auth, (req, res) => {
  const { username, email, password, location, organization, bio } = req.body;

  // As mesmas regras do cadastro. Antes este endpoint nao validava nada: dava
  // para gravar e-mail sem formato valido, e senha com menos de 6 caracteres
  // era descartada em silencio — a resposta vinha 200 e a senha nao mudava.
  if (username !== undefined) {
    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Nome de usuário não pode ficar vazio' });
    }
    if (username.trim().length > MAX_USERNAME) {
      return res.status(400).json({ error: `Nome de usuário deve ter no máximo ${MAX_USERNAME} caracteres` });
    }
  }
  if (email !== undefined && (typeof email !== 'string' || email.length > MAX_EMAIL || !EMAIL_REGEX.test(email))) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  // Mesma reserva do cadastro: sem isto, editar o perfil era o caminho aberto
  // para assumir a identidade da conta sentinela.
  if (identidadeReservada(email, username)) {
    return res.status(400).json({ error: 'Nome ou email ja em uso' });
  }
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Senha deve ter pelo menos ${MIN_PASSWORD} caracteres` });
    }
  }
  const erroCampos = validarCamposLivres({ location, organization, bio });
  if (erroCampos) return res.status(400).json({ error: erroCampos });

  try {
    // Uma transacao: ou o perfil inteiro muda, ou nada muda. Antes cada campo
    // era um UPDATE solto — se o e-mail colidisse, o nome ja tinha sido gravado.
    const salvar = db.transaction(() => {
      if (username !== undefined) db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username.trim(), req.user.id);
      if (email !== undefined) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(String(email).trim(), req.user.id);
      if (password !== undefined) {
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.user.id);
      }
      if (location !== undefined) db.prepare('UPDATE users SET location = ? WHERE id = ?').run(location, req.user.id);
      if (organization !== undefined) db.prepare('UPDATE users SET organization = ? WHERE id = ?').run(organization, req.user.id);
      if (bio !== undefined) db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, req.user.id);
    });
    salvar();

    const user = db.prepare('SELECT id, username, email, role, location, organization, bio FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Nome ou email ja em uso' });
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Categorias do usuario (interesses)
app.get('/api/auth/categories', auth, (req, res) => {
  const cats = db.prepare(`
    SELECT c.id, c.name, c.color FROM user_categories uc
    JOIN categories c ON uc.category_id = c.id
    WHERE uc.user_id = ?
  `).all(req.user.id);
  res.json(cats);
});

app.put('/api/auth/categories', auth, (req, res) => {
  const { category_ids } = req.body;
  if (!Array.isArray(category_ids)) return res.status(400).json({ error: 'category_ids deve ser um array' });

  const validCatIds = db.prepare('SELECT id FROM categories').all().map(c => c.id);
  db.prepare('DELETE FROM user_categories WHERE user_id = ?').run(req.user.id);
  const insert = db.prepare('INSERT INTO user_categories (user_id, category_id) VALUES (?, ?)');
  for (const catId of category_ids) {
    if (Number.isInteger(catId) && validCatIds.includes(catId)) insert.run(req.user.id, catId);
  }

  const cats = db.prepare(`
    SELECT c.id, c.name, c.color FROM user_categories uc
    JOIN categories c ON uc.category_id = c.id
    WHERE uc.user_id = ?
  `).all(req.user.id);
  res.json(cats);
});

// Jornada individual de capacitacao
const CAPACITACAO_COURSE_IDS = new Set([
  'lei-14133-2021',
  'plano-contratacoes-anual',
  'estudo-tecnico-preliminar',
  'termo-referencia',
  'pesquisa-precos',
  'gestao-contratual',
  'sancoes-administrativas',
  'compras-sustentaveis',
  'ia-contratacoes',
  'linguagem-simples',
]);

function isValidCourseId(courseId) {
  return typeof courseId === 'string' && CAPACITACAO_COURSE_IDS.has(courseId);
}

function getCourseProgress(userId, courseId) {
  const progress = db.prepare(`
    SELECT course_id, started_at, completed_at, updated_at
    FROM user_course_progress
    WHERE user_id = ? AND course_id = ?
  `).get(userId, courseId);
  if (progress) progress.completed = !!progress.completed_at;
  return progress;
}

app.get('/api/auth/course-progress', auth, (req, res) => {
  const progress = db.prepare(`
    SELECT course_id, started_at, completed_at, updated_at
    FROM user_course_progress
    WHERE user_id = ?
    ORDER BY updated_at DESC, started_at DESC
  `).all(req.user.id);
  progress.forEach(item => {
    item.completed = !!item.completed_at;
  });
  res.json(progress);
});

app.post('/api/auth/course-progress/:courseId', auth, (req, res) => {
  const { courseId } = req.params;
  if (!isValidCourseId(courseId)) return res.status(400).json({ error: 'Curso inválido' });

  db.prepare(`
    INSERT INTO user_course_progress (user_id, course_id)
    VALUES (?, ?)
    ON CONFLICT(user_id, course_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, courseId);

  res.status(201).json(getCourseProgress(req.user.id, courseId));
});

app.put('/api/auth/course-progress/:courseId', auth, (req, res) => {
  const { courseId } = req.params;
  const { completed } = req.body;
  if (!isValidCourseId(courseId)) return res.status(400).json({ error: 'Curso inválido' });
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'O campo completed deve ser verdadeiro ou falso' });
  }

  const updateProgress = db.transaction(() => {
    db.prepare(`
      INSERT OR IGNORE INTO user_course_progress (user_id, course_id)
      VALUES (?, ?)
    `).run(req.user.id, courseId);
    db.prepare(`
      UPDATE user_course_progress
      SET completed_at = CASE
        WHEN ? = 1 THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
        ELSE NULL
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND course_id = ?
    `).run(completed ? 1 : 0, req.user.id, courseId);
  });
  updateProgress();

  res.json(getCourseProgress(req.user.id, courseId));
});

app.delete('/api/auth/course-progress/:courseId', auth, (req, res) => {
  const { courseId } = req.params;
  if (!isValidCourseId(courseId)) return res.status(400).json({ error: 'Curso inválido' });

  const result = db.prepare(`
    DELETE FROM user_course_progress WHERE user_id = ? AND course_id = ?
  `).run(req.user.id, courseId);
  if (result.changes === 0) return res.status(404).json({ error: 'Curso não encontrado na jornada' });

  res.json({ ok: true });
});

// =================== PERFIL PUBLICO ===================

app.get('/api/users/:id', (req, res) => {
  const u = db.prepare('SELECT id, username, role, location, organization, bio, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario nao encontrado' });
  const postCount = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(req.params.id);
  const topicCount = db.prepare('SELECT COUNT(*) as c FROM topics WHERE user_id = ?').get(req.params.id);
  u.post_count = postCount.c;
  u.topic_count = topicCount.c;

  // Categorias de interesse do usuario
  u.categories = db.prepare(`
    SELECT c.id, c.name, c.color FROM user_categories uc
    JOIN categories c ON uc.category_id = c.id
    WHERE uc.user_id = ?
  `).all(req.params.id);

  // Especializacoes verificadas
  u.specialties = db.prepare(`
    SELECT c.id, c.name, c.color FROM user_specialties us
    JOIN categories c ON us.category_id = c.id
    WHERE us.user_id = ? ORDER BY c.name
  `).all(req.params.id);

  res.json(u);
});

// =================== MENSAGENS ===================

app.post('/api/messages', auth, (req, res) => {
  const { receiver_id, content } = req.body;
  const receiverId = Number(receiver_id);
  if (!Number.isInteger(receiverId) || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Destinatario e conteudo obrigatorios' });
  }
  if (content.length > MAX_MESSAGE) return res.status(400).json({ error: `Mensagem deve ter no máximo ${MAX_MESSAGE} caracteres` });
  if (receiverId === req.user.id) return res.status(400).json({ error: 'Nao e possivel enviar mensagem para si mesmo' });
  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(receiverId);
  if (!receiver) return res.status(404).json({ error: 'Destinatario nao encontrado' });

  const result = db.prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)').run(req.user.id, receiverId, content.trim());

  // Criar notificacao para o destinatario
  db.prepare('INSERT INTO notifications (user_id, type, content, reference_id) VALUES (?, ?, ?, ?)')
    .run(receiverId, 'message', `Nova mensagem de ${req.user.username}`, req.user.id);

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.json(msg);
});

app.get('/api/messages', auth, (req, res) => {
  // Buscar todas as conversas agrupadas pelo outro usuario
  const conversations = db.prepare(`
    SELECT
      CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
      MAX(m.id) as last_message_id
    FROM messages m
    WHERE sender_id = ? OR receiver_id = ?
    GROUP BY other_user_id
    ORDER BY last_message_id DESC
  `).all(req.user.id, req.user.id, req.user.id);

  const result = conversations.map(conv => {
    const otherUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(conv.other_user_id);
    const lastMsg = db.prepare('SELECT content, created_at FROM messages WHERE id = ?').get(conv.last_message_id);
    const unreadCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE sender_id = ? AND receiver_id = ? AND read = 0')
      .get(conv.other_user_id, req.user.id);
    return {
      other_user_id: conv.other_user_id,
      other_username: otherUser?.username || 'Deletado',
      last_message: lastMsg?.content || '',
      last_message_date: lastMsg?.created_at || '',
      unread_count: unreadCount.c,
    };
  });

  res.json(result);
});

app.get('/api/messages/:userId', auth, (req, res) => {
  const otherId = parseInt(req.params.userId);
  const otherUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(otherId);
  if (!otherUser) return res.status(404).json({ error: 'Usuario nao encontrado' });

  // Marcar como lidas as mensagens recebidas do outro usuario
  db.prepare('UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ?').run(otherId, req.user.id);
  // Limpar notificacoes de mensagem desse usuario
  db.prepare('DELETE FROM notifications WHERE user_id = ? AND type = ? AND reference_id = ?').run(req.user.id, 'message', otherId);

  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(req.user.id, otherId, otherId, req.user.id);

  res.json({ messages, other_user: otherUser });
});

// =================== NOTIFICACOES ===================

app.get('/api/notifications', auth, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  const unreadCount = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
  res.json({ notifications, unread_count: unreadCount.c });
});

app.put('/api/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// =================== CATEGORIAS ===================

app.get('/api/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM topics WHERE category_id = c.id) as topic_count,
      (SELECT COUNT(*) FROM posts p JOIN topics t ON p.topic_id = t.id WHERE t.category_id = c.id) as post_count
    FROM categories c ORDER BY c.id
  `).all();
  res.json(categories);
});

app.post('/api/categories', auth, adminOnly, (req, res) => {
  const { name, description, color } = req.body;
  const normalizedName = capitalizeInitial(name);
  if (!normalizedName) return res.status(400).json({ error: 'Nome obrigatorio' });
  const result = db.prepare('INSERT INTO categories (name, description, color) VALUES (?, ?, ?)')
    .run(normalizedName, description || '', color || '#6366f1');
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/categories/:id', auth, adminOnly, (req, res) => {
  const { name, description, color } = req.body;
  const normalizedName = name === undefined || name === null ? null : capitalizeInitial(name);
  if (name !== undefined && name !== null && !normalizedName) {
    return res.status(400).json({ error: 'Nome obrigatorio' });
  }
  db.prepare('UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color) WHERE id = ?')
    .run(normalizedName, description, color, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

app.delete('/api/categories/:id', auth, adminOnly, (req, res) => {
  const categoria = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(req.params.id);
  if (!categoria) return res.status(404).json({ error: 'Tema nao encontrado' });

  // Apagar tema em uso violava a FK de topics e virava "Erro interno do
  // servidor" — o admin nao tinha como saber que o problema era esse.
  // Recusar e explicar e melhor que apagar discussao junto com o tema.
  const topicos = db.prepare('SELECT COUNT(*) as c FROM topics WHERE category_id = ?').get(req.params.id).c;
  if (topicos > 0) {
    return res.status(409).json({
      error: `Não é possível excluir "${categoria.name}": há ${topicos} tópico(s) neste tema. Mova ou exclua os tópicos primeiro.`,
    });
  }

  try {
    db.transaction(() => {
      // Vinculos sem conteudo proprio saem junto: interesse declarado e
      // designacao de especialista existem apenas em funcao do tema.
      db.prepare('DELETE FROM user_categories WHERE category_id = ?').run(req.params.id);
      db.prepare('DELETE FROM user_specialties WHERE category_id = ?').run(req.params.id);
      db.prepare('DELETE FROM specialist_requests WHERE category_id = ?').run(req.params.id);
      db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    })();
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir tema:', err);
    res.status(500).json({ error: 'Erro ao excluir tema' });
  }
});

// =================== TAGS ===================

app.get('/api/tags', (req, res) => {
  res.json(db.prepare('SELECT * FROM tags ORDER BY name').all());
});

app.post('/api/tags', auth, adminOnly, (req, res) => {
  const { name } = req.body;
  const normalizedName = capitalizeInitial(name);
  if (!normalizedName) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(normalizedName);
    res.json({ id: result.lastInsertRowid, name: normalizedName });
  } catch {
    res.status(400).json({ error: 'Tag ja existe' });
  }
});

// =================== TOPICOS ===================

// Lista TODOS os topicos (home page estilo Discourse)
app.get('/api/topics', optionalAuth, (req, res) => {
  const { sort, category_id, page, per_page } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const ALLOWED_PER_PAGE = [10, 20, 50];
  const perPage = ALLOWED_PER_PAGE.includes(parseInt(per_page)) ? parseInt(per_page) : 20;

  let orderBy = 'ORDER BY t.pinned DESC, last_activity DESC';
  if (sort === 'new') orderBy = 'ORDER BY t.pinned DESC, t.created_at DESC';
  if (sort === 'top') orderBy = 'ORDER BY like_count DESC';
  if (sort === 'replies') orderBy = 'ORDER BY reply_count DESC';
  if (sort === 'views') orderBy = 'ORDER BY t.views DESC';

  // Filtro de moderacao: admin/mod veem todos, usuario comum ve aprovados + seus proprios pendentes
  const conditions = [];
  const params = [];

  if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
    // Admin/mod veem todos os topicos (exceto rejeitados)
    conditions.push("t.status != 'rejected'");
  } else if (req.user) {
    // Usuario logado: ve aprovados + seus proprios pendentes
    conditions.push("(t.status = 'approved' OR (t.status = 'pending' AND t.user_id = ?))");
    params.push(req.user.id);
  } else {
    // Visitante: ve apenas aprovados e nao travados
    conditions.push("t.status = 'approved'");
    conditions.push("t.locked = 0");
  }

  if (category_id) {
    conditions.push('t.category_id = ?');
    params.push(category_id);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Contar total para paginação
  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM topics t
    JOIN users u ON t.user_id = u.id
    JOIN categories c ON t.category_id = c.id
    ${where}
  `).get(...params);
  const total = countResult.total;
  const totalPages = Math.ceil(total / perPage);
  const offset = (pageNum - 1) * perPage;

  const topics = db.prepare(`
    SELECT t.*, u.username,
      c.name as category_name, c.color as category_color,
      MAX(0, (SELECT COUNT(*) FROM posts WHERE topic_id = t.id) - 1) as reply_count,
      (SELECT COUNT(*) FROM likes WHERE topic_id = t.id) as like_count,
      COALESCE((SELECT MAX(p.created_at) FROM posts p WHERE p.topic_id = t.id), t.created_at) as last_activity,
      (SELECT GROUP_CONCAT(tg.name) FROM topic_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.topic_id = t.id) as tag_names
    FROM topics t
    JOIN users u ON t.user_id = u.id
    JOIN categories c ON t.category_id = c.id
    ${where}
    ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  for (const topic of topics) {
    topic.tags = topic.tag_names ? topic.tag_names.split(',') : [];
    delete topic.tag_names;
  }

  res.json({ topics, page: pageNum, totalPages, total, perPage });
});

app.get('/api/categories/:id/topics', optionalAuth, (req, res) => {
  const { sort } = req.query;

  let orderBy = 'ORDER BY t.pinned DESC, last_activity DESC';
  if (sort === 'new') orderBy = 'ORDER BY t.pinned DESC, t.created_at DESC';
  if (sort === 'top') orderBy = 'ORDER BY like_count DESC';
  if (sort === 'replies') orderBy = 'ORDER BY reply_count DESC';
  if (sort === 'views') orderBy = 'ORDER BY t.views DESC';

  // Filtro de moderacao igual ao /api/topics
  const conditions = ['t.category_id = ?'];
  const params = [req.params.id];

  if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
    conditions.push("t.status != 'rejected'");
  } else if (req.user) {
    conditions.push("(t.status = 'approved' OR (t.status = 'pending' AND t.user_id = ?))");
    params.push(req.user.id);
  } else {
    // Visitante: ve apenas aprovados e nao travados
    conditions.push("t.status = 'approved'");
    conditions.push("t.locked = 0");
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const topics = db.prepare(`
    SELECT t.*, u.username,
      c.name as category_name, c.color as category_color,
      MAX(0, (SELECT COUNT(*) FROM posts WHERE topic_id = t.id) - 1) as reply_count,
      (SELECT COUNT(*) FROM likes WHERE topic_id = t.id) as like_count,
      COALESCE((SELECT MAX(p.created_at) FROM posts p WHERE p.topic_id = t.id), t.created_at) as last_activity,
      (SELECT GROUP_CONCAT(tg.name) FROM topic_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.topic_id = t.id) as tag_names
    FROM topics t
    JOIN users u ON t.user_id = u.id
    JOIN categories c ON t.category_id = c.id
    ${where}
    ${orderBy}
  `).all(...params);

  for (const topic of topics) {
    topic.tags = topic.tag_names ? topic.tag_names.split(',') : [];
    delete topic.tag_names;
  }
  res.json(topics);
});

app.post('/api/topics', auth, (req, res) => {
  const { title, category_id, content, tags, type, poll_options, image_url, video_url } = req.body;
  const normalizedTitle = capitalizeInitial(title);
  if (!normalizedTitle || !category_id || !content) return res.status(400).json({ error: 'Titulo, categoria e conteudo obrigatorios' });
  // typeof antes de .length: um content nao-string fazia a comparacao virar
  // NaN > N (sempre falso) e o limite era ignorado sem ninguem perceber.
  if (typeof content !== 'string') return res.status(400).json({ error: 'Conteúdo deve ser texto' });
  if (normalizedTitle.length > MAX_TITLE) return res.status(400).json({ error: `Título deve ter no máximo ${MAX_TITLE} caracteres` });
  if (content.length > MAX_CONTENT) return res.status(400).json({ error: 'Conteúdo muito longo' });

  const user = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.user.id);
  if (user?.banned) return res.status(403).json({ error: 'Sua conta foi banida' });

  // Validacoes por tipo
  if (type === 'question' && content.length > MAX_QUESTION) return res.status(400).json({ error: `Pergunta deve ter no maximo ${MAX_QUESTION} caracteres` });
  if (type === 'poll' && (!poll_options || !Array.isArray(poll_options) || poll_options.filter(o => o.trim()).length < 2)) {
    return res.status(400).json({ error: 'Votacao precisa de pelo menos 2 alternativas' });
  }

  // O front renderiza image_url direto num <img src> e video_url num iframe.
  // O esquema precisa ser validado aqui: o servidor gravava qualquer string, e
  // "data:" ou "javascript:" chegavam ao DOM do navegador de quem lesse.
  for (const [campo, valor] of [['Imagem', image_url], ['Vídeo', video_url]]) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (typeof valor !== 'string') return res.status(400).json({ error: `${campo}: URL inválida` });
    if (valor.trim() && !/^https?:\/\//i.test(valor.trim())) {
      return res.status(400).json({ error: `${campo}: use um endereço http:// ou https://` });
    }
  }

  // Determinar status: topicos com imagem ou video de usuarios comuns ficam pendentes
  const hasMedia = (image_url && image_url.trim()) || (video_url && video_url.trim());
  const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';
  const topicStatus = (hasMedia && !isAdminOrMod) ? 'pending' : 'approved';

  const topicResult = db.prepare('INSERT INTO topics (title, category_id, user_id, type, image_url, video_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(normalizedTitle, category_id, req.user.id, type || 'discussion', image_url || '', video_url || '', topicStatus);
  db.prepare('INSERT INTO posts (content, topic_id, user_id) VALUES (?, ?, ?)').run(content, topicResult.lastInsertRowid, req.user.id);

  // Criar opcoes de votacao
  if (type === 'poll' && poll_options && Array.isArray(poll_options)) {
    for (const optionText of poll_options) {
      if (optionText.trim()) {
        db.prepare('INSERT INTO poll_options (topic_id, text) VALUES (?, ?)').run(topicResult.lastInsertRowid, optionText.trim());
      }
    }
  }

  if (tags && Array.isArray(tags)) {
    for (const tagName of tags) {
      const normalizedTagName = capitalizeInitial(tagName);
      if (!normalizedTagName) continue;
      let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(normalizedTagName);
      if (!tag) {
        const r = db.prepare('INSERT INTO tags (name) VALUES (?)').run(normalizedTagName);
        tag = { id: r.lastInsertRowid };
      }
      db.prepare('INSERT OR IGNORE INTO topic_tags (topic_id, tag_id) VALUES (?, ?)').run(topicResult.lastInsertRowid, tag.id);
    }
  }

  // Se topico ficou pendente, notificar todos admin e moderadores
  if (topicStatus === 'pending') {
    const adminsAndMods = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'moderator') AND id != ?").all(req.user.id);
    const authorName = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id)?.username || 'Usuário';
    for (const mod of adminsAndMods) {
      db.prepare('INSERT INTO notifications (user_id, type, content, reference_id) VALUES (?, ?, ?, ?)')
        .run(mod.id, 'moderation', `Novo tópico aguardando aprovação: "${title}" por ${authorName}`, topicResult.lastInsertRowid);
    }
  }

  const createdTopic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicResult.lastInsertRowid);
  res.json(createdTopic);
});

app.put('/api/topics/:id/pin', auth, adminOnly, (req, res) => {
  const topic = db.prepare('SELECT pinned FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });
  db.prepare('UPDATE topics SET pinned = ? WHERE id = ?').run(topic.pinned ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

app.put('/api/topics/:id/lock', auth, adminOnly, (req, res) => {
  const topic = db.prepare('SELECT locked FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });
  db.prepare('UPDATE topics SET locked = ? WHERE id = ?').run(topic.locked ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/topics/:id', auth, (req, res) => {
  const topic = db.prepare('SELECT user_id FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });
  if (topic.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' });
  // FKs sem ON DELETE + foreign_keys = ON: as curtidas e descurtidas das
  // respostas precisam sair antes dos posts, e tudo dentro de transação para a
  // exclusão ser atômica. A ordem vive em apagarTopicoEmCascata, compartilhada
  // com a remoção de conta — ver docs/ARCHITECTURE.md, seção 7.
  try {
    db.transaction(apagarTopicoEmCascata)(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao apagar topico:', err);
    res.status(500).json({ error: 'Erro ao apagar topico' });
  }
});

// =================== VOTACAO ===================

app.post('/api/topics/:id/vote', auth, (req, res) => {
  const { option_id } = req.body;
  const topicId = parseInt(req.params.id);
  if (!Number.isInteger(topicId)) return res.status(400).json({ error: 'Topico invalido' });
  if (req.user.banned) return res.status(403).json({ error: 'Usuario banido' });

  const topic = db.prepare('SELECT type, locked, status FROM topics WHERE id = ?').get(topicId);
  if (!topic || topic.type !== 'poll') return res.status(400).json({ error: 'Este topico nao e uma votacao' });
  if (topic.locked) return res.status(403).json({ error: 'Este tópico está bloqueado' });
  if (topic.status !== 'approved') return res.status(403).json({ error: 'Este tópico não está aprovado' });

  const option = db.prepare('SELECT id FROM poll_options WHERE id = ? AND topic_id = ?').get(option_id, topicId);
  if (!option) return res.status(400).json({ error: 'Opcao invalida' });

  try {
    db.prepare('INSERT INTO poll_votes (user_id, option_id, topic_id) VALUES (?, ?, ?)').run(req.user.id, option_id, topicId);
  } catch {
    db.prepare('UPDATE poll_votes SET option_id = ? WHERE user_id = ? AND topic_id = ?').run(option_id, req.user.id, topicId);
  }

  // Retornar dados atualizados
  const options = db.prepare(`
    SELECT po.id, po.text,
      (SELECT COUNT(*) FROM poll_votes WHERE option_id = po.id) as vote_count
    FROM poll_options po WHERE po.topic_id = ?
  `).all(topicId);
  const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0);

  res.json({ ok: true, poll_options: options, total_votes: totalVotes, user_vote: option_id });
});

// =================== VIEWS ===================

// Rota publica, sem autenticacao e sem rate limit — o que faz do cache um
// alvo. Duas guardas que faltavam:
//
// 1. O `:id` nao era validado. Como a chave do Map e `ip:id`, qualquer string
//    de URL virava uma chave nova, e o espaco de chaves era ilimitado.
// 2. A "limpeza a cada 1000 registros" nao impunha teto nenhum: ela so remove
//    entradas com mais de 30 min, entao sob trafego continuo nada envelhecia e
//    o Map crescia sem limite. Pior, passados os 1000 registros a varredura
//    percorria o Map INTEIRO a cada requisicao — custo quadratico, com o event
//    loop do unico processo que serve API e SPA preso varrendo.
//
// Agora o id e inteiro (espaco de chaves = topicos existentes) e o teto e
// duro, com descarte O(1) da entrada mais antiga (Map preserva ordem de
// insercao). Nenhuma varredura no caminho da requisicao.
const JANELA_VIEW_MS = 30 * 60 * 1000;
const MAX_VIEWS_EM_CACHE = 20000;
const viewedTopics = new Map(); // Map<"ip:topicId", timestamp>

app.post('/api/topics/:id/view', (req, res) => {
  const topicId = parseInt(req.params.id, 10);
  if (!Number.isInteger(topicId)) return res.status(400).json({ error: 'Topico invalido' });

  const key = `${req.ip}:${topicId}`;
  const now = Date.now();
  const lastView = viewedTopics.get(key);
  // Só conta view a cada 30 minutos por IP/tópico
  if (!lastView || (now - lastView) > JANELA_VIEW_MS) {
    db.prepare('UPDATE topics SET views = views + 1 WHERE id = ?').run(topicId);
    // delete antes do set: reinsere no fim da ordem de insercao, para a
    // entrada recem-usada nao ser a proxima descartada.
    viewedTopics.delete(key);
    viewedTopics.set(key, now);
    while (viewedTopics.size > MAX_VIEWS_EM_CACHE) {
      viewedTopics.delete(viewedTopics.keys().next().value);
    }
  }
  res.json({ ok: true });
});

// =================== LIKES ===================

app.post('/api/topics/:id/like', auth, (req, res) => {
  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });

  try {
    db.prepare('INSERT INTO likes (user_id, topic_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE topic_id = ?').get(req.params.id);
    res.json({ liked: true, count: count.c });
  } catch {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND topic_id = ?').run(req.user.id, req.params.id);
    const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE topic_id = ?').get(req.params.id);
    res.json({ liked: false, count: count.c });
  }
});

// =================== POSTS ===================

app.get('/api/topics/:id', optionalAuth, (req, res) => {
  const topic = db.prepare(`
    SELECT t.*, u.username, c.name as category_name, c.id as category_id, c.color as category_color,
      (SELECT COUNT(*) FROM likes WHERE topic_id = t.id) as like_count
    FROM topics t
    JOIN users u ON t.user_id = u.id
    JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });

  // Bloquear acesso de visitante a topico travado
  if (topic.locked && !req.user) {
    return res.status(403).json({ error: 'Este tópico está bloqueado. Crie uma conta para acessar.' });
  }

  // Bloquear acesso a topico pendente se nao for autor, admin ou moderador
  if (topic.status === 'pending') {
    const isAuthor = req.user && req.user.id === topic.user_id;
    const isAdminOrMod = req.user && (req.user.role === 'admin' || req.user.role === 'moderator');
    if (!isAuthor && !isAdminOrMod) {
      return res.status(403).json({ error: 'Este tópico está em análise e não está disponível' });
    }
  }
  if (topic.status === 'rejected') {
    const isAuthor = req.user && req.user.id === topic.user_id;
    const isAdminOrMod = req.user && (req.user.role === 'admin' || req.user.role === 'moderator');
    if (!isAuthor && !isAdminOrMod) {
      return res.status(404).json({ error: 'Topico nao encontrado' });
    }
  }

  const posts = db.prepare(`
    SELECT p.*, u.username, u.role, u.created_at as user_since,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
      (SELECT COUNT(*) FROM user_specialties us
         JOIN topics t2 ON t2.id = p.topic_id
        WHERE us.user_id = p.user_id AND us.category_id = t2.category_id) as is_specialist_answer
    FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.topic_id = ? ORDER BY p.created_at ASC
  `).all(req.params.id);

  // Check which posts the user liked/disliked
  if (req.user) {
    const likedPosts = db.prepare('SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (SELECT id FROM posts WHERE topic_id = ?)').all(req.user.id, req.params.id);
    const likedSet = new Set(likedPosts.map(l => l.post_id));
    const dislikedPosts = db.prepare('SELECT post_id FROM post_dislikes WHERE user_id = ? AND post_id IN (SELECT id FROM posts WHERE topic_id = ?)').all(req.user.id, req.params.id);
    const dislikedSet = new Set(dislikedPosts.map(l => l.post_id));
    for (const post of posts) { post.user_liked = likedSet.has(post.id); post.user_disliked = dislikedSet.has(post.id); }
  }

  // Frequent users
  const frequentUsers = db.prepare(`
    SELECT DISTINCT u.id, u.username FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.topic_id = ? LIMIT 8
  `).all(req.params.id);

  topic.tags = db.prepare('SELECT tg.name FROM topic_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.topic_id = ?')
    .all(req.params.id).map(t => t.name);

  let userLiked = false;
  if (req.user) {
    userLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND topic_id = ?').get(req.user.id, req.params.id);
  }
  topic.user_liked = userLiked;

  // Dados de votacao
  if (topic.type === 'poll') {
    const options = db.prepare(`
      SELECT po.id, po.text,
        (SELECT COUNT(*) FROM poll_votes WHERE option_id = po.id) as vote_count
      FROM poll_options po WHERE po.topic_id = ?
    `).all(req.params.id);
    topic.poll_options = options;
    topic.total_votes = options.reduce((sum, o) => sum + o.vote_count, 0);
    if (req.user) {
      const userVote = db.prepare('SELECT option_id FROM poll_votes WHERE user_id = ? AND topic_id = ?').get(req.user.id, req.params.id);
      topic.user_vote = userVote?.option_id || null;
    }
  }

  res.json({ topic, posts, frequentUsers });
});

app.post('/api/posts', auth, (req, res) => {
  const { content, topic_id } = req.body;
  if (!content || !topic_id) return res.status(400).json({ error: 'Conteudo e topico obrigatorios' });
  if (typeof content !== 'string') return res.status(400).json({ error: 'Conteúdo deve ser texto' });
  if (content.length > MAX_CONTENT) return res.status(400).json({ error: 'Conteúdo muito longo' });
  const user = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.user.id);
  if (user?.banned) return res.status(403).json({ error: 'Sua conta foi banida' });
  const topic = db.prepare('SELECT locked, status, user_id FROM topics WHERE id = ?').get(topic_id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });

  if (topic.status === 'pending') {
    const isAuthor = req.user.id === topic.user_id;
    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';
    if (!isAuthor && !isAdminOrMod) {
      return res.status(403).json({ error: 'Este tópico está em análise e não está disponível' });
    }
  }
  if (topic.status === 'rejected') {
    const isAuthor = req.user.id === topic.user_id;
    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';
    if (!isAuthor && !isAdminOrMod) {
      return res.status(404).json({ error: 'Topico nao encontrado' });
    }
  }

  if (topic.locked && req.user.role !== 'admin') return res.status(403).json({ error: 'Este topico esta bloqueado' });

  const result = db.prepare('INSERT INTO posts (content, topic_id, user_id) VALUES (?, ?, ?)').run(content, topic_id, req.user.id);
  const post = db.prepare(`
    SELECT p.*, u.username, u.role,
      (SELECT COUNT(*) FROM user_specialties us
         JOIN topics t2 ON t2.id = p.topic_id
        WHERE us.user_id = p.user_id AND us.category_id = t2.category_id) as is_specialist_answer
    FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
  `).get(result.lastInsertRowid);
  res.json(post);
});

app.put('/api/posts/:id', auth, (req, res) => {
  const { content } = req.body;
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Conteúdo não pode ser vazio' });
  // Mesmo teto da criacao. Sem ele o limite era so cosmetico: bastava criar um
  // post pequeno e edita-lo depois, com o `express.json({ limit: '5mb' })`
  // virando o unico teto real.
  if (content.length > MAX_CONTENT) return res.status(400).json({ error: 'Conteúdo muito longo' });

  const post = db.prepare('SELECT user_id, topic_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nao encontrado' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' });

  // Travar um topico precisa valer para a edicao tambem: sem isto o autor
  // continuava reescrevendo o texto ja publicado, e a moderacao nao segurava
  // nada — so impedia respostas novas.
  const topic = db.prepare('SELECT locked FROM topics WHERE id = ?').get(post.topic_id);
  if (topic?.locked && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Este topico esta bloqueado' });
  }

  db.prepare('UPDATE posts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content.trim(), req.params.id);
  res.json({ ok: true });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nao encontrado' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' });
  // Curtidas e descurtidas referenciam o post (FK sem ON DELETE) — limpar
  // antes, em transação. Apagar um post curtido devolvia 500.
  try {
    db.transaction(apagarPostEmCascata)(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao apagar post:', err);
    res.status(500).json({ error: 'Erro ao apagar post' });
  }
});

// =================== POST LIKES ===================

app.post('/api/posts/:id/like', auth, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nao encontrado' });

  // Remove dislike se existir
  db.prepare('DELETE FROM post_dislikes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
  try {
    db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    const count = db.prepare('SELECT COUNT(*) as c FROM post_likes WHERE post_id = ?').get(req.params.id);
    res.json({ liked: true, count: count.c });
  } catch {
    db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
    const count = db.prepare('SELECT COUNT(*) as c FROM post_likes WHERE post_id = ?').get(req.params.id);
    res.json({ liked: false, count: count.c });
  }
});

app.post('/api/posts/:id/dislike', auth, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nao encontrado' });

  // Remove like se existir
  db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
  try {
    db.prepare('INSERT INTO post_dislikes (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    const count = db.prepare('SELECT COUNT(*) as c FROM post_dislikes WHERE post_id = ?').get(req.params.id);
    res.json({ disliked: true, count: count.c });
  } catch {
    db.prepare('DELETE FROM post_dislikes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
    const count = db.prepare('SELECT COUNT(*) as c FROM post_dislikes WHERE post_id = ?').get(req.params.id);
    res.json({ disliked: false, count: count.c });
  }
});

// =================== BEST ANSWER ===================

app.put('/api/posts/:id/best-answer', auth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Apenas admin ou moderador podem marcar melhor resposta' });
  }
  const post = db.prepare('SELECT topic_id, best_answer FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nao encontrado' });
  // Remove best_answer de outros posts do mesmo topico
  db.prepare('UPDATE posts SET best_answer = 0 WHERE topic_id = ?').run(post.topic_id);
  if (!post.best_answer) {
    db.prepare('UPDATE posts SET best_answer = 1 WHERE id = ?').run(req.params.id);
  }
  res.json({ ok: true });
});

// =================== RELATED TOPICS ===================

app.get('/api/topics/:id/related', (req, res) => {
  const topic = db.prepare('SELECT category_id FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.json([]);
  const related = db.prepare(`
    SELECT t.id, t.title, c.name as category_name, c.color as category_color,
      (SELECT COUNT(*) FROM likes WHERE topic_id = t.id) as like_count,
      MAX(0, (SELECT COUNT(*) FROM posts WHERE topic_id = t.id) - 1) as reply_count,
      t.views,
      COALESCE((SELECT MAX(p.created_at) FROM posts p WHERE p.topic_id = t.id), t.created_at) as last_activity
    FROM topics t JOIN categories c ON t.category_id = c.id
    WHERE t.id != ? AND t.status = 'approved' ORDER BY RANDOM() LIMIT 5
  `).all(req.params.id);
  res.json(related);
});

// =================== SEARCH ===================

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ topics: [], resources: [] });
  const qNorm = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const topics = db.prepare(`
    SELECT t.id, t.title, c.name as category_name, c.color as category_color
    FROM topics t JOIN categories c ON t.category_id = c.id
    WHERE normalize_text(t.title) LIKE ? AND t.status = 'approved'
    LIMIT 10
  `).all(`%${qNorm}%`);
  const resources = db.prepare(`
    SELECT id, title, url, type, source FROM resources
    WHERE normalize_text(title) LIKE ?
    LIMIT 5
  `).all(`%${qNorm}%`);
  res.json({ topics, resources });
});

// =================== RESOURCES ===================

app.get('/api/resources', (req, res) => {
  const resources = db.prepare('SELECT * FROM resources ORDER BY created_at DESC').all();
  res.json(resources);
});

app.get('/api/topics/:id/related-resources', (req, res) => {
  const topic = db.prepare('SELECT title FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.json([]);
  const stopwords = ['como','para','que','com','por','das','dos','uma','uns','mais','entre','sobre','qual','quais','pode','deve','todas','todos','este','esta','esse','essa','novo','nova','são','tem','ser','ter','foi','sua','seu','ele','ela','nas','nos','sem','pilula','parte'];
  const words = topic.title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopwords.includes(w));
  if (words.length === 0) return res.json([]);
  // Buscar todos os resources e pontuar por palavras-chave (com normalização de acentos)
  const allResources = db.prepare(`SELECT id, title, url, type, source FROM resources`).all();
  const scored = [];
  for (const r of allResources) {
    const rTitle = r.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let score = 0;
    for (const w of words) {
      if (rTitle.includes(w)) score += 1;
    }
    if (score > 0) scored.push({ ...r, score });
  }
  scored.sort((a, b) => b.score - a.score);
  res.json(scored.slice(0, 5));
});

app.post('/api/admin/resources/import-playlist', auth, adminOnly, async (req, res) => {
  const { playlist_id } = req.body;
  if (typeof playlist_id !== 'string' || !playlist_id.trim()) {
    return res.status(400).json({ error: 'playlist_id é obrigatório' });
  }
  if (!YOUTUBE_ENABLED) {
    return res.status(503).json({
      error: 'Importação do YouTube indisponível: o servidor está sem YOUTUBE_API_KEY configurada.',
    });
  }
  try {
    const videos = await fetchPlaylistVideos(playlist_id.trim());

    const insert = db.prepare('INSERT OR IGNORE INTO resources (title, url, type, source, playlist_id) VALUES (?, ?, ?, ?, ?)');
    let imported = 0;
    for (const video of videos) {
      const resultado = insert.run(video.title, video.url, 'video', 'youtube', playlist_id.trim());
      if (resultado.changes > 0) imported++;
    }
    const total = db.prepare('SELECT COUNT(*) as count FROM resources WHERE playlist_id = ?').get(playlist_id.trim());
    res.json({ imported, total: total.count, playlist_id });
  } catch (err) {
    // So a mensagem curada de YoutubeImportError chega ao cliente. Erro de
    // outra origem pode carregar a requisicao — e a requisicao, a credencial.
    if (err instanceof YoutubeImportError) {
      console.warn('[playlists] Importacao manual falhou:', err.causa?.message || err.message);
      return res.status(502).json({ error: err.message });
    }
    console.error('[playlists] Erro inesperado ao importar playlist:', err);
    res.status(500).json({ error: 'Erro ao importar playlist.' });
  }
});

// Adicionar recurso individual (curso, link, vídeo avulso)
app.post('/api/admin/resources', auth, adminOnly, (req, res) => {
  const { title, url, type, source } = req.body;
  const normalizedTitle = capitalizeInitial(title);
  if (!normalizedTitle || !url) return res.status(400).json({ error: 'Título e URL são obrigatórios' });
  const resourceType = type || (url.includes('youtube.com') || url.includes('youtu.be') ? 'video' : 'curso');
  const resourceSource = source || (url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'externo');
  try {
    const existing = db.prepare('SELECT id FROM resources WHERE url = ?').get(url);
    if (existing) return res.status(409).json({ error: 'Este recurso já existe' });
    const result = db.prepare('INSERT INTO resources (title, url, type, source) VALUES (?, ?, ?, ?)')
      .run(normalizedTitle, url, resourceType, resourceSource);
    res.json({ id: result.lastInsertRowid, title: normalizedTitle, url, type: resourceType, source: resourceSource });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/resources/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// =================== ADMIN ===================

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, organization, role, banned, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  const catStmt = db.prepare(`
    SELECT c.id, c.name, c.color FROM user_categories uc
    JOIN categories c ON uc.category_id = c.id
    WHERE uc.user_id = ?
  `);
  const specialtyStmt = db.prepare(`
    SELECT c.id, c.name, c.color, us.created_at
    FROM user_specialties us
    JOIN categories c ON us.category_id = c.id
    WHERE us.user_id = ?
    ORDER BY c.name
  `);
  for (const u of users) {
    u.categories = catStmt.all(u.id);
    u.specialties = specialtyStmt.all(u.id);
  }
  res.json(users);
});

app.put('/api/admin/users/:id/categories', auth, adminOnly, (req, res) => {
  const { category_ids } = req.body;
  if (!Array.isArray(category_ids)) return res.status(400).json({ error: 'category_ids deve ser um array' });
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  db.prepare('DELETE FROM user_categories WHERE user_id = ?').run(req.params.id);
  const insert = db.prepare('INSERT INTO user_categories (user_id, category_id) VALUES (?, ?)');
  for (const catId of category_ids) {
    insert.run(req.params.id, catId);
  }
  const cats = db.prepare(`
    SELECT c.id, c.name, c.color FROM user_categories uc
    JOIN categories c ON uc.category_id = c.id
    WHERE uc.user_id = ?
  `).all(req.params.id);
  res.json(cats);
});

app.put('/api/admin/users/:id/ban', auth, adminOnly, (req, res) => {
  const target = db.prepare('SELECT id, banned, role FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Nao e possivel banir a si mesmo' });
  db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(target.banned ? 0 : 1, req.params.id);
  res.json({ ok: true, banned: !target.banned });
});

app.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const target = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Nao e possivel deletar a si mesmo' });

  // A sentinela guarda o conteudo de todas as contas ja removidas; apaga-la
  // levaria junto o historico que ela existe para preservar.
  if (target.email === EMAIL_USUARIO_REMOVIDO) {
    return res.status(400).json({ error: 'Esta conta guarda o histórico de contas removidas e não pode ser excluída' });
  }

  try {
    // Politica definida com a frente: o conteudo publico permanece sem
    // autoria; o dado pessoal e eliminado. Antes a exclusao apagava os
    // topicos do usuario junto com TODAS as respostas de terceiros neles.
    db.transaction(anonimizarERemoverUsuario)(Number(req.params.id));
    res.json({ ok: true, anonimizado: true });
  } catch (err) {
    console.error('Erro ao remover usuario:', err);
    res.status(500).json({ error: 'Erro ao remover usuario' });
  }
});

app.put('/api/admin/users/:id/role', auth, adminOnly, (req, res) => {
  const { role } = req.body;
  if (!role || !['user', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Papel invalido. Use: user, moderator ou admin' });
  }
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Nao e possivel alterar seu proprio papel' });
  const specialties = db.prepare('SELECT COUNT(*) as c FROM user_specialties WHERE user_id = ?').get(req.params.id).c;
  if (role === 'user' && specialties > 0) {
    return res.status(400).json({ error: 'Revogue as especializacoes antes de alterar este papel' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true, role });
});

// =================== ESPECIALISTAS ===================

// Admin: designar especializacao diretamente
app.post('/api/admin/users/:id/specialties/:categoryId', auth, adminOnly, (req, res) => {
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  const category = db.prepare('SELECT id, name, color FROM categories WHERE id = ?').get(req.params.categoryId);
  if (!category) return res.status(404).json({ error: 'Tema nao encontrado' });

  const result = db.prepare(`
    INSERT OR IGNORE INTO user_specialties (user_id, category_id, granted_by)
    VALUES (?, ?, ?)
  `).run(target.id, category.id, req.user.id);
  if (result.changes === 0) {
    return res.status(409).json({ error: 'Este usuario ja e especialista neste tema' });
  }

  db.prepare("UPDATE users SET role = 'especialista' WHERE id = ? AND role = 'user'").run(target.id);
  db.prepare('INSERT INTO notifications (user_id, type, content, reference_id) VALUES (?, ?, ?, ?)')
    .run(target.id, 'specialty_granted', `A administração designou você como especialista em ${category.name}`, category.id);

  res.status(201).json({ ok: true, specialty: category });
});

// Admin: revogar especializacao
app.delete('/api/admin/users/:id/specialties/:categoryId', auth, adminOnly, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  const category = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(req.params.categoryId);
  if (!category) return res.status(404).json({ error: 'Tema nao encontrado' });
  const result = db.prepare('DELETE FROM user_specialties WHERE user_id = ? AND category_id = ?').run(req.params.id, req.params.categoryId);
  if (result.changes === 0) return res.status(404).json({ error: 'Especializacao nao encontrada' });
  const restantes = db.prepare('SELECT COUNT(*) as c FROM user_specialties WHERE user_id = ?').get(req.params.id).c;
  if (restantes === 0) {
    db.prepare("UPDATE users SET role = 'user' WHERE id = ? AND role = 'especialista'").run(req.params.id);
  }
  db.prepare('INSERT INTO notifications (user_id, type, content, reference_id) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'specialty_revoked', `A administração removeu sua designação de especialista em ${category.name}`, category.id);
  res.json({ ok: true });
});

// =================== MODERACAO DE TOPICOS ===================

// Listar topicos pendentes (admin e moderador)
app.get('/api/admin/topics/pending', auth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const topics = db.prepare(`
    SELECT t.*, u.username,
      c.name as category_name, c.color as category_color,
      MAX(0, (SELECT COUNT(*) FROM posts WHERE topic_id = t.id) - 1) as reply_count,
      (SELECT p.content FROM posts p WHERE p.topic_id = t.id ORDER BY p.created_at ASC LIMIT 1) as first_post_content
    FROM topics t
    JOIN users u ON t.user_id = u.id
    JOIN categories c ON t.category_id = c.id
    WHERE t.status = 'pending'
    ORDER BY t.created_at DESC
  `).all();
  res.json(topics);
});

// Aprovar topico
app.put('/api/admin/topics/:id/approve', auth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });
  if (topic.status !== 'pending') return res.status(400).json({ error: 'Topico nao esta pendente' });

  db.prepare("UPDATE topics SET status = 'approved' WHERE id = ?").run(req.params.id);

  // Notificar o autor que o topico foi aprovado
  const modName = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id)?.username || 'Moderador';
  db.prepare('INSERT INTO notifications (user_id, type, content, reference_id) VALUES (?, ?, ?, ?)')
    .run(topic.user_id, 'moderation', `Seu tópico "${topic.title}" foi aprovado por ${modName} e já está visível no fórum!`, topic.id);

  res.json({ ok: true });
});

// Rejeitar topico
app.put('/api/admin/topics/:id/reject', auth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topico nao encontrado' });
  if (topic.status !== 'pending') return res.status(400).json({ error: 'Topico nao esta pendente' });

  db.prepare("UPDATE topics SET status = 'rejected' WHERE id = ?").run(req.params.id);

  // Notificar o autor que o topico foi rejeitado
  const modName = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id)?.username || 'Moderador';
  db.prepare('INSERT INTO notifications (user_id, type, content, reference_id) VALUES (?, ?, ?, ?)')
    .run(topic.user_id, 'moderation', `Seu tópico "${topic.title}" não foi aprovado por ${modName}. O conteúdo não atende às diretrizes do fórum.`, topic.id);

  res.json({ ok: true });
});

// =================== SERVIR REACT BUILD ===================
const buildPath = path.join(__dirname, '..', 'build');

// Rota de API inexistente responde JSON. Sem isto ela caia na curinga do SPA e
// voltava HTML, que estoura no res.json() do cliente com um erro de sintaxe
// sem relacao nenhuma com a causa real.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Rota de API nao encontrada: ${req.method} /api${req.path}` });
});

app.use(express.static(buildPath));

app.get('{*path}', (req, res, next) => {
  // `root` e obrigatorio aqui. Com caminho absoluto, o modulo `send` trata a
  // string inteira como caminho de requisicao e aplica a politica de dotfiles
  // ('ignore' => 404) a TODOS os segmentos — inclusive aos do caminho de
  // instalacao. Basta um diretorio oculto na arvore (worktree do git, cache de
  // CI, checkout dentro de ~/.algo) para todo deep link do SPA virar 404.
  res.sendFile('index.html', { root: buildPath }, (err) => {
    if (err) next(err);
  });
});

// =================== ERROR HANDLER GLOBAL ===================
// Registrado por ultimo de proposito: o Express so entrega o erro a handlers
// declarados DEPOIS do ponto onde ele aconteceu. Antes, este bloco vinha acima
// do express.static, entao falha ao servir arquivo escapava para o handler
// padrao do Express e vazava stack trace.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('Erro nao tratado:', err.stack || err.message);
  } else {
    console.warn(`Requisicao recusada (${status}):`, err.message);
  }
  if (res.headersSent) return next(err);

  // Mensagem propria so para erro de politica (4xx); 5xx nunca detalha.
  const body = status >= 500
    ? { error: 'Erro interno do servidor' }
    : { error: err.expose === false ? 'Requisicao recusada' : err.message };
  res.status(status).json(body);
});

// Sob require (testes), exporta o app sem ocupar porta; executado diretamente
// (npm start / npm run server), sobe o servidor como sempre.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nServidor rodando na porta ${PORT}`);
    console.log('Forum RECPSP API pronta!\n');
  });
}

module.exports = app;
