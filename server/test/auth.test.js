// Autenticação: registro com aceite de termos, login por e-mail, banimento e
// releitura do papel a cada requisição.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, login, SEED } = require('./helpers');

let admin;

before(async () => {
  await start();
  admin = await login(SEED.admin.email, SEED.admin.password);
});

after(() => stop());

test('registro exige aceite dos Termos de Uso', async () => {
  const semAceite = await api('POST', '/api/auth/register', {
    body: { username: 'SemTermos', email: 'semtermos@teste.com', password: 'senha123' },
  });
  assert.equal(semAceite.status, 400);
  assert.match(semAceite.data.error, /Termos de Uso/);

  const comAceite = await api('POST', '/api/auth/register', {
    body: { username: 'ComTermos', email: 'comtermos@teste.com', password: 'senha123', accept_terms: true },
  });
  assert.equal(comAceite.status, 200);
  assert.ok(comAceite.data.token, 'registro deveria devolver token');
  assert.equal(comAceite.data.user.role, 'user');
});

test('login é por e-mail; senha errada é recusada', async () => {
  const ok = await api('POST', '/api/auth/login', {
    body: { email: SEED.maria.email, password: SEED.maria.password },
  });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token);
  assert.equal(ok.data.user.email, SEED.maria.email);

  const errada = await api('POST', '/api/auth/login', {
    body: { email: SEED.maria.email, password: 'senha-errada' },
  });
  assert.equal(errada.status, 401);
});

test('conta banida é bloqueada no login e nas rotas autenticadas', async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: { username: 'BanidoTeste', email: 'banido@teste.com', password: 'senha123', accept_terms: true },
  });
  assert.equal(reg.status, 200);
  const tokenAntigo = reg.data.token;

  const ban = await api('PUT', `/api/admin/users/${reg.data.user.id}/ban`, { token: admin });
  assert.equal(ban.status, 200);
  assert.equal(ban.data.banned, true);

  // O token emitido antes do banimento para de valer imediatamente,
  // porque o guarda relê o usuário do banco a cada requisição.
  const comTokenAntigo = await api('GET', '/api/auth/me', { token: tokenAntigo });
  assert.equal(comTokenAntigo.status, 403);

  const novoLogin = await api('POST', '/api/auth/login', {
    body: { email: 'banido@teste.com', password: 'senha123' },
  });
  assert.equal(novoLogin.status, 403);
});

test('promover a moderador tem efeito imediato, sem reemitir token', async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: { username: 'PromovidoTeste', email: 'promovido@teste.com', password: 'senha123', accept_terms: true },
  });
  assert.equal(reg.status, 200);
  const token = reg.data.token; // emitido com papel 'user'

  const antes = await api('GET', '/api/admin/topics/pending', { token });
  assert.equal(antes.status, 403, 'usuário comum não deveria ver a fila de moderação');

  const promove = await api('PUT', `/api/admin/users/${reg.data.user.id}/role`, {
    token: admin,
    body: { role: 'moderator' },
  });
  assert.equal(promove.status, 200);

  const depois = await api('GET', '/api/admin/topics/pending', { token });
  assert.equal(depois.status, 200, 'o mesmo token deveria valer como moderador após a promoção');
});
