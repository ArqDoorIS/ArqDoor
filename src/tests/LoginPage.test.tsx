import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import React from 'react';
import AuthPage from '../pages/auth-page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks ---

// Wouter
// `buscaDaUrl` e o que vem depois do `?`: "Cadastrar" no menu chega como `?cadastro=1`.
let buscaDaUrl = '';
vi.mock('wouter', () => ({
  useLocation: () => ['/auth', vi.fn()],
  useSearch: () => buscaDaUrl,
  Link: ({ children }: any) => <div>{children}</div>,
}));

// Auth Hook
const loginMock = vi.fn().mockResolvedValue(true);
const registerMock = vi.fn().mockResolvedValue(true);
const loginGoogleMock = vi.fn().mockResolvedValue({ status: 'registered' });

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    login: loginMock,
    register: registerMock,
    loginWithGoogle: loginGoogleMock,
  }),
}));

// Toast Hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Google OAuth
let opcoesDoGoogle: any;
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opcoes: any) => {
    opcoesDoGoogle = opcoes;
    return vi.fn();
  },
}));

// Query Client
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('AuthPage Login Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        buscaDaUrl = '';
    });

  it('?cadastro=1 abre direto o cadastro (o "Cadastrar" do menu)', async () => {
    buscaDaUrl = 'cadastro=1';
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Criar conta' })).toBeInTheDocument();
    });
  });

  it('o login já aparece na tela, sem modal, e envia o formulário', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('voce@exemplo.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('"Criar conta" abre o cadastro em modal e "Faça login" volta para o login', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    const modal = await screen.findByRole('dialog', { name: 'Criar conta' });

    fireEvent.click(within(modal).getByRole('button', { name: 'Faça login' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('o cadastro concluído fecha o modal e deixa o e-mail no login', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    const modal = await screen.findByRole('dialog', { name: 'Criar conta' });

    fireEvent.change(within(modal).getByPlaceholderText('Seu nome'), {
      target: { value: 'Pessoa Teste' },
    });
    fireEvent.change(within(modal).getByPlaceholderText('voce@exemplo.com'), {
      target: { value: 'pessoa.teste@example.com' },
    });
    fireEvent.change(within(modal).getByRole('combobox'), {
      target: { value: 'Feminino' },
    });
    const nascimento = modal.querySelector('input[type="date"]');
    if (!nascimento) throw new Error('Birth input not found');
    fireEvent.change(nascimento, { target: { value: '1990-01-01' } });
    fireEvent.change(within(modal).getByPlaceholderText('Mínimo 8 caracteres'), {
      target: { value: 'Senha123!' },
    });
    fireEvent.change(within(modal).getByPlaceholderText('Repita a senha'), {
      target: { value: 'Senha123!' },
    });
    const termos = document.getElementById('termos_aceitos');
    if (!termos) throw new Error('Terms checkbox not found');
    fireEvent.click(termos);
    fireEvent.click(within(modal).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByPlaceholderText('voce@exemplo.com')).toHaveValue('pessoa.teste@example.com');
  });

  it('fechar a janela do Google solta o botão', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste');
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    const google = screen.getByRole('button', { name: 'Fazer login com Google' });
    fireEvent.click(google);
    expect(google).toBeDisabled();

    act(() => opcoesDoGoogle.onNonOAuthError({ type: 'popup_closed' }));

    expect(google).toBeEnabled();
    vi.unstubAllEnvs();
  });

  it('o aviso de janela fechada não transforma um cadastro pelo Google em login', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'cliente-de-teste');
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    const modal = await screen.findByRole('dialog', { name: 'Criar conta' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Registrar com o Google' }));

    // O Google avisou "popup_closed" com a janela ainda aberta, antes do token chegar.
    act(() => opcoesDoGoogle.onNonOAuthError({ type: 'popup_closed' }));
    await act(() => opcoesDoGoogle.onSuccess({ access_token: 'token-de-teste' }));

    expect(loginGoogleMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'register', type: 'contratante' })
    );
    vi.unstubAllEnvs();
  });

  it('submits manual register as prestador when checkbox is checked', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Criar conta', { selector: 'button' }));

    fireEvent.change(screen.getByPlaceholderText('Seu nome'), {
      target: { value: 'Prestador Teste' },
    });

    const emailInput = within(screen.getByRole('dialog')).getByPlaceholderText('voce@exemplo.com');
    fireEvent.change(emailInput, {
      target: { value: 'prestador.teste@example.com' },
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Masculino' },
    });

    const birthInput = document.querySelector('input[type=\"date\"]');
    if (!birthInput) throw new Error('Birth input not found');
    fireEvent.change(birthInput, {
      target: { value: '1990-01-01' },
    });

    fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), {
      target: { value: 'Senha123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: 'Senha123!' },
    });

    const providerCheckbox = document.getElementById('sou-prestador');
    if (!providerCheckbox) throw new Error('Provider checkbox not found');
    fireEvent.click(providerCheckbox);

    const termsCheckbox = document.getElementById('termos_aceitos');
    if (!termsCheckbox) throw new Error('Terms checkbox not found');
    fireEvent.click(termsCheckbox);
    fireEvent.click(screen.getByText('Cadastrar', { selector: 'button' }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'prestador.teste@example.com',
          type: 'prestador',
        })
      );
    });
  });
});
