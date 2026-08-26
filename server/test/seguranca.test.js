// Regressões da revisão adversarial de segurança (26/08/2026).
//
// Cada caso aqui guarda um defeito que foi confirmado em execução. Não são
// testes hipotéticos: se algum voltar a passar pelo caminho antigo, o teste
// vermelho aponta exatamente qual proteção caiu.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, login, SEED } = require('./helpers');

let admin;
let maria;

before(async () => {
  await start();
  admin = await login(SEED.admin.email, SEED.admin.password);
  maria = await login(SEED.maria.email, SEED.maria.password);
});

after(() => stop());

test('login não vira oráculo de enumeração quando a senha não é string', async () => {
  // O defeito: e-mail inexistente devolvia 401 (mensagem neutra), mas e-mail
  // EXISTENTE com senha não-string fazia o bcryptjs lançar e a resposta virava
  // 500. A diferença de status entregava quais contas existem.
  const existenteSemSenha = await api('POST', '/api/auth/login', {
    body: { email: SEED.admin.email },
  });
  const inexistenteSemSenha = await api('POST', '/api/auth/login', {
    body: { email: 'ninguem-aqui@teste.com' },
  });
  assert.equal(existenteSemSenha.status, 401, 'conta existente não pode responder diferente');
  assert.equal(inexistenteSemSenha.status, 401);
  assert.deepEqual(
    existenteSemSenha.data,
    inexistenteSemSenha.data,
    'as duas respostas precisam ser indistinguíveis',
  );

  for (const senha of [null, 123, { a: 1 }, ['x']]) {
    const r = await api('POST', '/api/auth/login', { body: { email: SEED.admin.email, password: senha } });
    assert.equal(r.status, 401, `senha ${JSON.stringify(senha)} deveria dar 401, não 500`);
  }

  // E-mail não-string fazia o better-sqlite3 lançar RangeError.
  const emailObjeto = await api('POST', '/api/auth/login', {
    body: { email: { $ne: null }, password: 'qualquer' },
  });
  assert.equal(emailObjeto.status, 401);
});

test('conta banida perde a leitura privilegiada, não só a escrita', async () => {
  // optionalAuth copiava o papel sem checar `banned`: um moderador banido
  // continuava enxergando tópicos pendentes na listagem pública.
  const reg = await api('POST', '/api/auth/register', {
    body: { username: 'ModeradorBanido', email: 'mod-banido@teste.com', password: 'senha123', accept_terms: true },
  });
  assert.equal(reg.status, 200);
  const token = reg.data.token;
  await api('PUT', `/api/admin/users/${reg.data.user.id}/role`, { token: admin, body: { role: 'moderator' } });

  // Tópico pendente da Maria (imagem de usuário comum entra em análise).
  const pendente = await api('POST', '/api/topics', {
    token: maria,
    body: {
      title: 'Pendente para o teste de banimento',
      category_id: 2,
      content: 'Corpo.',
      image_url: 'https://exemplo.gov.br/imagem.png',
    },
  });
  assert.equal(pendente.data.status, 'pending');

  const antes = await api('GET', '/api/topics?per_page=50', { token });
  assert.ok(
    antes.data.topics.some((t) => t.id === pendente.data.id),
    'antes do banimento o moderador deveria ver o pendente',
  );

  assert.equal((await api('PUT', `/api/admin/users/${reg.data.user.id}/ban`, { token: admin })).status, 200);

  const depois = await api('GET', '/api/topics?per_page=50', { token });
  assert.equal(depois.status, 200, 'a navegação pública continua funcionando');
  assert.ok(
    !depois.data.topics.some((t) => t.id === pendente.data.id),
    'depois do banimento o token não deveria mais dar visão de moderação',
  );
  assert.equal(
    (await api('GET', `/api/topics/${pendente.data.id}`, { token })).status,
    403,
    'o detalhe do pendente também deveria fechar',
  );
});

test('a contagem de visualizações recusa id que não é número', async () => {
  // A chave do cache era `ip:${req.params.id}` com o id cru: qualquer string de
  // URL virava chave nova, e o cache crescia sem teto.
  const lixo = await api('POST', '/api/topics/nao-e-numero/view');
  assert.equal(lixo.status, 400);

  const valido = await api('POST', '/api/topics/2/view');
  assert.equal(valido.status, 200, 'o caminho legítimo continua funcionando');
});

test('editar resposta respeita tópico travado e o limite de tamanho', async () => {
  const topico = await api('POST', '/api/topics', {
    token: maria,
    body: { title: 'Tópico que será travado', category_id: 2, content: 'Corpo.' },
  });
  assert.equal(topico.status, 200);
  const post = await api('POST', '/api/posts', {
    token: maria,
    body: { topic_id: topico.data.id, content: 'Resposta original.' },
  });
  assert.equal(post.status, 200);

  // O limite valia só na criação: bastava criar pequeno e editar depois.
  const gigante = await api('PUT', `/api/posts/${post.data.id}`, {
    token: maria,
    body: { content: 'x'.repeat(50001) },
  });
  assert.equal(gigante.status, 400, 'a edição deveria aplicar o mesmo teto da criação');

  assert.equal((await api('PUT', `/api/topics/${topico.data.id}/lock`, { token: admin })).status, 200);

  const editaTravado = await api('PUT', `/api/posts/${post.data.id}`, {
    token: maria,
    body: { content: 'Reescrevendo depois de travado.' },
  });
  assert.equal(editaTravado.status, 403, 'travar o tópico precisa valer para a edição também');
});

test('URL de mídia com esquema executável é recusada na criação do tópico', async () => {
  // image_url ia crua para um <img src> e video_url para um iframe.
  // Os "javascript:" abaixo são o vetor sob teste, não uso real — o
  // no-script-url do eslint não distingue os dois casos.
  /* eslint-disable no-script-url */
  for (const [campo, valor] of [
    ['image_url', 'javascript:alert(1)'],
    ['image_url', 'data:text/html;base64,PHN2Zz4='],
    ['video_url', 'javascript:alert(1)'],
  ]) {
    /* eslint-enable no-script-url */
    const r = await api('POST', '/api/topics', {
      token: maria,
      body: { title: `Mídia hostil ${campo}`, category_id: 2, content: 'Corpo.', [campo]: valor },
    });
    assert.equal(r.status, 400, `${campo}=${valor} deveria ser recusado`);
  }

  const legitimo = await api('POST', '/api/topics', {
    token: maria,
    body: {
      title: 'Mídia legítima',
      category_id: 2,
      content: 'Corpo.',
      image_url: 'https://exemplo.gov.br/imagem.png',
    },
  });
  assert.equal(legitimo.status, 200, 'URL http(s) continua aceita');
});

test('cadastro aplica os mesmos limites de campo livre que a edição de perfil', async () => {
  // organization e location entravam crus no cadastro: os limites só existiam
  // na edição de perfil, embora as duas rotas gravem a mesma tabela.
  const longo = await api('POST', '/api/auth/register', {
    body: {
      username: 'OrganizacaoEnorme',
      email: 'org-enorme@teste.com',
      password: 'senha123',
      accept_terms: true,
      organization: 'x'.repeat(500),
    },
  });
  assert.equal(longo.status, 400);
  assert.match(longo.data.error, /Organização/);

  const emailEnorme = await api('POST', '/api/auth/register', {
    body: {
      username: 'EmailEnorme',
      email: 'a'.repeat(300) + '@teste.com',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(emailEnorme.status, 400, 'o e-mail não tinha limite de tamanho em rota nenhuma');
});
