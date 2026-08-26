import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Fórum',
    description: 'Discussões, dúvidas e troca de experiências sobre contratações públicas',
    to: '/forum',
    accent: '#ED1C24',
    available: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    title: 'Modelos de Documentos',
    description: 'Editais, termos de referência, contratos e outros modelos prontos',
    to: 'https://compras.sp.gov.br/agente-publico/toolkits-documentos-padronizados/',
    accent: '#034EA2',
    available: true,
    external: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Vade Mecum',
    description: 'Legislação atualizada sobre licitações e contratos administrativos',
    to: 'https://vademecum.lablogsp.org',
    accent: '#0B9247',
    available: true,
    external: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: 'Capacitação',
    description: 'Cursos, treinamentos e materiais para formação de agentes públicos',
    to: '/capacitacao',
    accent: '#233254',
    available: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
      </svg>
    ),
  },
  {
    title: 'Portal de Desafios',
    description: 'Desafios de inovação para soluções em logística e contratações públicas',
    to: 'https://compras.sp.gov.br/laboratorio-de-logistica/portal-desafios-2/',
    accent: '#4297D3',
    available: true,
    external: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
  {
    title: 'Plataforma de Sustentabilidade',
    description: 'Critérios ESG e compras sustentáveis nas contratações do Estado',
    accent: '#94AA5A',
    available: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    title: 'Consultoria Executiva',
    description: 'Apoio especializado para órgãos e entidades em contratações estratégicas',
    accent: '#ED1C24',
    available: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Biblioteca',
    description: 'Acervo técnico, acadêmico e normativo sobre logística pública',
    accent: '#034EA2',
    available: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332a48.36 48.36 0 00-15 0V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
];

function PortalCard({ section }) {
  const cardStyle = {
    borderTop: `3px solid ${section.accent}`,
    borderRadius: '8px',
  };
  const iconStyle = {
    backgroundColor: section.accent,
    color: '#ffffff',
  };

  const inner = (
    <div
      className={`flex flex-col h-full bg-white border border-gray-200 p-6 ${section.available ? 'gov-card' : ''}`}
      style={cardStyle}
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className="inline-flex items-center justify-center w-9 h-9 flex-shrink-0"
          style={{ ...iconStyle, borderRadius: '6px' }}
        >
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-montserrat text-base font-bold text-gray-900 leading-snug">
            {section.title}
          </h2>
        </div>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed mb-5 flex-1">
        {section.description}
      </p>
      {section.available ? (
        <div className="text-xs font-semibold transition-colors" style={{ color: section.accent }}>
          Acessar →
        </div>
      ) : (
        <span className="self-start text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          Em breve
        </span>
      )}
    </div>
  );

  if (!section.available) {
    return (
      <div className="h-full opacity-70 cursor-not-allowed" aria-disabled="true">
        {inner}
      </div>
    );
  }

  if (section.external) {
    return (
      <a href={section.to} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    );
  }

  return <Link to={section.to} className="block h-full">{inner}</Link>;
}

export default function Portal() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-12 max-w-xl">
        <img
          src="/gif-recpsp.gif"
          alt="RECPSP — Rede Estadual de Compras Públicas de São Paulo"
          className="h-28 mx-auto mb-5"
        />

        <p className="text-sm text-gray-500 leading-relaxed">
          Plataforma integrada de apoio às contratações públicas do Estado de São Paulo.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl w-full">
        {sections.map(section => (
          <PortalCard key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}
