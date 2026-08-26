// Infraestrutura mínima dos testes de API (node:test, sem dependência nova).
//
// O ambiente precisa ser preparado ANTES do require de ../index.js, porque o
// servidor lê as variáveis e abre o banco no momento do carregamento:
// - DB_PATH aponta para um arquivo temporário único por processo — o seed roda
//   limpo e os testes nunca tocam server/forum.db nem o volume do container;
// - SKIP_PLAYLIST_IMPORT=1 evita a chamada de rede ao YouTube no boot (a
//   tabela resources começa vazia num banco de teste);
// - JWT_SECRET fixo de teste.
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.DB_PATH = path.join(os.tmpdir(), `recpsp-test-${process.pid}-${Date.now()}.db`);
process.env.SKIP_PLAYLIST_IMPORT = '1';
process.env.JWT_SECRET = 'segredo-apenas-de-teste';

// O ambiente de quem roda não pode decidir quem o seed cria. Estas quatro
// variáveis mudam a existência e a senha das personas de SEED (ver
// resolveAdminPassword e o bloco semearDemo em server/index.js): com
// NODE_ENV=production exportado no shell, o admin nasceria com senha sorteada
// e os cinco usuários de exemplo nem existiriam — as quatro suítes falhariam
// no before() com um "login falhou: 401" que não aponta a causa.
process.env.NODE_ENV = 'test';
process.env.SEED_DEMO_DATA = '1';
delete process.env.ADMIN_PASSWORD;
delete process.env.DEMO_PASSWORD;
// req.ip previsível: o limitador de autenticação conta por IP, e um
// TRUST_PROXY herdado do shell mudaria essa contagem. Apagar (em vez de fixar)
// deixa valer o padrão do servidor, que é sabidamente válido — `trust proxy`
// recebe uma lista de IPs, e um valor inventado aqui aborta o boot.
delete process.env.TRUST_PROXY;

const app = require('../index.js');

let server = null;
let baseUrl = null;

// Sobe o app numa porta efêmera (127.0.0.1). Cada arquivo de teste roda em
// processo próprio no node:test, então cada um tem servidor e banco próprios.
function start() {
  if (server) return Promise.resolve(baseUrl);
  return new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve(baseUrl);
    });
    server.on('error', reject);
  });
}

function stop() {
  if (server) server.close();
  server = null;
  for (const sufixo of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(process.env.DB_PATH + sufixo); } catch {}
  }
}

// Requisição à API. Devolve { status, data } com o corpo já decodificado.
async function api(method, route, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(baseUrl + route, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

// Login com cache por e-mail: o limitador de autenticação permite 20 tentativas
// por IP a cada 15 minutos, e todos os testes de um arquivo saem do mesmo IP.
const tokenCache = new Map();
async function login(email, password) {
  if (tokenCache.has(email)) return tokenCache.get(email);
  const res = await api('POST', '/api/auth/login', { body: { email, password } });
  if (res.status !== 200) {
    throw new Error(`login falhou para ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  tokenCache.set(email, res.data.token);
  return res.data.token;
}

// Personas criadas pelo seed (server/index.js, seção SEED).
const SEED = {
  admin: { email: 'admin@forum.com', password: 'admin123' },
  maria: { email: 'maria@teste.com', password: 'teste123' },
  joao: { email: 'joao@teste.com', password: 'teste123' },
  ana: { email: 'ana@teste.com', password: 'teste123' },
};

module.exports = { start, stop, api, login, SEED };
