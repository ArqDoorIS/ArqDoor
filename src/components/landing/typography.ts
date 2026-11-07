// Escala única da landing: uma família (Inter, a do app), três pesos e os tamanhos abaixo.
// As seções só usam estes tokens. Regras e fontes: specs/features/2026-11-landing-header-e-tipografia.
// Tamanho explícito de propósito: text-lg, text-5xl e afins trazem entrelinha junto e, com breakpoint,
// passam por cima do leading-*.
export const landingType = {
  navLink: "text-[16px] font-medium leading-none",
  heroTitle: "text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-strong lg:text-[52px]",
  heroSpan: "mx-auto mt-2 block w-fit rounded-xl bg-brand px-4 py-1 text-white lg:mx-0",
  sectionTitle: "text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] lg:text-[36px]",
  cardTitle: "text-[18px] font-semibold leading-[1.3] lg:text-[20px]",
  body: "text-[16px] font-normal leading-relaxed lg:text-[18px]",
  subtitle: "mx-auto mt-3 max-w-[65ch] text-center text-[16px] font-normal leading-relaxed text-ink lg:text-[18px]",
  cardBody: "text-[16px] font-normal leading-relaxed",
  strong: "text-[16px] font-semibold leading-snug",
  small: "text-[14px] font-normal leading-relaxed",
  button: "text-[16px] font-semibold leading-none",
};
