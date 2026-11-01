import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    login: loginMock,
    register: registerMock,
    loginWithGoogle: vi.fn(),
  }),
}));

// Toast Hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Google OAuth
vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: () => vi.fn(),
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

  it('opens login modal and submits form', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthPage />
      </QueryClientProvider>
    );

    // 1. Click "Entrar" button on the page
    // There are multiple "Entrar" buttons? No, just one main one.
    // Text: "Entrar"
    const entrarButton = screen.getByText('Entrar', { selector: 'button' });
    fireEvent.click(entrarButton);

    // 2. Expect Dialog to be open
    // Look for unique text in Login Modal: "Entre com seu e‑mail e senha."
    expect(screen.getByText('Entre com seu e‑mail e senha.')).toBeInTheDocument();

    // 3. Fill Form
    // Inputs: Email, Password
    // Using placeholders or labels
    const emailInput = screen.getByPlaceholderText('voce@exemplo.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // 4. Submit
    // Button "Entrar" inside the form (type="submit")
    // Note: The main page button is also "Entrar". The modal button is also "Entrar".
    // We can target specific button or just get all and click last?
    // Or use within().
    // The Modal Entrar button has "Entrar" text.
    // Let's rely on standard queries to find the Submit button *visible* in dialog.
    // Since only one dialog is open, screen.getByRole('button', { name: 'Entrar' }) might be ambiguous if the page button is still in DOM (it is).
    // The Modal covers it.
    // Let's verify finding by text inside a form.
    
    const submitButton = screen.getAllByText('Entrar', { selector: 'button' }).find(btn => btn.getAttribute('type') === 'submit');
    
    if (!submitButton) throw new Error('Submit button not found');
    fireEvent.click(submitButton);

    // 5. Verify Login called
    await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
    });
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

    const emailInput = screen.getAllByPlaceholderText('voce@exemplo.com')[0];
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
