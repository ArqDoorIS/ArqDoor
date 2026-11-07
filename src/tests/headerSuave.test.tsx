/**
 * Header das telas logadas: laranja suave com texto escuro (spec specs/features/2026-11-webapp-cores-do-app, decisão 5).
 */
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import tailwindConfig from '../../tailwind.config';

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

const luminancia = (hex: string) => {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe('header suave', () => {
  beforeEach(() => {
    sessao = { user: null, isLoggedIn: false, logout: vi.fn() };
    naoLidas = 0;
  });

  it('usa o laranja suave e a logo colorida', () => {
    const { container } = montar();
    expect(container.querySelector('nav')?.className).toContain('bg-peach');
    expect(screen.getByAltText('ArqDoor').getAttribute('src')).toBe('/images/landing/logo.png');
  });

  it('os links passam com folga no contraste', () => {
    const cores = (tailwindConfig as any).theme.extend.colors;
    expect(cores.peach).toBe('#ffdccb');
    expect(contraste(cores.ink.strong, cores.peach)).toBeGreaterThanOrEqual(7);
  });

  it('sem sombra nem transparência por cima da página', () => {
    const { container } = montar();
    expect(container.querySelector('nav')?.className).not.toMatch(/shadow-|backdrop-blur|bg-white/);
  });

  it('o item ativo fica em negrito, sublinhado na cor da marca', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    const ativo = screen.getByText('Kanban').closest('[aria-current="page"]')!;
    expect(ativo.className).toContain('text-ink-strong');
    expect(ativo.className).toContain('font-semibold');
    expect(ativo.className).toContain('underline');
    expect(ativo.className).toContain('decoration-brand');
  });

  it('o item inativo usa o texto escuro', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    const inativo = screen.getByText('Painel').closest('div')!;
    expect(inativo.className).toContain('text-ink-strong');
    expect(inativo.className).not.toContain('text-white');
  });

  it('o selo de mensagens se destaca do fundo', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    naoLidas = 4;
    montar();
    const selo = screen.getByText('4');
    expect(selo.className).toContain('bg-brand-dark');
    expect(selo.className).toContain('text-white');
  });

  it('o ícone de mensagens segue escuro no hover', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    const mensagens = screen.getByRole('button', { name: 'Messages' });
    expect(mensagens.className).toContain('hover:bg-white/60');
    expect(mensagens.className).toContain('hover:text-ink-strong');
    expect(mensagens.querySelector('svg')?.getAttribute('class')).toContain('text-ink-strong');
  });

  it('as iniciais do avatar aparecem', () => {
    sessao = { user: logado, isLoggedIn: true, logout: vi.fn() };
    montar();
    const iniciais = screen.getByText('RT');
    expect(iniciais.className).toContain('bg-white');
    expect(iniciais.className).toContain('text-brand-dark');
  });

  it('visitante: "Login" é o botão padrão e "Cadastrar" usa o texto escuro', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Login' }).className).toContain('bg-brand');
    expect(screen.getByRole('button', { name: 'Cadastrar' }).className).toContain('text-ink-strong');
  });
});
