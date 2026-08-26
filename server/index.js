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
if (!process.env.JWT_SECRET) console.warn('AVISO: JWT_SECRET não definido. Usando fallback inseguro. Defina JWT_SECRET nas variáveis de ambiente.');
if (!process.env.YOUTUBE_API_KEY) console.warn('AVISO: YOUTUBE_API_KEY não definido. Importação de playlists pode falhar.');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-in-production';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

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
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
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
  {
  const testPass = bcrypt.hashSync('teste123', 10);
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

async function importDefaultPlaylists() {
  const API_KEY = YOUTUBE_API_KEY;
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM resources').get().c;
  if (existingCount > 0) return; // já importado
  const insert = db.prepare('INSERT OR IGNORE INTO resources (title, url, type, source, playlist_id) VALUES (?, ?, ?, ?, ?)');
  for (const playlistId of defaultPlaylists) {
    try {
      let nextPageToken = '';
      do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}${nextPageToken ? '&pageToken=' + nextPageToken : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) { console.log(`[playlists] Erro na playlist ${playlistId}:`, data.error.message); break; }
        for (const item of (data.items || [])) {
          const title = item.snippet.title;
          if (title === 'Private video' || title === 'Deleted video') continue;
          const videoId = item.snippet.resourceId.videoId;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const existing = db.prepare('SELECT id FROM resources WHERE url = ?').get(videoUrl);
          if (!existing) insert.run(title, videoUrl, 'video', 'youtube', playlistId);
        }
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken);
    } catch (err) { console.log(`[playlists] Erro ao importar ${playlistId}:`, err.message); }
  }
  const total = db.prepare('SELECT COUNT(*) as c FROM resources').get().c;
  console.log(`[playlists] ${total} vídeos importados de ${defaultPlaylists.length} playlists`);
}

// Num banco vazio a importação dispara chamadas de rede ao YouTube no boot;
// SKIP_PLAYLIST_IMPORT=1 permite pular (testes usam banco vazio por execução).
if (process.env.SKIP_PLAYLIST_IMPORT !== '1') importDefaultPlaylists();

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
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sem origin (mobile apps, curl, server-side)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Bloqueado pelo CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const authUserByIdStmt = db.prepare('SELECT id, username, role, banned FROM users WHERE id = ?');

