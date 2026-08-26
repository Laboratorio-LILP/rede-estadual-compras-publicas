// Autorização: adminOnly nas rotas de administração; usuário comum não altera
// papel nem concede especialidade; moderador não é admin.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, login, SEED } = require('./helpers');

let ana; let admin; let moderador; let idMaria;

before(async () => {
  await start();
  ana = await login(SEED.ana.email, SEED.ana.password);
  admin = await login(SEED.admin.email, SEED.admin.password);

  const reg = await api('POST', '/api/auth/register', {
    body: { username: 'ModeradorAutorizacao', email: 'mod-aut@teste.com', password: 'senha123', accept_terms: true },
  });
  moderador = reg.data.token;
  await api('PUT', `/api/admin/users/${reg.data.user.id}/role`, { token: admin, body: { role: 'moderator' } });

  const usuarios = await api('GET', '/api/admin/users', { token: admin });
  idMaria = usuarios.data.find((u) => u.email === SEED.maria.email).id;
});

after(() => stop());

test('rotas adminOnly recusam usuário comum e moderador', async () => {
  assert.equal((await api('GET', '/api/admin/users', { token: ana })).status, 403);
  assert.equal((await api('GET', '/api/admin/users', { token: moderador })).status, 403, 'moderador não é admin');
  assert.equal((await api('GET', '/api/admin/users', { token: admin })).status, 200);
});

test('usuário comum não altera papel de ninguém', async () => {
  const tentativa = await api('PUT', `/api/admin/users/${idMaria}/role`, {
    token: ana,
    body: { role: 'admin' },
  });
  assert.equal(tentativa.status, 403);
});

test('a rota de papel valida o conjunto aceito', async () => {
  const invalido = await api('PUT', `/api/admin/users/${idMaria}/role`, {
    token: admin,
    body: { role: 'especialista' },
  });
  assert.equal(invalido.status, 400, 'especialista não está no conjunto aceito pela rota (ver docs/QUESTIONS.md, 14)');
});

test('usuário comum não concede especialidade; admin concede', async () => {
  const tentativa = await api('POST', `/api/admin/users/${idMaria}/specialties/1`, { token: ana });
  assert.equal(tentativa.status, 403);

  const concessao = await api('POST', `/api/admin/users/${idMaria}/specialties/1`, { token: admin });
  assert.equal(concessao.status, 201);

  const revogacao = await api('DELETE', `/api/admin/users/${idMaria}/specialties/1`, { token: admin });
  assert.equal(revogacao.status, 200);
});

test('fixar e travar tópico são só de admin', async () => {
  const topico = (await api('POST', '/api/topics', {
    token: ana,
    body: { title: 'Tópico de autorização', category_id: 1, content: 'Corpo.' },
  })).data;

  assert.equal((await api('PUT', `/api/topics/${topico.id}/pin`, { token: ana })).status, 403);
  assert.equal((await api('PUT', `/api/topics/${topico.id}/lock`, { token: moderador })).status, 403);
  assert.equal((await api('PUT', `/api/topics/${topico.id}/pin`, { token: admin })).status, 200);
});

test('fila de moderação aceita moderador e recusa usuário comum', async () => {
  assert.equal((await api('GET', '/api/admin/topics/pending', { token: ana })).status, 403);
  assert.equal((await api('GET', '/api/admin/topics/pending', { token: moderador })).status, 200);
});
