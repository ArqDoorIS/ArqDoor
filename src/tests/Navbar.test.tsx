import { render, screen } from '@testing-library/react';
import Navbar from '../components/Navbar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Wouter
vi.mock('wouter', () => ({
  Link: ({ children }: any) => <div>{children}</div>,
  useLocation: () => ['/', vi.fn()],
}));

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null, 
    isLoading: false,
    isLoggedIn: false
  })
}));

// Mock useUnreadCount
vi.mock('@/hooks/use-unread-count', () => ({
  useUnreadCount: () => 0
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('Navbar Component', () => {
  it('renders ArqDoor logo', () => {
    render(
        <QueryClientProvider client={queryClient}>
            <Navbar />
        </QueryClientProvider>
    );
    
    // A logo virou imagem (`/images/landing/logo.png`), entao ela nao e mais TEXTO na
    // pagina. O teste continuava procurando texto e falhava desde essa troca. Procurar
    // pelo alt tambem guarda a acessibilidade: logo sem alt volta a quebrar aqui.
    expect(screen.getByAltText(/ArqDoor/i)).toBeInTheDocument();
  });
});