// =================== SECURITY HEADERS ===================
app.use(helmet({
  contentSecurityPolicy: false, // desativado para permitir inline scripts do React
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
      if (authUser) {
        req.user = {
          id: authUser.id,
          username: authUser.username,
          role: authUser.role,
          banned: !!authUser.banned,
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  if (!accept_terms) return res.status(400).json({ error: 'É necessário aceitar os Termos de Uso para criar uma conta' });
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
  try {
    if (username) db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.user.id);
    if (email) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
    if (password && password.length >= 6) {
      const hashed = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    }
    if (location !== undefined) db.prepare('UPDATE users SET location = ? WHERE id = ?').run(location, req.user.id);
    if (organization !== undefined) db.prepare('UPDATE users SET organization = ? WHERE id = ?').run(organization, req.user.id);
    if (bio !== undefined) db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, req.user.id);

    const user = db.prepare('SELECT id, username, email, role, location, organization, bio FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Nome ou email ja em uso' });
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
  if (!Number.isInteger(receiverId) || !content || !content.trim()) return res.status(400).json({ error: 'Destinatario e conteudo obrigatorios' });
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
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
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
  if (normalizedTitle.length > 200) return res.status(400).json({ error: 'Título deve ter no máximo 200 caracteres' });
  if (content.length > 50000) return res.status(400).json({ error: 'Conteúdo muito longo' });

  const user = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.user.id);
  if (user?.banned) return res.status(403).json({ error: 'Sua conta foi banida' });

  // Validacoes por tipo
  if (type === 'question' && content.length > 100) return res.status(400).json({ error: 'Pergunta deve ter no maximo 100 caracteres' });
  if (type === 'poll' && (!poll_options || !Array.isArray(poll_options) || poll_options.filter(o => o.trim()).length < 2)) {
    return res.status(400).json({ error: 'Votacao precisa de pelo menos 2 alternativas' });
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
  // respostas precisam sair antes dos posts, e tudo dentro de transação para
  // a exclusão ser atômica (mesmo padrão de DELETE /api/admin/users/:id).
  const deleteTopic = db.transaction(() => {
    const posts = db.prepare('SELECT id FROM posts WHERE topic_id = ?').all(req.params.id);
    for (const p of posts) {
      db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(p.id);
      db.prepare('DELETE FROM post_dislikes WHERE post_id = ?').run(p.id);
    }
    db.prepare('DELETE FROM poll_votes WHERE topic_id = ?').run(req.params.id);
    db.prepare('DELETE FROM poll_options WHERE topic_id = ?').run(req.params.id);
    db.prepare('DELETE FROM topic_tags WHERE topic_id = ?').run(req.params.id);
    db.prepare('DELETE FROM likes WHERE topic_id = ?').run(req.params.id);
    db.prepare('DELETE FROM posts WHERE topic_id = ?').run(req.params.id);
    db.prepare('DELETE FROM topics WHERE id = ?').run(req.params.id);
  });
  deleteTopic();
  res.json({ ok: true });
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

const viewedTopics = new Map(); // Map<"ip:topicId", timestamp>
app.post('/api/topics/:id/view', (req, res) => {
  const key = `${req.ip}:${req.params.id}`;
  const now = Date.now();
  const lastView = viewedTopics.get(key);
  // Só conta view a cada 30 minutos por IP/tópico
  if (!lastView || (now - lastView) > 30 * 60 * 1000) {
    db.prepare('UPDATE topics SET views = views + 1 WHERE id = ?').run(req.params.id);
    viewedTopics.set(key, now);
    // Limpar entradas antigas a cada 1000 registros
    if (viewedTopics.size > 1000) {
      const cutoff = now - 30 * 60 * 1000;
      for (const [k, v] of viewedTopics) { if (v < cutoff) viewedTopics.delete(k); }
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
  if (!content || !content.trim()) return res.status(400).json({ error: 'Conteúdo não pode ser vazio' });
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nao encontrado' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' });
  db.prepare('UPDATE posts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content.trim(), req.params.id);
  res.json({ ok: true });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nao encontrado' });
  if (post.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissao' });
  // Curtidas e descurtidas referenciam o post (FK sem ON DELETE) — limpar
  // antes, em transação.
  const deletePost = db.transaction(() => {
    db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM post_dislikes WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  });
  deletePost();
  res.json({ ok: true });
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
  if (!playlist_id) return res.status(400).json({ error: 'playlist_id é obrigatório' });
  const API_KEY = YOUTUBE_API_KEY;
  try {
    let allItems = [];
    let nextPageToken = '';
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlist_id}&key=${API_KEY}${nextPageToken ? '&pageToken=' + nextPageToken : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      allItems = allItems.concat(data.items || []);
      nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);

    const insert = db.prepare('INSERT OR IGNORE INTO resources (title, url, type, source, playlist_id) VALUES (?, ?, ?, ?, ?)');
    let imported = 0;
    for (const item of allItems) {
      const title = item.snippet.title;
      if (title === 'Private video' || title === 'Deleted video') continue;
      const videoId = item.snippet.resourceId.videoId;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const existing = db.prepare('SELECT id FROM resources WHERE url = ?').get(url);
      if (!existing) {
        insert.run(title, url, 'video', 'youtube', playlist_id);
        imported++;
      }
    }
    const total = db.prepare('SELECT COUNT(*) as count FROM resources WHERE playlist_id = ?').get(playlist_id);
    res.json({ imported, total: total.count, playlist_id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar playlist: ' + err.message });
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
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Nao e possivel deletar a si mesmo' });

  const deleteUser = db.transaction(() => {
    // Buscar todos os topicos do usuario para limpar dependencias
    const userTopics = db.prepare('SELECT id FROM topics WHERE user_id = ?').all(req.params.id);
    const topicIds = userTopics.map(t => t.id);

    // Limpar poll_votes e poll_options dos topicos do usuario
    for (const tid of topicIds) {
      db.prepare('DELETE FROM poll_votes WHERE topic_id = ?').run(tid);
      const opts = db.prepare('SELECT id FROM poll_options WHERE topic_id = ?').all(tid);
      for (const opt of opts) {
        db.prepare('DELETE FROM poll_votes WHERE option_id = ?').run(opt.id);
      }
      db.prepare('DELETE FROM poll_options WHERE topic_id = ?').run(tid);
    }

    // Limpar topic_tags dos topicos do usuario
    for (const tid of topicIds) {
      db.prepare('DELETE FROM topic_tags WHERE topic_id = ?').run(tid);
    }

    // Limpar likes/dislikes dos posts em topicos do usuario (feitos por outros)
    for (const tid of topicIds) {
      const posts = db.prepare('SELECT id FROM posts WHERE topic_id = ?').all(tid);
      for (const p of posts) {
        db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(p.id);
        db.prepare('DELETE FROM post_dislikes WHERE post_id = ?').run(p.id);
      }
    }

    // Limpar likes em topicos do usuario (feitos por outros)
    for (const tid of topicIds) {
      db.prepare('DELETE FROM likes WHERE topic_id = ?').run(tid);
    }

    // Limpar poll_votes feitos pelo usuario em outros topicos
    db.prepare('DELETE FROM poll_votes WHERE user_id = ?').run(req.params.id);

    // Limpar post_likes e post_dislikes feitos pelo usuario
    db.prepare('DELETE FROM post_likes WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM post_dislikes WHERE user_id = ?').run(req.params.id);

    // Limpar likes feitos pelo usuario em outros topicos
    db.prepare('DELETE FROM likes WHERE user_id = ?').run(req.params.id);

    // Limpar mensagens, notificacoes e categorias do usuario
    db.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM user_categories WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM user_specialties WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM specialist_requests WHERE user_id = ?').run(req.params.id);

    // Limpar posts do usuario (em topicos de outros)
    db.prepare('DELETE FROM posts WHERE user_id = ?').run(req.params.id);

    // Limpar posts de outros em topicos do usuario
    for (const tid of topicIds) {
      db.prepare('DELETE FROM posts WHERE topic_id = ?').run(tid);
    }

    // Deletar topicos do usuario
    db.prepare('DELETE FROM topics WHERE user_id = ?').run(req.params.id);

    // Deletar o usuario
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  });

  try {
    deleteUser();
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao deletar usuario:', err);
    res.status(500).json({ error: 'Erro ao deletar usuario' });
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

// =================== ERROR HANDLER GLOBAL ===================
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// =================== SERVIR REACT BUILD ===================
const buildPath = path.join(__dirname, '..', 'build');
app.use(express.static(buildPath));

app.get('{*path}', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
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
