import { useState, useRef, useEffect, Children } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';

const PORTAL_OFICIAL = 'https://compras.sp.gov.br/agente-publico/capacitacao/';

const PROGRESSO_GERAL = 67; // demo estático
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;
const RING_OFFSET = RING_C * (1 - PROGRESSO_GERAL / 100);

const jornadaStats = [
  {
    valor: '12',
    label: 'Cursos concluídos',
    color: '#034EA2',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    ),
  },
  {
    valor: '3',
    label: 'Trilhas concluídas',
    color: '#0B9247',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    ),
  },
  {
    valor: '48h',
    label: 'Horas de capacitação',
    color: '#233254',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
];

const emAndamento = [
  { titulo: 'Plano de Contratações Anual (PCA)', tema: 'Planejamento', progresso: 72, accent: '#034EA2' },
  { titulo: 'Gestão Contratual', tema: 'Gestão de Contratos', progresso: 45, accent: '#233254' },
];

const cursos = [
  { titulo: 'Lei nº 14.133/2021', tema: 'Legislação', carga: '40h', modalidade: 'EAD', instituicao: 'ENAP', accent: '#FF161F' },
  { titulo: 'Plano de Contratações Anual (PCA)', tema: 'Planejamento', carga: '20h', modalidade: 'EAD', instituicao: 'Escola Virtual.Gov', accent: '#034EA2' },
  { titulo: 'Estudo Técnico Preliminar', tema: 'Planejamento', carga: '15h', modalidade: 'EAD', instituicao: 'ENAP', accent: '#0B9247' },
  { titulo: 'Termo de Referência', tema: 'Instrução Processual', carga: '20h', modalidade: 'EAD', instituicao: 'Escola Virtual.Gov', accent: '#233254' },
  { titulo: 'Pesquisa de Preços', tema: 'Instrução Processual', carga: '12h', modalidade: 'EAD', instituicao: 'ENAP', accent: '#4297D3' },
  { titulo: 'Gestão Contratual', tema: 'Gestão de Contratos', carga: '30h', modalidade: 'Híbrido', instituicao: 'TCE-SP', accent: '#94AA5A' },
  { titulo: 'Sanções Administrativas', tema: 'Gestão de Contratos', carga: '16h', modalidade: 'EAD', instituicao: 'ENAP', accent: '#FF161F' },
  { titulo: 'Compras Sustentáveis', tema: 'Sustentabilidade', carga: '12h', modalidade: 'EAD', instituicao: 'Escola Virtual.Gov', accent: '#0B9247' },
  { titulo: 'Inteligência Artificial aplicada às Contratações', tema: 'Inovação', carga: '8h', modalidade: 'Online ao vivo', instituicao: 'Prodesp', accent: '#034EA2' },
  { titulo: 'Linguagem Simples', tema: 'Comunicação', carga: '6h', modalidade: 'EAD', instituicao: 'Escola Virtual.Gov', accent: '#4297D3' },
];

const trilhas = [
  {
    id: 'agente-contratacao',
    titulo: 'Agente de Contratação',
    descricao: 'Formação completa para conduzir todas as etapas do processo de contratação sob a Nova Lei de Licitações.',
    nivel: 'Intermediário',
    carga: '90h',
    accent: '#FF161F',
    popular: true,
    jornada: [
      'Fundamentos da Lei nº 14.133/2021',
      'Planejamento da contratação',
      'Estudo Técnico Preliminar',
      'Termo de Referência',
      'Pesquisa de Preços',
      'Gestão de Riscos',
      'Seleção do fornecedor',
      'Gestão e fiscalização contratual',
    ],
  },
  {
    id: 'pregoeiro',
    titulo: 'Pregoeiro',
    descricao: 'Domine a condução do pregão eletrônico, do edital à adjudicação, com segurança jurídica.',
    nivel: 'Intermediário',
    carga: '70h',
    accent: '#034EA2',
    jornada: [
      'Fundamentos da Lei nº 14.133/2021',
      'Modalidade Pregão na prática',
      'Elaboração do edital',
      'Condução da sessão pública (PNCP)',
      'Julgamento e classificação de propostas',
      'Habilitação e diligências',
      'Recursos, adjudicação e homologação',
    ],
  },
  {
    id: 'equipe-planejamento',
    titulo: 'Equipe de Planejamento',
    descricao: 'Estruture a fase de planejamento das contratações, do PCA ao Termo de Referência.',
    nivel: 'Introdutório',
    carga: '55h',
    accent: '#0B9247',
    jornada: [
      'Plano de Contratações Anual (PCA)',
      'Levantamento de necessidades',
      'Estudo Técnico Preliminar',
      'Mapa de Riscos',
      'Termo de Referência',
      'Pesquisa de Preços',
    ],
  },
  {
    id: 'gestor-contratos',
    titulo: 'Gestor de Contratos',
    descricao: 'Coordene a execução contratual, alterações, reequilíbrio e encerramento com governança.',
    nivel: 'Avançado',
    carga: '65h',
    accent: '#233254',
    jornada: [
      'Fundamentos da gestão contratual',
      'Acompanhamento da execução',
      'Alterações contratuais e aditivos',
      'Reequilíbrio econômico-financeiro',
      'Sanções administrativas',
      'Encerramento e prestação de contas',
    ],
  },
  {
    id: 'fiscal-contratos',
    titulo: 'Fiscal de Contratos',
    descricao: 'Atue na fiscalização técnica e administrativa da execução dos contratos administrativos.',
    nivel: 'Intermediário',
    carga: '50h',
    accent: '#4297D3',
    jornada: [
      'Papel do fiscal de contratos',
      'Fiscalização técnica e administrativa',
      'Registro de ocorrências',
      'Medição e ateste',
      'Gestão de Riscos na execução',
      'Aplicação de penalidades',
    ],
  },
  {
    id: 'servidor-municipal',
    titulo: 'Servidor Municipal',
    descricao: 'Primeiros passos nas contratações públicas para servidores de municípios.',
    nivel: 'Introdutório',
    carga: '40h',
    accent: '#94AA5A',
    jornada: [
      'Introdução às contratações públicas',
      'Fundamentos da Lei nº 14.133/2021',
      'Governança nas contratações',
      'Linguagem Simples no serviço público',
      'Ética e integridade',
    ],
  },
  {
    id: 'gestor-publico',
    titulo: 'Gestor Público',
    descricao: 'Visão estratégica de governança, riscos e resultados nas contratações públicas.',
    nivel: 'Avançado',
    carga: '60h',
    accent: '#FF161F',
    jornada: [
      'Governança e liderança nas contratações',
      'Planejamento estratégico de compras',
      'Gestão de riscos institucional',
      'Controle e transparência',
      'Indicadores e gestão por resultados',
      'Inovação e IA nas contratações',
    ],
  },
  {
    id: 'compras-sustentaveis',
    titulo: 'Compras Sustentáveis',
    descricao: 'Incorpore critérios ESG e sustentabilidade ao ciclo das contratações públicas.',
    nivel: 'Intermediário',
    carga: '35h',
    accent: '#0B9247',
    jornada: [
      'Fundamentos das compras sustentáveis',
      'Critérios ESG em licitações',
      'Especificações e rótulos ambientais',
      'Ciclo de vida e economia circular',
      'Boas práticas e casos de sucesso',
    ],
  },
];

