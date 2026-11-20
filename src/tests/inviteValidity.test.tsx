import {
  VALIDADES_DO_CONVITE,
  VALIDADE_PADRAO,
  falhaDoConvitePublico,
  formatInviteExpiry,
} from "@/lib/invite-validity";

// Validade do link de proposta (spec 2026-09-convite-validade).
// As telas de link vencido e inexistente estão em conviteWeb.test.tsx.

describe("validade do convite", () => {
  it("oferece 1h, 24h, 3d e 7d, com 24h de padrao (igual ao backend)", () => {
    expect(VALIDADES_DO_CONVITE.map((v) => v.value)).toEqual(["1h", "24h", "3d", "7d"]);
    expect(VALIDADE_PADRAO).toBe("24h");
  });

  it("formata no horario de Brasilia e ignora data invalida", () => {
    expect(formatInviteExpiry("2026-09-28T17:30:00.000Z")).toBe("28/09, 14:30");
    expect(formatInviteExpiry("nada")).toBeNull();
    expect(formatInviteExpiry(null)).toBeNull();
  });

  it("so 404 e 410 viram falha conhecida", () => {
    expect(falhaDoConvitePublico(404, {})).toEqual({ tipo: "nao_encontrado" });
    expect(falhaDoConvitePublico(410, { expired: true, invite: { title: "X" } })).toMatchObject({ tipo: "expirado", titulo: "X" });
    expect(falhaDoConvitePublico(500, {})).toBeNull();
  });
});
