import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForumNoticeModal from './components/ForumNoticeModal';
import { AuthProvider } from './context/AuthContext';
import { splitCapacitacaoEvents } from './data/capacitacaoEvents';
import Terms from './pages/Terms';

const mockNavigate = jest.fn();
let mockPathname = '/forum';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: mockPathname }),
  useNavigate: () => mockNavigate,
}), { virtual: true });

beforeEach(() => {
  localStorage.clear();
  mockPathname = '/forum';
  mockNavigate.mockClear();
  jest.restoreAllMocks();
});

test('explica nos Termos que as publicações representam seus autores', () => {
  render(<Terms />);

  expect(screen.getByText(
    /não representam, necessariamente, posicionamento oficial da Rede Estadual/i
  )).toBeInTheDocument();
  expect(screen.getByText(
    /definição, manutenção e eventual remoção dessas identificações são de competência exclusiva da administração/i
  )).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /navegação estrutural/i })).toHaveTextContent(
    'InícioTermos de Uso e Política de Privacidade'
  );
  expect(screen.queryByText('/')).not.toBeInTheDocument();
});

test('exige o aceite do comunicado no primeiro acesso ao fórum', async () => {
  localStorage.setItem('forum_token', 'token-de-teste');
  localStorage.setItem('forum_user', JSON.stringify({
    id: 10,
    username: 'UsuarioTeste',
    role: 'user',
    forum_notice_accepted: false,
  }));
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, accepted_at: '2026-07-30 12:00:00' }),
  });

  render(
    <AuthProvider>
      <ForumNoticeModal />
    </AuthProvider>
  );

  expect(await screen.findByRole('dialog', { name: /antes de continuar/i })).toBeInTheDocument();
  const acceptButton = screen.getByRole('button', { name: /aceitar e continuar/i });
  expect(acceptButton).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /li e estou de acordo/i }));
  expect(acceptButton).toBeEnabled();
  fireEvent.click(acceptButton);

  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  expect(JSON.parse(localStorage.getItem('forum_user')).forum_notice_accepted).toBe(true);
});

test('separa o calendário de capacitação entre eventos futuros e realizados', () => {
  const { upcoming, past } = splitCapacitacaoEvents(new Date(2026, 6, 30, 12));

  expect(upcoming).toHaveLength(5);
  expect(upcoming[0].nome).toBe('II Fórum de Contratações Públicas');
  expect(past).toHaveLength(5);
  expect(past[0].nome).toBe('Jornada de Formação de Agentes de Contratação');
});
