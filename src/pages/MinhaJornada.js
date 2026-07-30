import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';
import Breadcrumbs from '../components/Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import { calculateJourneyStats } from '../data/capacitacaoCourses';

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

function formatProgressDate(value) {
  if (!value) return '';
  const isoValue = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoValue));
}

function JourneyCourseCard({ curso, completed, saving, onToggle, onRemove }) {
  return (
    <article
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card"
      style={{ borderLeft: `4px solid ${completed ? '#0B9247' : curso.accent}` }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: `${curso.accent}14`, color: curso.accent }}
              >
                {curso.tema}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                completed ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-[#034EA2]'
              }`}>
                {completed ? 'Concluído' : 'Em andamento'}
              </span>
            </div>
            <h3 className="font-montserrat text-lg font-bold text-gray-900">{curso.titulo}</h3>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <span>{curso.carga} de carga horária</span>
              <span>{curso.modalidade}</span>
              <span>{curso.instituicao}</span>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              {completed
                ? `Conclusão registrada em ${formatProgressDate(curso.progress.completed_at)}`
                : `Adicionado à jornada em ${formatProgressDate(curso.progress.started_at)}`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {!completed && (
              <a
                href={curso.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-[#034EA2] hover:text-[#034EA2]"
              >
                Continuar curso
                <Icon className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </Icon>
              </a>
            )}
            <button
              type="button"
              onClick={() => onToggle(curso.id, !completed)}
              disabled={saving}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60 ${
                completed ? 'bg-gray-600 hover:bg-gray-700' : 'bg-[#0B9247] hover:bg-green-700'
              }`}
            >
              <Icon className="h-4 w-4">
                {completed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h11a4 4 0 110 8H9m-6-8l4-4m-4 4l4 4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                )}
              </Icon>
              {completed ? 'Desmarcar conclusão' : 'Marcar como concluído'}
            </button>
            <button
              type="button"
              onClick={() => onRemove(curso.id)}
              disabled={saving}
              className="text-xs font-medium text-gray-400 transition hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
            >
              Remover da jornada
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MinhaJornada() {
  const { user, token, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [savingCourseId, setSavingCourseId] = useState('');
  const [message, setMessage] = useState('');

  const {
    data: progress = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['course-progress'],
    queryFn: () => apiFetch('/auth/course-progress', {}, token),
    enabled: !!token,
  });

  const stats = calculateJourneyStats(progress);
  const inProgressCourses = stats.courses.filter(curso => !curso.progress.completed);
  const completedCourses = stats.courses.filter(curso => curso.progress.completed);

  async function updateCourse(courseId, completed) {
    setSavingCourseId(courseId);
    setMessage('');
    try {
      await apiFetch(`/auth/course-progress/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify({ completed }),
      }, token);
      await queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      setMessage(completed ? 'Conclusão registrada com sucesso.' : 'Curso marcado novamente como em andamento.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSavingCourseId('');
    }
  }

  async function removeCourse(courseId) {
    setSavingCourseId(courseId);
    setMessage('');
    try {
      await apiFetch(`/auth/course-progress/${courseId}`, { method: 'DELETE' }, token);
      await queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      setMessage('Curso removido da jornada.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSavingCourseId('');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <Breadcrumbs
        className="mb-4 mt-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Capacitação', to: '/capacitacao' },
          { label: 'Minha Jornada' },
        ]}
      />

      <section className="relative mb-10 overflow-hidden rounded-xl bg-[#233254] px-6 py-10 shadow-card sm:px-10 sm:py-12">
        <div className="relative z-10 max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4297D3]">
            Acompanhamento individual
          </span>
          <h1 className="mt-3 font-montserrat text-3xl font-extrabold text-white sm:text-4xl">
            Minha Jornada
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
            Acompanhe os cursos que você acessou e registre manualmente suas conclusões para manter
            seu histórico de capacitação sempre atualizado.
          </p>
        </div>
        <div className="absolute -bottom-16 -right-12 h-56 w-56 rounded-full border-[40px] border-white/5" aria-hidden="true" />
      </section>

      {!authLoading && !user ? (
        <section className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#034EA2]">
            <Icon className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM5 21a7 7 0 0114 0" />
            </Icon>
          </div>
          <h2 className="mt-4 font-montserrat text-xl font-bold text-gray-900">
            Entre para acompanhar sua jornada
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-gray-500">
            O acompanhamento é particular e fica associado à sua conta. Entre ou crie um cadastro
            para salvar cursos e registrar conclusões.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="rounded-lg bg-[#034EA2] px-5 py-2.5 text-sm font-semibold text-white">
              Entrar
            </Link>
            <Link to="/register" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600">
              Criar conta
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Progresso geral', value: `${stats.percentage}%`, color: '#FF161F' },
              { label: 'Cursos na jornada', value: stats.total, color: '#034EA2' },
              { label: 'Cursos concluídos', value: stats.completed, color: '#0B9247' },
              { label: 'Horas concluídas', value: `${stats.completedHours}h`, color: '#233254' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
                <div className="font-montserrat text-2xl font-extrabold" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="mt-1 text-xs font-medium text-gray-500">{item.label}</div>
              </div>
            ))}
          </section>

          {stats.total > 0 && (
            <section className="mb-12 rounded-xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-600">
                <span>Progresso dos cursos adicionados</span>
                <span>{stats.completed} de {stats.total} concluídos</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={stats.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${stats.percentage}% da jornada concluída`}
              >
                <div
                  className="h-full rounded-full bg-[#0B9247] transition-all"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </section>
          )}

          {message && (
            <p className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-[#034EA2]" role="status">
              {message}
            </p>
          )}

          {isLoading || authLoading ? (
            <div className="py-16 text-center text-sm text-gray-500">Carregando sua jornada...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-700">
              Não foi possível carregar sua jornada. Tente novamente.
            </div>
          ) : stats.total === 0 ? (
            <section className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <h2 className="font-montserrat text-xl font-bold text-gray-900">Sua jornada está vazia</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-gray-500">
                Acesse um curso pelo catálogo de Capacitação e ele aparecerá automaticamente aqui
                para você acompanhar e registrar a conclusão.
              </p>
              <Link
                to="/capacitacao#cursos"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#FF161F] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Explorar cursos
                <Icon className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </Icon>
              </Link>
            </section>
          ) : (
            <>
              <section className="mb-12" aria-labelledby="cursos-em-andamento">
                <div className="mb-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#034EA2]">Em curso</span>
                  <h2 id="cursos-em-andamento" className="mt-1 font-montserrat text-2xl font-bold text-gray-900">
                    Cursos em andamento
                  </h2>
                </div>
                {inProgressCourses.length > 0 ? (
                  <div className="space-y-4">
                    {inProgressCourses.map(curso => (
                      <JourneyCourseCard
                        key={curso.id}
                        curso={curso}
                        completed={false}
                        saving={savingCourseId === curso.id}
                        onToggle={updateCourse}
                        onRemove={removeCourse}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
                    Todos os cursos da sua jornada estão concluídos.
                  </div>
                )}
              </section>

              <section aria-labelledby="cursos-concluidos">
                <div className="mb-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#0B9247]">Histórico</span>
                  <h2 id="cursos-concluidos" className="mt-1 font-montserrat text-2xl font-bold text-gray-900">
                    Cursos concluídos
                  </h2>
                </div>
                {completedCourses.length > 0 ? (
                  <div className="space-y-4">
                    {completedCourses.map(curso => (
                      <JourneyCourseCard
                        key={curso.id}
                        curso={curso}
                        completed
                        saving={savingCourseId === curso.id}
                        onToggle={updateCourse}
                        onRemove={removeCourse}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
                    Nenhuma conclusão registrada ainda.
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
