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

describe('uma barra de navegação por tela', () => {
  // O App.tsx já aplica o ApplicationLayout (com a barra) a toda rota logada. Tela que
  // importa o layout ou a barra de novo ganha uma segunda, escondida atrás da primeira:
  // eram 10, e duas escaparam de uma busca por "<ApplicationLayout" (nome trocado no
  // import e um MessagesLayout com barra própria).
  it('nenhuma tela importa o ApplicationLayout nem a Navbar', () => {
    const fontes = import.meta.glob(['/src/pages/**/*.tsx', '/src/features/**/*.tsx'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    expect(Object.keys(fontes).length).toBeGreaterThan(20);
    const comBarra = Object.entries(fontes)
      .filter(([, codigo]) => /components\/(layouts\/ApplicationLayout|Navbar)["']/.test(codigo))
      .map(([arquivo]) => arquivo);
    expect(comBarra).toEqual([]);
  });

  it('só o ApplicationLayout desenha a barra', () => {
    const layouts = import.meta.glob('/src/components/layouts/*.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const desenham = Object.entries(layouts)
      .filter(([, codigo]) => /<Navbar\b/.test(codigo))
      .map(([arquivo]) => arquivo);
    expect(desenham).toEqual(['/src/components/layouts/ApplicationLayout.tsx']);
  });
});