const eventos = [
  {
    nome: 'II Fórum de Contratações Públicas',
    formato: 'Presencial',
    dia: '14', mes: 'AGO', horario: '09h00 – 17h00',
    instituicao: 'RECPSP',
    accent: '#FF161F',
  },
  {
    nome: 'Oficina de Linguagem Simples nas Contratações Públicas',
    formato: 'Online',
    dia: '03', mes: 'SET', horario: '14h00 – 17h00',
    instituicao: 'LILP',
    accent: '#034EA2',
  },
  {
    nome: 'Workshop de IA aplicada às Compras Públicas',
    formato: 'Híbrido',
    dia: '22', mes: 'SET', horario: '09h00 – 12h00',
    instituicao: 'RECPSP · Prodesp',
    accent: '#233254',
  },
  {
    nome: 'Seminário de Sustentabilidade nas Contratações',
    formato: 'Presencial',
    dia: '08', mes: 'OUT', horario: '09h00 – 17h00',
    instituicao: 'Secretaria de Meio Ambiente',
    accent: '#0B9247',
  },
  {
    nome: 'Encontro da Rede Estadual de Compras Públicas',
    formato: 'Híbrido',
    dia: '29', mes: 'OUT', horario: '09h00 – 16h00',
    instituicao: 'RECPSP',
    accent: '#4297D3',
  },
];

const materiais = [
  { tipo: 'Guia', titulo: 'Guia prático da Lei nº 14.133/2021', tema: 'Legislação', descricao: 'Referência sobre os principais dispositivos e mudanças da Nova Lei de Licitações.', accent: '#FF161F' },
  { tipo: 'Checklist', titulo: 'Checklist para Estudo Técnico Preliminar', tema: 'Planejamento', descricao: 'Passo a passo para elaborar um ETP consistente e bem fundamentado.', accent: '#034EA2' },
  { tipo: 'Modelo', titulo: 'Modelo de Termo de Referência', tema: 'Instrução Processual', descricao: 'Modelo editável para estruturar o Termo de Referência da contratação.', accent: '#0B9247' },
  { tipo: 'Cartilha', titulo: 'Cartilha de Pesquisa de Preços', tema: 'Instrução Processual', descricao: 'Orientações práticas para conduzir a pesquisa de preços com segurança.', accent: '#4297D3' },
  { tipo: 'Guia', titulo: 'Guia de Gestão e Fiscalização Contratual', tema: 'Gestão de Contratos', descricao: 'Boas práticas de acompanhamento, fiscalização e aplicação de sanções.', accent: '#233254' },
  { tipo: 'Manual', titulo: 'Manual de Compras Sustentáveis', tema: 'Sustentabilidade', descricao: 'Critérios e exemplos para inserir sustentabilidade nas compras públicas.', accent: '#0B9247' },
  { tipo: 'Apresentação', titulo: 'Apresentação sobre PCA', tema: 'Planejamento', descricao: 'Slides sobre a elaboração e o acompanhamento do Plano de Contratações Anual.', accent: '#94AA5A' },
  { tipo: 'Webinar', titulo: 'Webinar sobre IA aplicada às Contratações', tema: 'Inovação', descricao: 'Gravação com casos de uso de IA nas contratações e os cuidados necessários.', accent: '#034EA2' },
];

