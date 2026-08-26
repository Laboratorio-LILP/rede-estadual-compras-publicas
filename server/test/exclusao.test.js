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

// Política de exclusão de conta (decidida pela frente em 26/08/2026):
// o conteúdo público PERMANECE, sem autoria; o dado pessoal é eliminado.
//
// Antes a rota apagava os tópicos da conta e, junto, TODAS as respostas de
// terceiros neles — excluir um servidor apagava a contribuição dos outros
// órgãos. Este teste guarda a política nova nas duas direções: tópico da
// conta e resposta da conta em tópico alheio.
const NOME_ANONIMO = 'Usuário removido';

test('excluir usuário anonimiza o conteúdo público e apaga o dado pessoal', async () => {
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

  const usuarios = await api('GET', '/api/admin/users', { token: admin });
  const idJoao = usuarios.data.find((u) => u.email === SEED.joao.email).id;

  // (1) Tópico DA CONTA, com resposta de terceiro.
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

  // (2) Resposta DA CONTA em tópico alheio, curtida por terceiro. Este é o
  //     caso que violava a FK: a limpeza antiga não alcançava essa curtida.
  const topicoAlheio = await api('POST', '/api/topics', {
    token: joao,
    body: { title: 'Tópico de terceiro', category_id: 1, content: 'Corpo.' },
  });
  assert.equal(topicoAlheio.status, 200);
  const respostaDaConta = await api('POST', '/api/posts', {
    token: tokenNovo,
    body: { topic_id: topicoAlheio.data.id, content: 'Resposta em tópico alheio.' },
  });
  assert.equal(respostaDaConta.status, 200);
  assert.equal((await api('POST', `/api/posts/${respostaDaConta.data.id}/like`, { token: joao })).status, 200);

  // (3) Dado pessoal: mensagem direta.
  const mensagem = await api('POST', '/api/messages', {
    token: tokenNovo,
    body: { receiver_id: idJoao, content: 'Mensagem privada.' },
  });
  assert.equal(mensagem.status, 200);

  const del = await api('DELETE', `/api/admin/users/${idNovo}`, { token: admin });
  assert.equal(del.status, 200, `exclusão do usuário devolveu ${del.status}: ${JSON.stringify(del.data)}`);

  // --- a conta some ---
  assert.equal((await api('GET', `/api/users/${idNovo}`)).status, 404, 'o perfil deveria ter sumido');
  const loginMorto = await api('POST', '/api/auth/login', {
    body: { email: 'descartavel@teste.com', password: 'senha123' },
  });
  assert.equal(loginMorto.status, 401, 'a conta removida não deveria mais autenticar');

  // --- o conteúdo público fica, sem autoria ---
  const topicoDepois = await api('GET', `/api/topics/${topico.data.id}`);
  assert.equal(topicoDepois.status, 200, 'o tópico deveria permanecer');
  assert.equal(topicoDepois.data.topic.username, NOME_ANONIMO, 'a autoria do tópico deveria estar anonimizada');
  assert.ok(
    topicoDepois.data.posts.some((p) => p.content === 'Resposta de outro usuário.'),
    'a resposta de terceiro deveria ter sido preservada',
  );

  const alheioDepois = await api('GET', `/api/topics/${topicoAlheio.data.id}`);
  assert.equal(alheioDepois.status, 200);
  const respostaDepois = alheioDepois.data.posts.find((p) => p.id === respostaDaConta.data.id);
  assert.ok(respostaDepois, 'a resposta da conta em tópico alheio deveria ter sido preservada');
  assert.equal(respostaDepois.username, NOME_ANONIMO, 'a autoria da resposta deveria estar anonimizada');

  // --- o dado pessoal sai ---
  const conversas = await api('GET', '/api/messages', { token: joao });
  assert.equal(conversas.status, 200);
  assert.ok(
    !conversas.data.some((c) => c.last_message === 'Mensagem privada.'),
    'a mensagem direta deveria ter sido apagada',
  );
});

test('a conta sentinela que guarda o histórico não pode ser excluída', async () => {
  // A sentinela nasce sob demanda, na primeira exclusão de conta
  // (obterUsuarioRemovido). Este teste a provoca em vez de herdá-la do teste
  // anterior — senão quebra ao filtrar por nome ou ao mover o caso de arquivo.
  const efemero = await api('POST', '/api/auth/register', {
    body: {
      username: 'ContaEfemeraSentinela',
      email: 'efemera-sentinela@teste.com',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(efemero.status, 200);
  assert.equal((await api('DELETE', `/api/admin/users/${efemero.data.user.id}`, { token: admin })).status, 200);

  const usuarios = await api('GET', '/api/admin/users', { token: admin });
  const sentinela = usuarios.data.find((u) => u.email === 'usuario-removido@recpsp.invalid');
  assert.ok(sentinela, 'a sentinela deveria ter sido criada pela exclusão acima');

  const del = await api('DELETE', `/api/admin/users/${sentinela.id}`, { token: admin });
  assert.equal(del.status, 400, 'excluir a sentinela levaria junto o histórico que ela preserva');
});

test('a identidade da conta sentinela é reservada no cadastro e na edição de perfil', async () => {
  // Sem a reserva no perfil, bastava criar conta comum e trocar o e-mail para
  // herdar, na primeira exclusão, o conteúdo de todas as contas removidas.
  const noCadastro = await api('POST', '/api/auth/register', {
    body: {
      username: 'Tentativa',
      email: 'usuario-removido@recpsp.invalid',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(noCadastro.status, 400, 'o cadastro deveria recusar o e-mail da sentinela');

  const comum = await api('POST', '/api/auth/register', {
    body: {
      username: 'ContaQueTentaSequestrar',
      email: 'sequestro@teste.com',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(comum.status, 200);

  const porEmail = await api('PUT', '/api/auth/profile', {
    token: comum.data.token,
    body: { email: 'usuario-removido@recpsp.invalid' },
  });
  assert.equal(porEmail.status, 400, 'a edição de perfil deveria recusar o e-mail da sentinela');

  const porNome = await api('PUT', '/api/auth/profile', {
    token: comum.data.token,
    body: { username: 'Usuário removido' },
  });
  assert.equal(porNome.status, 400, 'a edição de perfil deveria recusar o nome da sentinela');
});
