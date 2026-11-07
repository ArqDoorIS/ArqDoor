/**
 * Header e padrão de fonte da landing (spec specs/features/2026-11-landing-header-e-tipografia).
 */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import tailwindConfig from '../../tailwind.config';
import { landingType } from '@/components/landing/typography';

const raiz = path.resolve(__dirname, '..', '..');
const ler = (relativo: string) => readFileSync(path.join(raiz, relativo), 'utf8');
const pasta = 'src/components/landing';
const secoes = readdirSync(path.join(raiz, pasta)).filter((nome) => nome.endsWith('.tsx'));

describe('header da landing', () => {
  const header = ler(`${pasta}/LandingHeader.tsx`);

  it('tem 56 px no celular e 64 no desktop, sem mudar ao rolar', () => {
    expect(header).toContain('h-14');
    expect(header).toContain('md:h-16');
    expect(header).not.toMatch(/isScrolled|h-\[80px\]|h-\[70px\]/);
  });

  it('o botão e o menu têm 40 px, o toque mínimo de 1 cm', () => {
    expect(header.match(/\bh-10\b/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('separa da página com uma linha, sem sombra', () => {
    expect(header).toContain('border-b border-line');
    expect(header).not.toContain('shadow');
  });

  it('o logo fica proporcional à altura', () => {
    expect(header).toContain('h-6 w-auto md:h-7');
  });
});

describe('fonte da landing', () => {
  it('é a Inter, a mesma do app, servida pelo nosso domínio', () => {
    const familias = (tailwindConfig as any).theme.extend.fontFamily;
    expect(familias.inter[0]).toBe('"Inter Variable"');
    const home = ler('src/pages/Home.tsx');
    expect(home).toContain('@fontsource-variable/inter');
    expect(home).toContain('font-inter');
  });

  it('o site não pede mais fontes ao Google', () => {
    expect(ler('index.html')).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it('as seções só usam os tokens de typography.ts', () => {
    const solto = /(?:^|[\s"'`])(?:[a-z]+:)*(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|\[\d+(?:\.\d+)?px\])|font-(?:thin|light|normal|medium|semibold|bold|extrabold)|leading-\S+|tracking-\S+)(?=[\s"'`])/;
    for (const nome of secoes) {
      const achado = ler(`${pasta}/${nome}`).match(solto)?.[0]?.trim() ?? null;
      expect({ nome, achado }).toEqual({ nome, achado: null });
    }
  });

  it('a escala tem só os tamanhos previstos, nenhum abaixo de 14 px', () => {
    const texto = Object.values(landingType).join(' ');
    const tamanhos = Array.from(texto.matchAll(/text-\[(\d+)px\]/g), (m) => Number(m[1]));
    expect(Array.from(new Set(tamanhos)).sort((a, b) => a - b)).toEqual([14, 16, 18, 20, 28, 34, 36, 52]);
    // Tamanho com nome (text-lg) traz entrelinha junto e passa por cima do leading.
    expect(texto).not.toMatch(/text-(?:xs|sm|base|lg|xl|[2-9]xl)\b/);
  });

  it('usa só três pesos', () => {
    const texto = Object.values(landingType).join(' ');
    const pesos = new Set(Array.from(texto.matchAll(/font-(\w+)/g), (m) => m[1]));
    expect(Array.from(pesos).sort()).toEqual(['medium', 'normal', 'semibold']);
  });

  it('texto corrido tem entrelinha de pelo menos 1,5', () => {
    for (const token of [landingType.body, landingType.subtitle, landingType.cardBody, landingType.small]) {
      expect(token).toContain('leading-relaxed');
    }
  });

  it('o subtítulo limita o tamanho da linha', () => {
    expect(landingType.subtitle).toContain('max-w-[65ch]');
  });

  it('o destaque do título segue o título: só a cor muda, sem caixa', () => {
    expect(landingType.heroSpan).toContain('text-brand');
    expect(landingType.heroSpan).not.toMatch(/\bbg-|\bpx-|\bpy-|\brounded/);
  });

  it('todo H2 usa o mesmo token', () => {
    for (const nome of ['LandingFeaturesSection', 'LandingEscrowSection', 'LandingComparisonSection', 'LandingFinalCTASection', 'LandingProductPreviewSection']) {
      expect({ nome, usa: ler(`${pasta}/${nome}.tsx`).includes('landingType.sectionTitle') }).toEqual({ nome, usa: true });
    }
  });
});

describe('imagens da landing', () => {
  it('as imagens grandes reservam o espaço antes de carregar, para a página não pular', () => {
    for (const [nome, imagem] of [
      ['LandingHeroSection', 'Imagem_pag1.png'],
      ['LandingProductPreviewSection', 'arqdoor_links.png'],
      ['LandingEscrowSection', 'esquema_escrow.png'],
    ]) {
      const tag = ler(`${pasta}/${nome}.tsx`).match(new RegExp(`<img[^>]*${imagem}[^>]*/>`))?.[0] ?? '';
      expect({ imagem, largura: /width=\{\d+\}/.test(tag), altura: /height=\{\d+\}/.test(tag) }).toEqual({ imagem, largura: true, altura: true });
    }
  });
});

describe('contraste da landing', () => {
  it('texto laranja pequeno em fundo claro usa o brand-dark', () => {
    expect(ler(`${pasta}/LandingHeroSection.tsx`)).toContain('text-brand-dark');
    expect(ler(`${pasta}/LandingFinalCTASection.tsx`)).toContain('text-brand-dark');
  });

  it('texto sobre laranja é branco puro, sem transparência', () => {
    for (const nome of ['LandingFooter', 'LandingEscrowSection', 'LandingFinalCTASection']) {
      const codigo = ler(`${pasta}/${nome}.tsx`);
      expect({ nome, achado: codigo.match(/text-brand-(?:soft|tint)\b/)?.[0] ?? null }).toEqual({ nome, achado: null });
    }
    expect(ler(`${pasta}/LandingFooter.tsx`)).not.toMatch(/(?:^|\s)opacity-(?:80|90)/m);
  });
});