const instituicoes = [
  { sigla: 'SGGD', nome: 'Secretaria de Gestão e Governo Digital', descricao: 'Coordena a política de compras e a transformação digital do Estado.', accent: '#FF161F' },
  { sigla: 'LILP', nome: 'Laboratório de Inovação em Licitações Públicas', descricao: 'Pesquisa e prototipa soluções para modernizar as contratações públicas.', accent: '#034EA2' },
  { sigla: 'USP', nome: 'Universidade de São Paulo', descricao: 'Produção acadêmica e formação de alto nível em administração pública.', accent: '#0B9247' },
  { sigla: 'UNESP', nome: 'Universidade Estadual Paulista', descricao: 'Pesquisa aplicada e extensão universitária em gestão pública.', accent: '#233254' },
  { sigla: 'UNICAMP', nome: 'Universidade Estadual de Campinas', descricao: 'Estudos e capacitação em inovação e políticas públicas.', accent: '#4297D3' },
  { sigla: 'EGESP', nome: 'Escola de Governo do Estado de São Paulo', descricao: 'Capacitação e desenvolvimento de servidores públicos estaduais.', accent: '#94AA5A' },
  { sigla: 'ENAP', nome: 'Escola Nacional de Administração Pública', descricao: 'Cursos e trilhas de referência nacional em contratações públicas.', accent: '#FF161F' },
  { sigla: 'TCESP', nome: 'Tribunal de Contas do Estado de São Paulo', descricao: 'Orientação e controle externo das contratações estaduais.', accent: '#034EA2' },
  { sigla: 'PGE/SP', nome: 'Procuradoria Geral do Estado de São Paulo', descricao: 'Assessoria jurídica e segurança normativa nas contratações.', accent: '#233254' },
];

const RECOMENDACOES = {
  fiscal: {
    titulo: 'Fiscal de Contratos',
    trilhaId: 'fiscal-contratos',
    accent: '#4297D3',
    motivo: 'Você mencionou atuação como fiscal — esta trilha foca na fiscalização técnica e administrativa da execução contratual.',
    cursos: ['Papel do fiscal de contratos', 'Fiscalização técnica e administrativa', 'Registro de ocorrências e medição', 'Aplicação de penalidades'],
  },
  agente: {
    titulo: 'Agente de Contratação',
    trilhaId: 'agente-contratacao',
    accent: '#FF161F',
    motivo: 'Identificamos o perfil de agente de contratação — a trilha cobre todo o processo sob a Lei nº 14.133/2021.',
    cursos: ['Fundamentos da Lei nº 14.133/2021', 'Planejamento da contratação', 'Termo de Referência', 'Seleção do fornecedor'],
  },
  pregoeiro: {
    titulo: 'Pregoeiro',
    trilhaId: 'pregoeiro',
    accent: '#034EA2',
    motivo: 'Você citou o pregão — esta trilha prepara para conduzir a modalidade do edital à adjudicação.',
    cursos: ['Modalidade Pregão na prática', 'Elaboração do edital', 'Julgamento de propostas', 'Recursos e adjudicação'],
  },
  sustentabilidade: {
    titulo: 'Compras Sustentáveis',
    trilhaId: 'compras-sustentaveis',
    accent: '#0B9247',
    motivo: 'Seu interesse em sustentabilidade se conecta com os critérios ESG aplicados às contratações.',
    cursos: ['Fundamentos das compras sustentáveis', 'Critérios ESG em licitações', 'Especificações e rótulos ambientais', 'Economia circular'],
  },
  ia: {
    titulo: 'Inteligência Artificial aplicada às Compras Públicas',
    trilhaId: null,
    accent: '#034EA2',
    motivo: 'Você demonstrou interesse em inteligência artificial — reunimos conteúdos sobre IA nas contratações.',
    cursos: ['IA aplicada às contratações', 'Automação de processos de compra', 'Ética e governança de dados', 'Casos de uso no setor público'],
  },
  planejamento: {
    titulo: 'Equipe de Planejamento',
    trilhaId: 'equipe-planejamento',
    accent: '#0B9247',
    motivo: 'Você citou planejamento/PCA — esta trilha estrutura toda a fase de planejamento das contratações.',
    cursos: ['Plano de Contratações Anual (PCA)', 'Levantamento de necessidades', 'Estudo Técnico Preliminar', 'Pesquisa de Preços'],
  },
  municipal: {
    titulo: 'Servidor Municipal',
    trilhaId: 'servidor-municipal',
    accent: '#94AA5A',
    motivo: 'Para o contexto municipal, indicamos uma trilha introdutória às contratações públicas.',
    cursos: ['Introdução às contratações públicas', 'Fundamentos da Lei nº 14.133/2021', 'Governança nas contratações', 'Linguagem Simples'],
  },
  gestor: {
    titulo: 'Gestor Público',
    trilhaId: 'gestor-publico',
    accent: '#233254',
    motivo: 'Não identificamos um perfil específico, então sugerimos uma visão estratégica e abrangente das contratações.',
    cursos: ['Governança e liderança nas contratações', 'Planejamento estratégico de compras', 'Gestão de riscos institucional', 'Indicadores e resultados'],
  },
};

