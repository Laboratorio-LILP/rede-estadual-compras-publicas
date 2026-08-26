export const CAPACITACAO_PORTAL_URL = 'https://compras.sp.gov.br/agente-publico/capacitacao/';

export const CAPACITACAO_EVENTS = [
  {
    id: 'seminario-planejamento-2026',
    nome: 'Seminário de Planejamento das Contratações',
    data: '2026-02-12',
    horario: '09h00 – 16h00',
    formato: 'Presencial',
    instituicao: 'RECPSP',
    local: 'São Paulo · SP',
    descricao: 'Debates e experiências sobre o planejamento anual e a organização das contratações públicas.',
    accent: '#233254',
  },
  {
    id: 'encontro-gestao-contratual-2026',
    nome: 'Encontro Técnico de Gestão Contratual',
    data: '2026-03-19',
    horario: '09h00 – 12h00',
    formato: 'Online',
    instituicao: 'RECPSP · TCESP',
    local: 'Transmissão online',
    descricao: 'Orientações e boas práticas para acompanhamento, fiscalização e gestão de contratos administrativos.',
    accent: '#034EA2',
  },
  {
    id: 'webinar-lei-14133-2026',
    nome: 'Webinar sobre a Lei nº 14.133/2021',
    data: '2026-05-07',
    horario: '14h00 – 17h00',
    formato: 'Online',
    instituicao: 'EGESP',
    local: 'Transmissão online',
    descricao: 'Atualização sobre procedimentos, responsabilidades e aplicação da Nova Lei de Licitações.',
    accent: '#4297D3',
  },
  {
    id: 'oficina-etp-2026',
    nome: 'Oficina de Elaboração de Estudos Técnicos Preliminares',
    data: '2026-06-18',
    horario: '09h00 – 12h30',
    formato: 'Híbrido',
    instituicao: 'RECPSP',
    local: 'São Paulo · SP e transmissão online',
    descricao: 'Atividade prática para estruturar ETPs consistentes e adequados às necessidades da Administração.',
    accent: '#0B9247',
  },
  {
    id: 'jornada-agentes-2026',
    nome: 'Jornada de Formação de Agentes de Contratação',
    data: '2026-07-16',
    horario: '09h00 – 17h00',
    formato: 'Presencial',
    instituicao: 'EGESP · RECPSP',
    local: 'São Paulo · SP',
    descricao: 'Formação intensiva sobre as atribuições e os desafios da atuação dos agentes de contratação.',
    accent: '#ED1C24',
  },
  {
    id: 'forum-contratacoes-2026',
    nome: 'II Fórum de Contratações Públicas',
    data: '2026-08-14',
    horario: '09h00 – 17h00',
    formato: 'Presencial',
    instituicao: 'RECPSP',
    local: 'São Paulo · SP',
    descricao: 'Encontro para compartilhar experiências, tendências e boas práticas em contratações públicas.',
    accent: '#ED1C24',
  },
  {
    id: 'oficina-linguagem-simples-2026',
    nome: 'Oficina de Linguagem Simples nas Contratações Públicas',
    data: '2026-09-03',
    horario: '14h00 – 17h00',
    formato: 'Online',
    instituicao: 'LILP',
    local: 'Transmissão online',
    descricao: 'Aplicação de técnicas de linguagem simples em editais, comunicações e documentos de contratação.',
    accent: '#034EA2',
  },
  {
    id: 'workshop-ia-compras-2026',
    nome: 'Workshop de IA aplicada às Compras Públicas',
    data: '2026-09-22',
    horario: '09h00 – 12h00',
    formato: 'Híbrido',
    instituicao: 'RECPSP · Prodesp',
    local: 'São Paulo · SP e transmissão online',
    descricao: 'Casos de uso, oportunidades e cuidados na adoção de inteligência artificial em compras públicas.',
    accent: '#233254',
  },
  {
    id: 'seminario-sustentabilidade-2026',
    nome: 'Seminário de Sustentabilidade nas Contratações',
    data: '2026-10-08',
    horario: '09h00 – 17h00',
    formato: 'Presencial',
    instituicao: 'Secretaria de Meio Ambiente',
    local: 'São Paulo · SP',
    descricao: 'Discussões sobre critérios ESG, ciclo de vida e práticas sustentáveis nas contratações.',
    accent: '#0B9247',
  },
  {
    id: 'encontro-rede-2026',
    nome: 'Encontro da Rede Estadual de Compras Públicas',
    data: '2026-10-29',
    horario: '09h00 – 16h00',
    formato: 'Híbrido',
    instituicao: 'RECPSP',
    local: 'São Paulo · SP e transmissão online',
    descricao: 'Integração dos participantes da Rede e apresentação de iniciativas desenvolvidas ao longo do ano.',
    accent: '#4297D3',
  },
];

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function splitCapacitacaoEvents(referenceDate = new Date()) {
  const today = localDateKey(referenceDate);
  const sorted = [...CAPACITACAO_EVENTS].sort((a, b) => a.data.localeCompare(b.data));

  return {
    upcoming: sorted.filter(evento => evento.data >= today),
    past: sorted.filter(evento => evento.data < today).reverse(),
  };
}

export function getEventDateParts(date) {
  const parsed = new Date(`${date}T12:00:00`);
  return {
    dia: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(parsed),
    mes: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(parsed)
      .replace('.', '')
      .toUpperCase(),
  };
}

export function formatEventDate(date) {
  const parsed = new Date(`${date}T12:00:00`);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
