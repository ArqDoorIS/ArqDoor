/**
 * Header laranja das telas logadas (spec specs/features/2026-11-webapp-cores-do-app, decisão 5).
 */
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from '../components/Navbar';

let sessao: any = { user: null, isLoggedIn: false, logout: vi.fn() };
let naoLidas = 0;

vi.mock('wouter', () => ({
  Link: ({ children }: any) => <a href="/">{children}</a>,
  useLocation: () => ['/kanban', vi.fn()],
}));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => sessao }));
vi.mock('@/hooks/use-unread-count', () => ({ useUnreadCount: () => naoLidas }));
vi.mock('@/hooks/use-disponibilidade', () => ({
  useDisponibilidade: () => ({ disponivel: true, toggleDisponibilidade: vi.fn(), salvando: false }),
}));

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Navbar />
    </QueryClientProvider>,
  );

const logado = { id: 7, name: 'Rafael Teste', email: 'r@example.com', type: 'prestador' };

describe('header laranja', () => {
  beforeEach(() => {
    sessao = { user: null, isLoggedIn: false, logout: vi.fn() };
    naoLidas = 0;
  });

  it('usa o laranja da marca e a logo branca', () => {
    const { container } = montar();
    expect(container.querySelector('nav')?.className).toContain('bg-brand');
    expect(screen.getByAltText('ArqDoor').getAttribute('src')).toContain('logo_branca');
  });

  it('sem sombra nem transparência por cima da página', () => {
    const { container } = montar();
    expect(container.querySelector('nav')?.className).not.toMatch(/shadow-|backdrop-blur|bg-white/);
  });

  it('o item ativo fica branco, em negrito e sublinhado', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    const ativo = screen.getByText('Kanban').closest('[aria-current="page"]')!;
    expect(ativo.className).toContain('text-white');
    expect(ativo.className).toContain('font-semibold');
    expect(ativo.className).toContain('underline');
  });

  it('o item inativo fica branco', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    expect(screen.getByText('Painel').closest('div')!.className).toContain('text-white');
  });

  it('o selo de mensagens é branco com número laranja', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    naoLidas = 4;
    montar();
    const selo = screen.getByText('4');
    expect(selo.className).toContain('bg-white');
    expect(selo.className).toContain('text-brand-dark');
    expect(selo.className).not.toContain('bg-danger');
  });

  it('o hover dos botões não apaga o ícone branco', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    const mensagens = screen.getByRole('button', { name: 'Messages' });
    expect(mensagens.className).toContain('hover:bg-white/15');
    expect(mensagens.className).toContain('hover:text-white');
    expect(mensagens.querySelector('svg')?.getAttribute('class')).toContain('text-white');
  });

  it('as iniciais do avatar não herdam o branco do header', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    const iniciais = screen.getByText('RT');
    expect(iniciais.className).toContain('bg-white');
    expect(iniciais.className).toContain('text-brand-dark');
  });

  it('visitante: "Login" e "Cadastrar" continuam visíveis sobre o laranja', () => {
    montar();
    const login = screen.getByRole('button', { name: 'Login' });
    expect(login.className).toContain('bg-white');
    expect(login.className).toContain('text-brand-dark');
    expect(login.className).not.toMatch(/(^|\s)bg-brand(\s|$)/);
    expect(screen.getByRole('button', { name: 'Cadastrar' }).className).toContain('text-white');
  });

  it('o foco por teclado aparece sobre o laranja', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Login' }).className).toContain('focus-visible:ring-white');
  });
});