function recomendar(texto) {
  const t = (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const tokens = t.split(/[^a-z0-9]+/).filter(Boolean);
  if (t.includes('fiscal')) return RECOMENDACOES.fiscal;
  if (t.includes('agente')) return RECOMENDACOES.agente;
  if (t.includes('pregoeiro') || t.includes('pregao')) return RECOMENDACOES.pregoeiro;
  if (t.includes('sustentab')) return RECOMENDACOES.sustentabilidade;
  if (t.includes('inteligencia artificial') || t.includes('inteligencia') || tokens.includes('ia')) return RECOMENDACOES.ia;
  if (t.includes('pca') || t.includes('planejamento')) return RECOMENDACOES.planejamento;
  if (t.includes('municip')) return RECOMENDACOES.municipal;
  return RECOMENDACOES.gestor;
}

function Icon({ children, className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function Carousel({ children, itemClassName }) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const page = (dir) => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Instant assignment always scrolls; CSS `scroll-behavior: smooth`
    // (via motion-safe:scroll-smooth) animates it in browsers that support it.
    el.scrollLeft = Math.max(0, Math.min(el.scrollLeft + dir * el.clientWidth * 0.9, max));
  };

  const arrowBase =
    'hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-card text-gray-600 transition hover:text-[#034EA2] hover:border-[#034EA2] disabled:opacity-0 disabled:pointer-events-none';

  return (
    <div className="relative">
      <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="Ver anteriores" className={`${arrowBase} -left-3`}>
        <Icon className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></Icon>
      </button>
      <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="Ver próximos" className={`${arrowBase} -right-3`}>
        <Icon className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></Icon>
      </button>
      <div ref={ref} className="flex gap-5 overflow-x-auto snap-x snap-mandatory motion-safe:scroll-smooth no-scrollbar py-3">
        {Children.map(children, (child) => (
          <div className={`snap-start shrink-0 ${itemClassName}`}>{child}</div>
        ))}
      </div>
    </div>
  );
}

function CourseCard({ curso, index }) {
  return (
    <div
      className="gov-card gov-reveal h-full bg-white border border-gray-200 flex flex-col"
      style={{ borderTop: `3px solid ${curso.accent}`, borderRadius: '8px', animationDelay: `${index * 50}ms` }}
    >
      <div className="p-5 flex flex-col flex-1">
        <span
          className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full mb-3"
          style={{ backgroundColor: `${curso.accent}14`, color: curso.accent }}
        >
          {curso.tema}
        </span>

        <h3 className="font-montserrat text-base font-bold text-gray-900 leading-snug mb-4">
          {curso.titulo}
        </h3>

        <div className="mt-auto space-y-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Icon>
            <span>{curso.carga} de carga horária</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </Icon>
            <span>{curso.modalidade}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </Icon>
            <span>{curso.instituicao}</span>
          </div>
        </div>
      </div>

      <a
        href={PORTAL_OFICIAL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm font-semibold transition-colors hover:bg-gray-50"
        style={{ color: curso.accent }}
      >
        Ver curso
        <Icon className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </Icon>
      </a>
    </div>
  );
}

const NIVEL_COLOR = {
  'Introdutório': '#0B9247',
  'Intermediário': '#034EA2',
  'Avançado': '#FF161F',
};

function NivelBadge({ nivel }) {
  const c = NIVEL_COLOR[nivel] || '#034EA2';
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: `${c}14`, color: c }}
    >
      {nivel}
    </span>
  );
}

function TrilhaCard({ trilha, index, isSelected, onSelect }) {
  return (
    <div
      className="gov-card gov-reveal h-full bg-white border rounded-lg p-5 flex gap-4"
      style={{ animationDelay: `${index * 50}ms`, borderColor: isSelected ? trilha.accent : '#e5e7eb' }}
    >
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: trilha.accent, color: '#fff' }}
      >
        <Icon className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </Icon>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        {trilha.popular && (
          <span
            className="self-start inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
            style={{ backgroundColor: '#FF161F14', color: '#FF161F' }}
          >
            <Icon className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </Icon>
            Mais procurado
          </span>
        )}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-montserrat text-base font-bold text-gray-900 leading-snug">{trilha.titulo}</h3>
          <NivelBadge nivel={trilha.nivel} />
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-3">{trilha.descricao}</p>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{trilha.jornada.length}</span> cursos
          </span>
          <span className="w-px h-3 bg-gray-200" />
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{trilha.carga}</span> no total
          </span>
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={isSelected}
          className="mt-auto self-start inline-flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80"
          style={{ color: trilha.accent }}
        >
          Ver trilha
          <Icon className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </Icon>
        </button>
      </div>
    </div>
  );
}

