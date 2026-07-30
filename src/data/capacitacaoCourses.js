import { CAPACITACAO_PORTAL_URL } from './capacitacaoEvents';

export const CAPACITACAO_COURSES = [
  {
    id: 'lei-14133-2021',
    titulo: 'Lei nº 14.133/2021',
    tema: 'Legislação',
    carga: '40h',
    cargaHoras: 40,
    modalidade: 'EAD',
    instituicao: 'ENAP',
    accent: '#FF161F',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'plano-contratacoes-anual',
    titulo: 'Plano de Contratações Anual (PCA)',
    tema: 'Planejamento',
    carga: '20h',
    cargaHoras: 20,
    modalidade: 'EAD',
    instituicao: 'Escola Virtual.Gov',
    accent: '#034EA2',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'estudo-tecnico-preliminar',
    titulo: 'Estudo Técnico Preliminar',
    tema: 'Planejamento',
    carga: '15h',
    cargaHoras: 15,
    modalidade: 'EAD',
    instituicao: 'ENAP',
    accent: '#0B9247',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'termo-referencia',
    titulo: 'Termo de Referência',
    tema: 'Instrução Processual',
    carga: '20h',
    cargaHoras: 20,
    modalidade: 'EAD',
    instituicao: 'Escola Virtual.Gov',
    accent: '#233254',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'pesquisa-precos',
    titulo: 'Pesquisa de Preços',
    tema: 'Instrução Processual',
    carga: '12h',
    cargaHoras: 12,
    modalidade: 'EAD',
    instituicao: 'ENAP',
    accent: '#4297D3',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'gestao-contratual',
    titulo: 'Gestão Contratual',
    tema: 'Gestão de Contratos',
    carga: '30h',
    cargaHoras: 30,
    modalidade: 'Híbrido',
    instituicao: 'TCE-SP',
    accent: '#94AA5A',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'sancoes-administrativas',
    titulo: 'Sanções Administrativas',
    tema: 'Gestão de Contratos',
    carga: '16h',
    cargaHoras: 16,
    modalidade: 'EAD',
    instituicao: 'ENAP',
    accent: '#FF161F',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'compras-sustentaveis',
    titulo: 'Compras Sustentáveis',
    tema: 'Sustentabilidade',
    carga: '12h',
    cargaHoras: 12,
    modalidade: 'EAD',
    instituicao: 'Escola Virtual.Gov',
    accent: '#0B9247',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'ia-contratacoes',
    titulo: 'Inteligência Artificial aplicada às Contratações',
    tema: 'Inovação',
    carga: '8h',
    cargaHoras: 8,
    modalidade: 'Online ao vivo',
    instituicao: 'Prodesp',
    accent: '#034EA2',
    url: CAPACITACAO_PORTAL_URL,
  },
  {
    id: 'linguagem-simples',
    titulo: 'Linguagem Simples',
    tema: 'Comunicação',
    carga: '6h',
    cargaHoras: 6,
    modalidade: 'EAD',
    instituicao: 'Escola Virtual.Gov',
    accent: '#4297D3',
    url: CAPACITACAO_PORTAL_URL,
  },
];

export const CAPACITACAO_COURSES_BY_ID = Object.fromEntries(
  CAPACITACAO_COURSES.map(curso => [curso.id, curso])
);

export function enrichCourseProgress(progress = []) {
  return progress
    .map(item => {
      const course = CAPACITACAO_COURSES_BY_ID[item.course_id];
      return course ? { ...course, progress: item } : null;
    })
    .filter(Boolean);
}

export function calculateJourneyStats(progress = []) {
  const courses = enrichCourseProgress(progress);
  const completed = courses.filter(curso => curso.progress.completed);
  const percentage = courses.length > 0
    ? Math.round((completed.length / courses.length) * 100)
    : 0;

  return {
    courses,
    total: courses.length,
    completed: completed.length,
    inProgress: courses.length - completed.length,
    completedHours: completed.reduce((total, curso) => total + curso.cargaHoras, 0),
    percentage,
  };
}
