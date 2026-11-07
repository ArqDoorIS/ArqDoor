/**
 * Site com a paleta e o ícone do app (spec specs/features/2026-11-site-paleta-do-app).
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import tailwindConfig from '../../tailwind.config';
import { buttonVariants } from '@/components/ui/button';
import AuthPage from '../pages/auth-page';

vi.mock('wouter', () => ({
  useLocation: () => ['/auth', vi.fn()],
  useSearch: () => '',
  Link: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: false, isInitialized: true, login: vi.fn(), register: vi.fn(), loginWithGoogle: vi.fn() }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@react-oauth/google', () => ({ useGoogleLogin: () => vi.fn() }));

const raiz = path.resolve(__dirname, '..', '..');
const ler = (relativo: string) => readFileSync(path.join(raiz, relativo), 'utf8');

describe('paleta do app no site', () => {
  it('os tokens têm os mesmos valores do tailwind.config.js do app', () => {
    const cores = (tailwindConfig as any).theme.extend.colors;
    expect(cores.brand).toEqual({
      DEFAULT: '#e75812',
      dark: '#c44a0a',
      darker: '#e65100',
      light: '#ff9444',
      lighter: '#ff7a3d',
      soft: '#fff0ea',
      tint: '#fff8f3',
      disabled: '#f0b090',
    });
    expect(cores.ink).toEqual({ DEFAULT: '#4a423d', strong: '#2d2420' });
    expect(cores.surface.DEFAULT).toBe('#fffaf3');
    expect(cores.line).toBe('#f0e8e0');
  });

  it('a primária e o foco são o laranja do app, não coral nem preto', () => {
    const css = ler('src/index.css');
    expect(css).toMatch(/--primary:\s*20 86% 49%;/);
    expect(css).toMatch(/--ring:\s*20 86% 49%;/);
    expect(JSON.parse(ler('theme.json')).primary).toBe('#e75812');
  });

  it('o botão padrão e o link usam o brand', () => {
    expect(buttonVariants()).toContain('bg-brand');
    expect(buttonVariants()).not.toContain('amber');
    expect(buttonVariants({ variant: 'link' })).toContain('text-brand');
  });

  it('login, cadastro, nova senha e aviso de cookies não usam âmbar', () => {
    for (const arquivo of [
      'src/pages/auth-page.tsx',
      'src/components/AuthForms.tsx',
      'src/pages/ResetPasswordPage.tsx',
      'src/components/CookieConsent.tsx',
    ]) {
      expect({ arquivo, amber: /amber-/.test(ler(arquivo)) }).toEqual({ arquivo, amber: false });
    }
  });

  it('a landing só usa os laranjas da paleta (nada dos 8 tons antigos)', () => {
    const antigos = /#(e85a0c|e45712|F05B10|F05A0F|f97316|F17B2F|cf5315|cf4f0a|ce4f0f|EA580C|C2410C)\b|orange-|amber-|from-black\/20/i;
    const pasta = 'src/components/landing';
    for (const nome of readdirSync(path.join(raiz, pasta))) {
      const achado = ler(`${pasta}/${nome}`).match(antigos)?.[0] ?? null;
      expect({ nome, achado }).toEqual({ nome, achado: null });
    }
  });
});

describe('favicon', () => {
  it('a página aponta para o ícone do app, e os arquivos existem', () => {
    const html = ler('index.html');
    expect(html).not.toContain('rel="icon" href="/images/arqdoorlogo.jpg"');
    const hrefs = Array.from(html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g), (m) => m[1]);
    expect(hrefs).toEqual(['/favicon.ico', '/favicon-32x32.png', '/icon-192.png', '/apple-touch-icon.png']);
    for (const href of hrefs) expect(existsSync(path.join(raiz, 'public', href))).toBe(true);
  });

  it('a prévia de link (WhatsApp, redes) usa o ícone do app', () => {
    const html = ler('index.html');
    expect(html).toContain('<meta property="og:image" content="https://arqdoor.com/images/arqdoor-previa.png" />');
    expect(html).toContain('<meta name="twitter:image" content="https://arqdoor.com/images/arqdoor-previa.png" />');
    expect(html).not.toContain('arqdoorlogo.jpg');
    // A API monta a prévia do convite apontando para o mesmo arquivo (getInvitePreviaService).
    expect(existsSync(path.join(raiz, 'public/images/arqdoor-previa.png'))).toBe(true);
  });
});

describe('login e cadastro', () => {
  const renderizar = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthPage />
      </QueryClientProvider>,
    );

  it('login, cadastro, esqueci a senha e nova senha não têm sombra', () => {
    for (const arquivo of [
      'src/pages/auth-page.tsx',
      'src/components/AuthForms.tsx',
      'src/pages/ResetPasswordPage.tsx',
    ]) {
      const sombra = ler(arquivo).match(/\bshadow-(?!none\b)[\w-]+/)?.[0] ?? null;
      expect({ arquivo, sombra }).toEqual({ arquivo, sombra: null });
    }
  });

  it('o modal de "Esqueci minha senha" desliga a sombra padrão do Dialog', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    const modal = await screen.findByRole('dialog', { name: /senha/i });
    expect(modal.className).toContain('shadow-none');
    expect(modal.className).not.toContain('shadow-lg');
  });

  it('o título está certo', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: 'Bem-vindo ao ArqDoor!' })).toBeInTheDocument();
  });

  it('"Criar conta" e "Faça login" são botões (recebem foco pelo teclado)', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Criar conta' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Faça login' })).toBeInTheDocument();
  });

  it('o modal de cadastro tem teto de altura e rola no celular', async () => {
    renderizar();
    fireEvent.click(screen.getByText('Criar conta', { selector: 'button' }));
    const modal = await screen.findByRole('dialog', { name: 'Criar conta' });
    expect(modal.className).toContain('max-h-[calc(100dvh-1rem)]');
    expect(modal.className).toContain('overflow-y-auto');
  });

  it('o "Gênero" tem a altura e a fonte dos outros campos', async () => {
    renderizar();
    fireEvent.click(screen.getByText('Criar conta', { selector: 'button' }));
    await screen.findByRole('dialog', { name: 'Criar conta' });
    const genero = screen.getByRole('combobox');
    expect(genero.className).toContain('h-10');
    expect(genero.className).toContain('text-sm');
  });
});
