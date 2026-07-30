import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import {
  CAPACITACAO_PORTAL_URL,
  formatEventDate,
  getEventDateParts,
  splitCapacitacaoEvents,
} from '../data/capacitacaoEvents';

const FORMATO_COLOR = {
  Presencial: '#0B9247',
  Online: '#034EA2',
  Híbrido: '#233254',
};

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function FormatoBadge({ formato }) {
  const color = FORMATO_COLOR[formato] || '#034EA2';
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: `${color}14`, color }}
    >
      {formato}
    </span>
  );
}

function EventCard({ evento, realizado = false }) {
  const { dia, mes } = getEventDateParts(evento.data);

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white shadow-card ${
        realizado ? 'border-gray-200' : 'border-gray-200'
      }`}
      style={{ borderLeft: `4px solid ${realizado ? '#9CA3AF' : evento.accent}` }}
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div
          className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl"
          style={{
            backgroundColor: realizado ? '#F3F4F6' : `${evento.accent}14`,
            color: realizado ? '#6B7280' : evento.accent,
          }}
          aria-label={formatEventDate(evento.data)}
        >
          <span className="font-montserrat text-2xl font-extrabold leading-none">{dia}</span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wider">{mes}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <FormatoBadge formato={evento.formato} />
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                realizado ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-[#034EA2]'
              }`}
            >
              {realizado ? 'Realizado' : 'Programado'}
            </span>
          </div>
          <h3 className="font-montserrat text-lg font-bold leading-snug text-gray-900">
            {evento.nome}
          </h3>
          <p className="mt-1 text-sm font-medium text-gray-600">{formatEventDate(evento.data)}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{evento.descricao}</p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </Icon>
              {evento.horario}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </Icon>
              {evento.local}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
              </Icon>
              {evento.instituicao}
            </span>
          </div>
        </div>

        <a
          href={CAPACITACAO_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-[#034EA2] hover:text-[#034EA2]"
          aria-label={`Mais informações sobre ${evento.nome}`}
        >
          Mais informações
          <Icon className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </Icon>
        </a>
      </div>
    </article>
  );
}

function EmptyEvents({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

export default function CalendarioEventos() {
  const { upcoming, past } = splitCapacitacaoEvents();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <Breadcrumbs
        className="mb-4 mt-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Capacitação', to: '/capacitacao' },
          { label: 'Calendário de Eventos' },
        ]}
      />

      <section className="relative mb-12 overflow-hidden rounded-xl bg-[#233254] px-6 py-10 shadow-card sm:px-10 sm:py-12">
        <div
          className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[36px] border-white/5"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4297D3]">
            Capacitação RECPSP
          </span>
          <h1 className="mt-3 font-montserrat text-3xl font-extrabold text-white sm:text-4xl">
            Calendário de Eventos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
            Consulte os próximos fóruns, oficinas e encontros e reveja os eventos já realizados
            pela Rede e por instituições parceiras.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              {upcoming.length} {upcoming.length === 1 ? 'evento programado' : 'eventos programados'}
            </span>
            <span className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              {past.length} {past.length === 1 ? 'evento realizado' : 'eventos realizados'}
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="proximos-eventos" className="mb-14">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#034EA2]">
            Agenda
          </span>
          <h2 id="proximos-eventos" className="mt-1 font-montserrat text-2xl font-bold text-gray-900">
            Próximos eventos
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Eventos com inscrições abertas ou programados para os próximos meses.
          </p>
        </div>
        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map(evento => <EventCard key={evento.id} evento={evento} />)}
          </div>
        ) : (
          <EmptyEvents>Não há novos eventos programados no momento.</EmptyEvents>
        )}
      </section>

      <section aria-labelledby="eventos-realizados" className="mb-12">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Histórico
          </span>
          <h2 id="eventos-realizados" className="mt-1 font-montserrat text-2xl font-bold text-gray-900">
            Eventos realizados
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Consulte encontros e atividades que já fizeram parte do calendário de capacitação.
          </p>
        </div>
        {past.length > 0 ? (
          <div className="space-y-4">
            {past.map(evento => <EventCard key={evento.id} evento={evento} realizado />)}
          </div>
        ) : (
          <EmptyEvents>Ainda não há eventos realizados neste calendário.</EmptyEvents>
        )}
      </section>

      <Link
        to="/capacitacao"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#034EA2] transition hover:opacity-75"
      >
        <Icon className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </Icon>
        Voltar para Capacitação
      </Link>
    </div>
  );
}