function TrilhaJornada({ trilha, onClose }) {
  return (
    <div
      id="jornada"
      className="mt-8 bg-white border border-gray-200 rounded-xl shadow-card p-6 sm:p-8 gov-reveal scroll-mt-24"
      style={{ borderTop: `3px solid ${trilha.accent}` }}
    >
      {/* Header da jornada */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: trilha.accent }}>
              Jornada da trilha
            </span>
            <NivelBadge nivel={trilha.nivel} />
          </div>
          <h3 className="font-montserrat text-xl sm:text-2xl font-bold text-gray-900 leading-snug">{trilha.titulo}</h3>
          <p className="text-xs text-gray-500 mt-1.5">
            {trilha.jornada.length} cursos · {trilha.carga} de carga horária total
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition p-1"
          aria-label="Fechar jornada"
        >
          <Icon className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </Icon>
        </button>
      </div>

      {/* Etapas numeradas com linha de progresso */}
      <ol className="relative">
        {trilha.jornada.map((step, i) => {
          const isLast = i === trilha.jornada.length - 1;
          return (
            <li key={i} className="relative pl-14 pb-4 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[17px] top-10 bottom-0 w-0.5"
                  style={{ backgroundColor: '#E8EAF0' }}
                  aria-hidden="true"
                />
              )}
              <span
                className="absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: trilha.accent }}
              >
                {i + 1}
              </span>
              <div className="bg-[#F8F9FB] border border-gray-200 rounded-lg px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Etapa {i + 1}</div>
                <div className="text-sm font-medium text-gray-800 leading-snug">{step}</div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Rodapé da jornada */}
      <div className="mt-7 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Ao concluir todas as etapas, você finaliza a trilha <span className="font-semibold text-gray-700">{trilha.titulo}</span>.
        </p>
        <a
          href={PORTAL_OFICIAL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-white font-semibold px-4 py-2 rounded transition-opacity hover:opacity-90"
          style={{ backgroundColor: trilha.accent }}
        >
          Começar trilha
          <Icon className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </Icon>
        </a>
      </div>
    </div>
  );
}

const FORMATO_COLOR = {
  'Presencial': '#0B9247',
  'Online': '#034EA2',
  'Híbrido': '#233254',
};

function FormatoBadge({ formato }) {
  const c = FORMATO_COLOR[formato] || '#034EA2';
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: `${c}14`, color: c }}
    >
      {formato}
    </span>
  );
}

const MATERIAL_ICON = {
  'Guia': <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  'Manual': <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  'Cartilha': <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  'Checklist': <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  'Modelo': <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  'Apresentação': <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  'Webinar': <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />,
};

