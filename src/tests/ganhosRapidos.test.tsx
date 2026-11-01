import { render, screen } from '@testing-library/react';
import { emIframeDeFora } from '@/lib/emIframeDeFora';
import NotFound from '@/pages/not-found';

// Spec specs/features/2026-11-site-ganhos-rapidos.

vi.mock('wouter', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

const janela = (opcoes: { topo: 'mesma' | 'outra-origem' | 'nenhum' }) => {
  const propria = { location: { origin: 'https://arqdoor.com' } } as any;
  propria.self = propria;
  if (opcoes.topo === 'nenhum') {
    propria.top = propria;
  } else if (opcoes.topo === 'mesma') {
    propria.top = { location: { origin: 'https://arqdoor.com' } };
  } else {
    // Como o navegador faz: ler a localização de outra origem lança erro.
    propria.top = {
      get location(): Location {
        throw new DOMException('Blocked a frame with origin', 'SecurityError');
      },
    };
  }
  return propria as Window;
};

describe('emIframeDeFora (CA-05)', () => {
  it('aberto direto: não está em iframe', () => {
    expect(emIframeDeFora(janela({ topo: 'nenhum' }))).toBe(false);
  });

  it('iframe da mesma origem continua liberado', () => {
    expect(emIframeDeFora(janela({ topo: 'mesma' }))).toBe(false);
  });

  it('iframe de outra origem é barrado', () => {
    expect(emIframeDeFora(janela({ topo: 'outra-origem' }))).toBe(true);
  });
});

describe('404 (CA-07)', () => {
  it('em português e com saída para o início', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/forget to add the page/i)).not.toBeInTheDocument();
  });
});
