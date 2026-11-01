import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import DemandsFeed from '../pages/DemandsFeed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as queryClientLib from '@/lib/queryClient';

// --- Mocks ---

vi.mock('wouter', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useLocation: () => ['/demands', vi.fn()],
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 1 },
    isLoading: false,
  }),
}));

const mockDemands = [
  {
    id_demand: 1,
    title: 'Demanda Mockada',
    description: 'Descrição da demanda de teste',
    price: 3000.00,
    createdAt: new Date().toISOString(),
    id_user: 3,
    User: {
      id: 3,
      name: 'Client Name',
      email: 'client@test.com',
      perfil: 'avatar.png'
    }
  }
];

// Segunda pagina com uma demanda que nao esta entre as mais novas: o site pedia so a
// primeira e nunca a mostrava (spec 2026-11-site-ganhos-rapidos).
const demandaDaPaginaDois = {
  ...mockDemands[0],
  id_demand: 2,
  title: 'Demanda Antiga Da Pagina Dois',
};
const pedidas: string[] = [];

vi.spyOn(queryClientLib, 'apiRequest').mockImplementation(async (method: string, url: string) => {
  pedidas.push(url);
  if (url === '/demands/getall?page=1&limit=100') {
    return {
      ok: true,
      json: async () => ({ demands: mockDemands, pagination: { page: 1, totalPages: 2 } })
    } as Response;
  }
  if (url === '/demands/getall?page=2&limit=100') {
    return {
      ok: true,
      json: async () => ({ demands: [demandaDaPaginaDois], pagination: { page: 2, totalPages: 2 } })
    } as Response;
  }
  return { ok: false } as Response;
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('DemandsFeed Component', () => {
  it('renders demands list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DemandsFeed />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Demanda Mockada')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Client Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s?3\.000,00/).length).toBeGreaterThan(0);
  });

  it('CA-03: traz todas as paginas do servidor, nao so as mais novas', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DemandsFeed />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Demanda Antiga Da Pagina Dois')).toBeInTheDocument();
    });
    expect(pedidas).toContain('/demands/getall?page=2&limit=100');
    expect(pedidas).not.toContain('/demands/getall?page=3&limit=100');
  });
});
