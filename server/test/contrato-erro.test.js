// Contrato de erro da API e validação de perfil.
//
// Cobre o que a rodada de dívida técnica (26/08/2026) mudou e ninguém
// exercitava: rota de API inexistente respondendo JSON em vez do HTML do SPA,
// origem recusada pelo CORS virando 403 em vez de 500, tema em uso recusado
// com 409 em vez de 500, e a validação de PUT /api/auth/profile — que antes
// aceitava e-mail inválido e descartava senha curta em silêncio.
//
// Nenhum destes casos existia na suíte: eram exatamente os comportamentos que
// o front passou a assumir sem rede de proteção no servidor.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, login, SEED } = require('./helpers');

let baseUrl;
let admin;

before(async () => {
  baseUrl = await start();
  admin = await login(SEED.admin.email, SEED.admin.password);
});

after(() => stop());

test('rota de API inexistente responde 404 em JSON, não o HTML do SPA', async () => {
  const res = await fetch(`${baseUrl}/api/rota-que-nao-existe`);
  assert.equal(res.status, 404);
  assert.match(
    res.headers.get('content-type') || '',
    /application\/json/,
    'sem isto o cliente estoura no res.json() com um erro de sintaxe sem relação com a causa',
  );
  const corpo = await res.json();
  assert.ok(corpo.error, 'a resposta deveria trazer o campo error');
});

test('origem não permitida é recusada com 403, não com 500', async () => {
  const res = await fetch(`${baseUrl}/api/categories`, {
    headers: { Origin: 'https://origem-nao-permitida.example' },
  });
  assert.equal(res.status, 403, 'recusa de origem é decisão de política, não falha do servidor');
  const corpo = await res.json();
  assert.match(corpo.error, /[Oo]rigem/, 'a mensagem deveria dizer que o problema é a origem');
});

test('origem permitida continua passando', async () => {
  // Guarda o outro lado: a checagem acima não pode ter fechado o CORS legítimo.
  const res = await fetch(`${baseUrl}/api/categories`, {
    headers: { Origin: 'http://localhost:3000' },
  });
  assert.equal(res.status, 200);
});

test('excluir tema em uso devolve 409 explicando, e o tema continua lá', async () => {
  const res = await api('DELETE', '/api/categories/1', { token: admin });
  assert.equal(res.status, 409, 'antes estourava a FK e virava "Erro interno do servidor"');
  assert.match(res.data.error, /tópico/i, 'a mensagem deveria dizer quantos tópicos prendem o tema');

  const categorias = await api('GET', '/api/categories');
  assert.ok(categorias.data.some((c) => c.id === 1), 'o tema não deveria ter sido removido');
});

test('perfil recusa e-mail sem formato válido', async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: {
      username: 'PerfilEmailInvalido',
      email: 'perfil-email@teste.com',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(reg.status, 200);

  const res = await api('PUT', '/api/auth/profile', {
    token: reg.data.token,
    body: { email: 'isto-nao-e-email' },
  });
  assert.equal(res.status, 400, 'o cadastro valida o formato; a edição de perfil não validava nada');

  const depois = await api('GET', '/api/auth/me', { token: reg.data.token });
  assert.equal(depois.data.email, 'perfil-email@teste.com', 'o e-mail não deveria ter mudado');
});

test('perfil recusa senha curta em vez de descartá-la em silêncio', async () => {
  const reg = await api('POST', '/api/auth/register', {
    body: {
      username: 'PerfilSenhaCurta',
      email: 'perfil-senha@teste.com',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(reg.status, 200);

  // O defeito antigo: respondia 200, não trocava a senha, e o usuário saía
  // acreditando que tinha trocado.
  const res = await api('PUT', '/api/auth/profile', {
    token: reg.data.token,
    body: { password: '123' },
  });
  assert.equal(res.status, 400);
  assert.match(res.data.error, /pelo menos 6/i);

  const aindaVale = await api('POST', '/api/auth/login', {
    body: { email: 'perfil-senha@teste.com', password: 'senha123' },
  });
  assert.equal(aindaVale.status, 200, 'a senha original deveria continuar valendo');
});

test('perfil aceita uma alteração legítima', async () => {
  // Guarda o outro lado: as validações novas não podem ter travado o caminho
  // normal de edição.
  const reg = await api('POST', '/api/auth/register', {
    body: {
      username: 'PerfilLegitimo',
      email: 'perfil-ok@teste.com',
      password: 'senha123',
      accept_terms: true,
    },
  });
  assert.equal(reg.status, 200);

  const res = await api('PUT', '/api/auth/profile', {
    token: reg.data.token,
    body: { organization: 'Secretaria de Gestão', location: 'SP', bio: 'Agente de contratação.' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.organization, 'Secretaria de Gestão');
  assert.equal(res.data.location, 'SP');
});

test('importar playlist sem YOUTUBE_API_KEY responde 503, sem chamar a API externa', async () => {
  // O helper não define YOUTUBE_API_KEY. Antes o servidor chamava o Google sem
  // credencial e repassava a mensagem crua do erro ao cliente.
  const res = await api('POST', '/api/admin/resources/import-playlist', {
    token: admin,
    body: { playlist_id: 'PLqualquer' },
  });
  assert.equal(res.status, 503);
  assert.match(res.data.error, /YOUTUBE_API_KEY/, 'a mensagem deveria apontar a configuração ausente');
});
