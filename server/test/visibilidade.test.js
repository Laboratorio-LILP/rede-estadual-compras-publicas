// Visibilidade e moderação — a máquina de estados de topics.status + locked.
//
// A regra de quem enxerga o quê está repetida em QUATRO lugares do servidor
// (GET /api/topics, GET /api/categories/:id/topics, GET /api/topics/:id e
// POST /api/posts) — ver docs/ARCHITECTURE.md, seção 6. Estes testes cobrem os
// quatro, de propósito: uma alteração futura que mexa num só deles quebra aqui.
//
// Comportamento testado é o ATUAL: só tópico com imagem/vídeo entra pendente
// (a decisão de moderar todo tópico está em aberto — docs/QUESTIONS.md, 11).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, login, SEED } = require('./helpers');

let maria; let ana; let admin; let moderador;
let aprovado; let pendente; let rejeitado; let travado;

const CATEGORIA = 2; // Obras Públicas — categoria com pouco conteúdo do seed

function novoTopico(extras = {}) {
  return {
    title: `Tópico de visibilidade ${Math.random().toString(36).slice(2, 8)}`,
    category_id: CATEGORIA,
    content: 'Corpo do tópico.',
    ...extras,
  };
}

before(async () => {
  await start();
  maria = await login(SEED.maria.email, SEED.maria.password);
  ana = await login(SEED.ana.email, SEED.ana.password);
  admin = await login(SEED.admin.email, SEED.admin.password);

  // Moderador descartável: registrado como user e promovido pelo admin
  // (o papel é relido do banco a cada requisição, então o token vale).
  const reg = await api('POST', '/api/auth/register', {
    body: { username: 'ModeradorVisibilidade', email: 'mod-vis@teste.com', password: 'senha123', accept_terms: true },
  });
  moderador = reg.data.token;
  await api('PUT', `/api/admin/users/${reg.data.user.id}/role`, { token: admin, body: { role: 'moderator' } });

  // Um tópico da Maria em cada estado:
  aprovado = (await api('POST', '/api/topics', { token: maria, body: novoTopico() })).data;
  assert.equal(aprovado.status, 'approved', 'tópico de texto puro deveria publicar direto (comportamento atual)');

  pendente = (await api('POST', '/api/topics', {
    token: maria,
    body: novoTopico({ image_url: 'https://exemplo.gov.br/imagem.png' }),
  })).data;
  assert.equal(pendente.status, 'pending', 'tópico com imagem de usuário comum deveria entrar pendente');

  rejeitado = (await api('POST', '/api/topics', {
    token: maria,
    body: novoTopico({ image_url: 'https://exemplo.gov.br/outra.png' }),
  })).data;
  await api('PUT', `/api/admin/topics/${rejeitado.id}/reject`, { token: admin });

  travado = (await api('POST', '/api/topics', { token: maria, body: novoTopico() })).data;
  await api('PUT', `/api/topics/${travado.id}/lock`, { token: admin });
});

after(() => stop());

async function idsListados(token) {
  const res = await api('GET', '/api/topics?per_page=50', token ? { token } : {});
  assert.equal(res.status, 200);
  return new Set(res.data.topics.map((t) => t.id));
}

test('listagem geral: visitante vê só aprovado e não travado', async () => {
  const ids = await idsListados(null);
  assert.ok(ids.has(aprovado.id), 'aprovado deveria aparecer');
  assert.ok(!ids.has(pendente.id), 'pendente não deveria aparecer para visitante');
  assert.ok(!ids.has(rejeitado.id), 'rejeitado não deveria aparecer para visitante');
  assert.ok(!ids.has(travado.id), 'travado não deveria aparecer para visitante');
});

test('listagem geral: usuária autenticada vê aprovados, travados e os próprios pendentes', async () => {
  const idsAna = await idsListados(ana);
  assert.ok(idsAna.has(aprovado.id));
  assert.ok(idsAna.has(travado.id), 'travado aparece para quem está logado');
  assert.ok(!idsAna.has(pendente.id), 'pendente de outra pessoa não aparece');
  assert.ok(!idsAna.has(rejeitado.id));

  const idsMaria = await idsListados(maria);
  assert.ok(idsMaria.has(pendente.id), 'a autora vê o próprio pendente');
  assert.ok(!idsMaria.has(rejeitado.id), 'rejeitado não aparece em listagem nem para a autora');
});

