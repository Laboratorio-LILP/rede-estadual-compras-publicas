// Exclusão em cascata — tópico, resposta e usuário.
//
// Contexto: as chaves estrangeiras foram declaradas sem ON DELETE e o boot liga
// foreign_keys = ON, então cada rotina de exclusão precisa limpar as
// dependências à mão (ver docs/ARCHITECTURE.md, seção 7). Estes testes cobrem
// o roteiro que motivou a suíte: criar tópico → responder → curtir a resposta
// → excluir.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, login, SEED } = require('./helpers');

let maria; let joao; let admin;

before(async () => {
  await start();
  maria = await login(SEED.maria.email, SEED.maria.password);
  joao = await login(SEED.joao.email, SEED.joao.password);
  admin = await login(SEED.admin.email, SEED.admin.password);
});

after(() => stop());

async function criaTopicoComRespostaCurtida() {
  const topico = await api('POST', '/api/topics', {
    token: maria,
    body: { title: 'Tópico de teste de exclusão', category_id: 1, content: 'Corpo do tópico.' },
  });
  assert.equal(topico.status, 200, `criação do tópico devolveu ${topico.status}`);

  const resposta = await api('POST', '/api/posts', {
    token: joao,
    body: { topic_id: topico.data.id, content: 'Resposta que vai receber curtida.' },
  });
  assert.equal(resposta.status, 200, `criação da resposta devolveu ${resposta.status}`);

  const curtida = await api('POST', `/api/posts/${resposta.data.id}/like`, { token: maria });
  assert.equal(curtida.status, 200, `curtida devolveu ${curtida.status}`);

  return { topicoId: topico.data.id, respostaId: resposta.data.id };
}

test('excluir tópico cujas respostas têm curtidas apaga o tópico por inteiro', async () => {
  const { topicoId } = await criaTopicoComRespostaCurtida();

  const del = await api('DELETE', `/api/topics/${topicoId}`, { token: maria });
  assert.equal(del.status, 200, `exclusão devolveu ${del.status}: ${JSON.stringify(del.data)}`);

  const depois = await api('GET', `/api/topics/${topicoId}`);
  assert.equal(depois.status, 404, 'o tópico deveria ter sumido');
});

test('excluir resposta com curtidas e descurtidas apaga a resposta', async () => {
  const { topicoId, respostaId } = await criaTopicoComRespostaCurtida();

  const descurtida = await api('POST', `/api/posts/${respostaId}/dislike`, { token: joao });
  assert.equal(descurtida.status, 200);

  const del = await api('DELETE', `/api/posts/${respostaId}`, { token: joao });
  assert.equal(del.status, 200, `exclusão da resposta devolveu ${del.status}: ${JSON.stringify(del.data)}`);

  const depois = await api('GET', `/api/topics/${topicoId}`);
  assert.equal(depois.status, 200);
  assert.ok(!depois.data.posts.some((p) => p.id === respostaId), 'a resposta deveria ter sumido');
});

test('excluir usuário remove os tópicos, respostas e curtidas dele (rota já transacional)', async () => {
  const novo = await api('POST', '/api/auth/register', {
    body: {
      username: 'UsuarioDescartavel',
      email: 'descartavel@teste.com',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(novo.status, 200, `registro devolveu ${novo.status}: ${JSON.stringify(novo.data)}`);
  const tokenNovo = novo.data.token;
  const idNovo = novo.data.user.id;

  const topico = await api('POST', '/api/topics', {
    token: tokenNovo,
    body: { title: 'Tópico de usuário descartável', category_id: 1, content: 'Corpo.' },
  });
  assert.equal(topico.status, 200);
  const resposta = await api('POST', '/api/posts', {
    token: joao,
    body: { topic_id: topico.data.id, content: 'Resposta de outro usuário.' },
  });
  assert.equal(resposta.status, 200);
  const curtida = await api('POST', `/api/posts/${resposta.data.id}/like`, { token: tokenNovo });
  assert.equal(curtida.status, 200);

  const del = await api('DELETE', `/api/admin/users/${idNovo}`, { token: admin });
  assert.equal(del.status, 200, `exclusão do usuário devolveu ${del.status}: ${JSON.stringify(del.data)}`);

  const perfil = await api('GET', `/api/users/${idNovo}`);
  assert.equal(perfil.status, 404, 'o usuário deveria ter sumido');
  const topicoDepois = await api('GET', `/api/topics/${topico.data.id}`);
  assert.equal(topicoDepois.status, 404, 'os tópicos do usuário deveriam ter sumido');
});