function MaterialCard({ material, index }) {
  return (
    <div
      className="gov-card gov-reveal h-full bg-white border border-gray-200 rounded-lg p-5 flex flex-col"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${material.accent}14`, color: material.accent }}
        >
          <Icon className="w-5 h-5">{MATERIAL_ICON[material.tipo]}</Icon>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{material.tipo}</div>
          <h3 className="font-montserrat text-sm font-bold text-gray-900 leading-snug">{material.titulo}</h3>
        </div>
      </div>
      <span
        className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full mb-3"
        style={{ backgroundColor: `${material.accent}14`, color: material.accent }}
      >
        {material.tema}
      </span>
      <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">{material.descricao}</p>
      <a
        href={PORTAL_OFICIAL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80"
        style={{ color: material.accent }}
      >
        Acessar material
        <Icon className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 6H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </Icon>
      </a>
    </div>
  );
}

function InstituicaoCard({ inst, index }) {
  return (
    <div
      className="gov-card gov-reveal h-full bg-white border border-gray-200 rounded-lg p-5 flex gap-4"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div
        className="flex-shrink-0 self-start font-montserrat text-base font-extrabold px-3 py-2 rounded-lg"
        style={{ backgroundColor: `${inst.accent}14`, color: inst.accent }}
      >
        {inst.sigla}
      </div>
      <div className="min-w-0">
        <h3 className="font-montserrat text-sm font-bold text-gray-900 leading-snug">{inst.nome}</h3>
        <p className="text-xs text-gray-500 leading-relaxed mt-1">{inst.descricao}</p>
      </div>
    </div>
  );
}

const CHIPS = [
  { label: 'Fase Preparatória', query: 'planejamento' },
  { label: 'Gestão Contratual', query: 'fiscal' },
  { label: 'Sustentabilidade', query: 'sustentabilidade' },
  { label: 'IA Aplicada', query: 'ia' },
  { label: 'Jurídico', query: 'agente' },
  { label: 'Outros', query: '' },
];

function RecomendacaoSection({ onVerTrilha }) {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState(null);

  const handleGerar = (e) => {
    e.preventDefault();
    setResultado(recomendar(texto));
  };

  const aplicarChip = (q) => {
    setTexto(q);
    setResultado(recomendar(q));
  };

  return (
    <section id="recomendacao" className="mb-16 scroll-mt-24">
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-card p-6 sm:p-8 gov-reveal"
        style={{ borderTop: '3px solid #034EA2' }}
      >
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#034EA2' }}>
            Recomendação de capacitação
          </span>
          <h2 className="font-montserrat text-2xl font-bold text-gray-900 mt-2">Encontre sua trilha ideal</h2>
          <p className="text-sm text-gray-500 mt-1.5">
            Informe seu perfil ou desafio atual e veja uma sugestão de capacitação.
          </p>

          <form onSubmit={handleGerar} className="flex flex-col sm:flex-row gap-3 mt-5">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Exemplo: Sou novo como fiscal de contrato."
              aria-label="Descreva seu perfil ou desafio atual"
              className="flex-1 bg-[#F8F9FB] border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
            />
            <button
              type="submit"
              className="text-sm text-white font-semibold px-5 py-2.5 rounded transition hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: '#034EA2' }}
            >
              Gerar recomendação
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 mr-1">Sugestões:</span>
            {CHIPS.map((chip) => {
              const ativo = !!resultado && texto === chip.query;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => aplicarChip(chip.query)}
                  aria-pressed={ativo}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    ativo
                      ? 'border-[#034EA2] bg-[#034EA2] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-[#034EA2] hover:text-[#034EA2]'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {resultado && (
          <div className="mt-7 pt-7 border-t border-gray-100" aria-live="polite">
            <div
              className="gov-reveal rounded-lg border p-5"
              style={{ borderColor: resultado.accent, backgroundColor: `${resultado.accent}08` }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: resultado.accent }}>
                Trilha recomendada
              </span>
              <h3 className="font-montserrat text-lg font-bold text-gray-900 mt-1">{resultado.titulo}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mt-1.5">{resultado.motivo}</p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {resultado.cursos.map((curso, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: resultado.accent }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 leading-snug">{curso}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onVerTrilha(resultado.trilhaId)}
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-white font-semibold px-4 py-2 rounded transition hover:opacity-90"
                style={{ backgroundColor: resultado.accent }}
              >
                Ver trilha
                <Icon className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </Icon>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BibliotecaDigital() {
  return (
    <section id="biblioteca" className="mb-16 scroll-mt-24">
      <div
        className="gov-reveal bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden flex flex-col md:flex-row"
        style={{ borderTop: '3px solid #034EA2' }}
      >
        {/* Ilustração de biblioteca */}
        <div
          className="flex items-center justify-center p-8 md:w-56 flex-shrink-0"
          style={{ backgroundColor: 'rgba(3,78,162,0.04)' }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(3,78,162,0.10)', color: '#034EA2' }}
          >
            <Icon className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332a48.36 48.36 0 00-15 0V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </Icon>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 sm:p-8 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#034EA2' }}>
              Base de conhecimento
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-gray-500 bg-gray-100">
              <Icon className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </Icon>
              Sistema externo
            </span>
          </div>

          <h2 className="font-montserrat text-2xl font-bold text-gray-900 mb-2">
            Biblioteca Digital de Logística Pública
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-2xl">
            A Biblioteca Digital de Logística Pública reúne materiais técnicos, acadêmicos, normativos
            e institucionais sobre contratações públicas, inovação, sustentabilidade, governança e
            logística pública. O ambiente apoia servidores, pesquisadores e gestores no acesso ao
            conhecimento, fortalecendo a aprendizagem contínua e a tomada de decisão baseada em evidências.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {/* TODO: substituir pelo link oficial da Biblioteca Digital de Logística Pública. */}
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white font-semibold px-5 py-2.5 rounded transition hover:opacity-90"
              style={{ backgroundColor: '#034EA2' }}
            >
              Acessar biblioteca
              <Icon className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </Icon>
            </a>
            {/* TODO: substituir pelo link oficial da Biblioteca Digital de Logística Pública. */}
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded border border-[#034EA2] text-[#034EA2] transition hover:bg-[#034EA2] hover:text-white"
            >
              Conhecer materiais
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Capacitacao() {
  const [selectedTrilha, setSelectedTrilha] = useState(null);

  const scrollTo = (id) => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  };

  const handleSelectTrilha = (id) => {
    setSelectedTrilha(id);
    setTimeout(() => scrollTo('jornada'), 60);
  };

  const handleVerTrilhaRecomendada = (trilhaId) => {
    if (trilhaId) handleSelectTrilha(trilhaId);
    else scrollTo('trilhas');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <Breadcrumbs
        className="mb-4 mt-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Capacitação' },
        ]}
      />

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-xl shadow-card px-6 sm:px-10 py-12 sm:py-16 mb-10 gov-reveal"
        style={{ background: 'linear-gradient(135deg, #233254 0%, #1a1a1a 100%)' }}
      >
        {/* Diagonal vermelha sutil */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" aria-hidden="true">
          <line x1="58%" y1="-5%" x2="102%" y2="105%" stroke="#FF161F" strokeWidth="2" opacity="0.35" />
        </svg>
        {/* Motif de rede (branco, baixa opacidade) */}
        <svg
          className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none"
          width="260" height="200" viewBox="0 0 260 200" fill="none" aria-hidden="true"
          style={{ opacity: 0.12 }}
        >
          <g stroke="#ffffff" strokeWidth="2">
            <line x1="40" y1="60" x2="120" y2="40" />
            <line x1="120" y1="40" x2="200" y2="70" />
            <line x1="120" y1="40" x2="150" y2="120" />
            <line x1="150" y1="120" x2="60" y2="150" />
            <line x1="150" y1="120" x2="220" y2="150" />
            <line x1="40" y1="60" x2="60" y2="150" />
          </g>
          <g fill="#ffffff">
            <circle cx="40" cy="60" r="8" /><circle cx="120" cy="40" r="10" />
            <circle cx="200" cy="70" r="7" /><circle cx="150" cy="120" r="9" />
            <circle cx="60" cy="150" r="7" /><circle cx="220" cy="150" r="6" />
          </g>
          <circle cx="120" cy="40" r="10" fill="#FF161F" />
        </svg>

        <div className="relative z-10 max-w-2xl">
          <span className="gov-reveal text-xs font-semibold uppercase tracking-widest" style={{ color: '#4297D3', animationDelay: '0ms' }}>
            Rede Estadual de Compras Públicas · SP
          </span>
          <div className="gov-reveal mt-4 mb-5 h-1 w-12 rounded-full" style={{ backgroundColor: '#FF161F', animationDelay: '60ms' }} aria-hidden="true" />
          <h1 className="gov-reveal font-montserrat text-4xl sm:text-5xl font-extrabold text-white leading-tight" style={{ animationDelay: '120ms' }}>
            Centro de Capacitação
          </h1>
          <p className="gov-reveal mt-4 mb-8 text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl" style={{ animationDelay: '180ms' }}>
            Desenvolva competências para transformar a gestão pública com conhecimento de qualidade.
          </p>
          <div className="gov-reveal flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
            <button
              onClick={() => scrollTo('trilhas')}
              className="text-sm text-white font-semibold px-6 py-3 rounded transition-colors"
              style={{ backgroundColor: '#FF161F' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#CC111A')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF161F')}
            >
              Iniciar aprendizagem
            </button>
            <button
              onClick={() => scrollTo('cursos')}
              className="text-sm font-semibold px-6 py-3 rounded border border-white/60 text-white transition-colors hover:bg-white hover:text-[#233254]"
            >
              Explorar catálogo
            </button>
          </div>
        </div>
      </section>

      {/* Minha Jornada */}
      <section className="mb-16">
        <div className="gov-reveal bg-white border border-gray-200 rounded-xl shadow-card p-6 sm:p-8" style={{ borderTop: '3px solid #FF161F' }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#FF161F' }}>Minha Jornada</span>
          <h2 className="sr-only">Minha Jornada</h2>

          <div className="mt-5 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            {/* Anel de progresso */}
            <div
              className="relative w-40 h-40 flex-shrink-0 self-center md:self-auto"
              role="progressbar"
              aria-valuenow={PROGRESSO_GERAL}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso geral da capacitação"
            >
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r={RING_R} fill="none" stroke="#E8EAF0" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r={RING_R} fill="none" stroke="#FF161F" strokeWidth="12"
                  strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={RING_OFFSET}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
                <span className="font-montserrat text-3xl font-extrabold text-gray-900 leading-none">{PROGRESSO_GERAL}%</span>
                <span className="text-[11px] text-gray-500 mt-1">Progresso geral</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              {jornadaStats.map((s) => (
                <div key={s.label} className="bg-[#F8F9FB] border border-gray-200 rounded-lg px-4 py-4 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}14`, color: s.color }}
                  >
                    <Icon className="w-5 h-5">{s.icon}</Icon>
                  </div>
                  <div className="min-w-0">
                    <div className="font-montserrat text-xl font-bold text-gray-900 leading-none">{s.valor}</div>
                    <div className="text-xs text-gray-500 mt-1 leading-snug">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Continue Aprendendo */}
      <section className="mb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-montserrat text-2xl font-bold text-gray-900">Continue aprendendo</h2>
            <p className="text-sm text-gray-500 mt-1">Retome seus cursos de onde parou.</p>
          </div>
          <button
            type="button"
            onClick={() => scrollTo('cursos')}
            className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80"
            style={{ color: '#034EA2' }}
          >
            Ver tudo
            <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></Icon>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {emAndamento.map((c, i) => (
            <div key={c.titulo} className="gov-card gov-reveal bg-white border border-gray-200 rounded-lg p-5 flex flex-col" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full mb-3" style={{ backgroundColor: `${c.accent}14`, color: c.accent }}>{c.tema}</span>
              <h3 className="font-montserrat text-base font-bold text-gray-900 leading-snug mb-4">{c.titulo}</h3>
              <div
                role="progressbar"
                aria-valuenow={c.progresso}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso do curso ${c.titulo}: ${c.progresso}% concluído`}
                className="h-2 w-full rounded-full bg-[#E8EAF0] overflow-hidden"
              >
                <div className="h-full rounded-full" style={{ width: `${c.progresso}%`, backgroundColor: '#FF161F' }} />
              </div>
              <span className="mt-2 text-xs font-semibold text-gray-700">{c.progresso}% concluído</span>
              <a
                href={PORTAL_OFICIAL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 self-start inline-flex items-center gap-1.5 text-sm text-white font-semibold px-4 py-2 rounded transition hover:opacity-90"
                style={{ backgroundColor: c.accent }}
              >
                Continuar
                <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></Icon>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Cursos em destaque */}
      <section id="cursos" className="mb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-montserrat text-2xl font-bold text-gray-900">Cursos em destaque</h2>
          <p className="text-sm text-gray-500 mt-1">
            Formações selecionadas para agentes públicos que atuam em contratações.
          </p>
        </div>
        <Carousel itemClassName="basis-[82%] sm:basis-[calc((100%_-_1.25rem)/2)] lg:basis-[calc((100%_-_2.5rem)/3)]">
          {cursos.map((curso, i) => (
            <CourseCard key={curso.titulo} curso={curso} index={i} />
          ))}
        </Carousel>
      </section>

      {/* Recomendação de Capacitação */}
      <RecomendacaoSection onVerTrilha={handleVerTrilhaRecomendada} />

      {/* Trilhas de aprendizagem */}
      <section id="trilhas" className="mb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-montserrat text-2xl font-bold text-gray-900">Trilhas de aprendizagem</h2>
          <p className="text-sm text-gray-500 mt-1">
            Percursos organizados por perfil profissional. Escolha o seu e visualize a jornada completa.
          </p>
        </div>
        <Carousel itemClassName="basis-[82%] sm:basis-[calc((100%_-_1.25rem)/2)] lg:basis-[calc((100%_-_2.5rem)/3)]">
          {trilhas.map((trilha, i) => (
            <TrilhaCard
              key={trilha.id}
              trilha={trilha}
              index={i}
              isSelected={selectedTrilha === trilha.id}
              onSelect={() => handleSelectTrilha(trilha.id)}
            />
          ))}
        </Carousel>

        {selectedTrilha && (
          <TrilhaJornada
            trilha={trilhas.find((t) => t.id === selectedTrilha)}
            onClose={() => setSelectedTrilha(null)}
          />
        )}
      </section>

      {/* Próximos Eventos */}
      <section id="eventos" className="mb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-montserrat text-2xl font-bold text-gray-900">Próximos eventos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Fóruns, oficinas e encontros promovidos pela Rede e por instituições parceiras.
          </p>
        </div>
        <div className="gov-reveal bg-white border border-gray-200 rounded-xl shadow-card p-5 sm:p-6">
          <ul className="divide-y divide-gray-100">
            {eventos.map((evento) => (
              <li key={evento.nome} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                {/* Selo de data */}
                <div
                  className="flex-shrink-0 w-14 flex flex-col items-center justify-center rounded-lg py-2"
                  style={{ backgroundColor: `${evento.accent}14`, color: evento.accent }}
                  aria-hidden="true"
                >
                  <span className="font-montserrat text-xl font-extrabold leading-none">{evento.dia}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">{evento.mes}</span>
                </div>
                {/* Conteúdo */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-montserrat text-sm sm:text-base font-bold text-gray-900 leading-snug">{evento.nome}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                    <FormatoBadge formato={evento.formato} />
                    <span className="text-gray-300">·</span>
                    <span>{evento.horario}</span>
                    <span className="hidden sm:inline text-gray-300">·</span>
                    <span className="w-full sm:w-auto">{evento.instituicao}</span>
                  </div>
                </div>
                {/* Ação */}
                <a
                  href={PORTAL_OFICIAL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver detalhes: ${evento.nome}`}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-gray-400 transition hover:text-[#034EA2]"
                >
                  <span className="hidden sm:inline">Ver detalhes</span>
                  <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></Icon>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Materiais de Apoio */}
      <section id="materiais" className="mb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-montserrat text-2xl font-bold text-gray-900">Materiais de apoio</h2>
          <p className="text-sm text-gray-500 mt-1">
            Guias, modelos e conteúdos complementares para o dia a dia das contratações.
          </p>
        </div>
        <Carousel itemClassName="basis-[74%] sm:basis-[calc((100%_-_1.25rem)/2)] lg:basis-[calc((100%_-_3.75rem)/4)]">
          {materiais.map((material, i) => (
            <MaterialCard key={material.titulo} material={material} index={i} />
          ))}
        </Carousel>
      </section>

      {/* Biblioteca Digital de Logística Pública */}
      <BibliotecaDigital />

      {/* Instituições Parceiras */}
      <section id="instituicoes" className="mb-16 scroll-mt-24">
        <div className="mb-6">
          <h2 className="font-montserrat text-2xl font-bold text-gray-900">Instituições parceiras</h2>
          <p className="text-sm text-gray-500 mt-1">
            Órgãos, universidades e escolas de governo que apoiam a formação da Rede.
          </p>
        </div>
        <Carousel itemClassName="basis-[82%] sm:basis-[calc((100%_-_1.25rem)/2)] lg:basis-[calc((100%_-_2.5rem)/3)]">
          {instituicoes.map((inst, i) => (
            <InstituicaoCard key={inst.sigla} inst={inst} index={i} />
          ))}
        </Carousel>
      </section>

      {/* CTA */}
      <section
        className="rounded-xl px-6 sm:px-10 py-8 flex flex-col md:flex-row md:items-center gap-6"
        style={{ backgroundColor: '#233254' }}
      >
        <div className="flex items-start gap-4 flex-1">
          <div
            className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.10)', color: '#fff' }}
          >
            <Icon className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.44 60.44 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.9 59.9 0 0112 3.493a59.9 59.9 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.7 50.7 0 0112 13.489a50.7 50.7 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.38 55.38 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </Icon>
          </div>
          <div className="min-w-0">
            <h3 className="font-montserrat text-lg sm:text-xl font-bold text-white mb-1.5 leading-snug">
              Invista no seu desenvolvimento e gere valor para o Estado
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#9aa8c4' }}>
              Conteúdos atualizados, trilhas completas e capacitação contínua.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => scrollTo('cursos')}
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded bg-white transition-colors hover:bg-gray-100"
            style={{ color: '#233254' }}
          >
            Explorar catálogo
            <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></Icon>
          </button>
          <a
            href={PORTAL_OFICIAL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded border border-white/40 text-white transition-colors hover:bg-white/10"
          >
            Acessar portal
            <Icon className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </Icon>
          </a>
        </div>
      </section>
    </div>
  );
}