test('listagem geral: moderador vê pendentes e não vê rejeitados', async () => {
  const ids = await idsListados(moderador);
  assert.ok(ids.has(pendente.id), 'moderador vê pendentes de qualquer autor');
  assert.ok(!ids.has(rejeitado.id), 'rejeitado fica fora das listagens até para moderador');
});

test('listagem por categoria repete a mesma regra', async () => {
  const visitante = await api('GET', `/api/categories/${CATEGORIA}/topics`);
  assert.equal(visitante.status, 200);
  const idsVisitante = new Set(visitante.data.map((t) => t.id));
  assert.ok(idsVisitante.has(aprovado.id));
  assert.ok(!idsVisitante.has(pendente.id));
  assert.ok(!idsVisitante.has(travado.id));

  const mod = await api('GET', `/api/categories/${CATEGORIA}/topics`, { token: moderador });
  const idsMod = new Set(mod.data.map((t) => t.id));
  assert.ok(idsMod.has(pendente.id));
  assert.ok(!idsMod.has(rejeitado.id));
});

test('detalhe de tópico pendente: só autora, moderador e admin', async () => {
  assert.equal((await api('GET', `/api/topics/${pendente.id}`)).status, 403, 'visitante');
  assert.equal((await api('GET', `/api/topics/${pendente.id}`, { token: ana })).status, 403, 'outra usuária');
  assert.equal((await api('GET', `/api/topics/${pendente.id}`, { token: maria })).status, 200, 'autora');
  assert.equal((await api('GET', `/api/topics/${pendente.id}`, { token: moderador })).status, 200, 'moderador');
});

test('detalhe de tópico rejeitado: 404 para quem não é autora nem moderação', async () => {
  assert.equal((await api('GET', `/api/topics/${rejeitado.id}`, { token: ana })).status, 404);
  assert.equal((await api('GET', `/api/topics/${rejeitado.id}`, { token: maria })).status, 200);
  assert.equal((await api('GET', `/api/topics/${rejeitado.id}`, { token: moderador })).status, 200);
});

test('detalhe de tópico travado: visitante é barrado, usuária logada entra', async () => {
  assert.equal((await api('GET', `/api/topics/${travado.id}`)).status, 403);
  assert.equal((await api('GET', `/api/topics/${travado.id}`, { token: ana })).status, 200);
});

test('responder em tópico pendente: só autora e moderação', async () => {
  const deAna = await api('POST', '/api/posts', {
    token: ana,
    body: { topic_id: pendente.id, content: 'Tentativa de resposta.' },
  });
  assert.equal(deAna.status, 403);

  const daAutora = await api('POST', '/api/posts', {
    token: maria,
    body: { topic_id: pendente.id, content: 'Resposta da autora.' },
  });
  assert.equal(daAutora.status, 200);

  const doModerador = await api('POST', '/api/posts', {
    token: moderador,
    body: { topic_id: pendente.id, content: 'Resposta do moderador.' },
  });
  assert.equal(doModerador.status, 200);
});

test('responder em tópico travado: só admin (comportamento atual)', async () => {
  const deAna = await api('POST', '/api/posts', {
    token: ana,
    body: { topic_id: travado.id, content: 'Tentativa em travado.' },
  });
  assert.equal(deAna.status, 403);

  const doAdmin = await api('POST', '/api/posts', {
    token: admin,
    body: { topic_id: travado.id, content: 'Resposta do admin.' },
  });
  assert.equal(doAdmin.status, 200);
});

test('aprovação tira o tópico da fila e o torna público', async () => {
  const novo = (await api('POST', '/api/topics', {
    token: maria,
    body: novoTopico({ image_url: 'https://exemplo.gov.br/aprovar.png' }),
  })).data;
  assert.equal(novo.status, 'pending');

  const aprova = await api('PUT', `/api/admin/topics/${novo.id}/approve`, { token: moderador });
  assert.equal(aprova.status, 200);

  const ids = await idsListados(null);
  assert.ok(ids.has(novo.id), 'após aprovação, o visitante vê o tópico');
});
