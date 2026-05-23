/**
 * Contratos compartilhados entre apps (API, web, ferramentas).
 */

/** IDs fixos usados na demo e nos seeds/tests (tenant + filiais + amostras). */
export const DEMO_IDS = {
  tenantId: "11111111-1111-4111-8111-111111111101",
  branchCentroId: "22222222-2222-4222-8222-222222222201",
  branchNorteId: "22222222-2222-4222-8222-222222222202",
  washTypeSimpleId: "33333333-3333-4333-8333-333333333301",
  washTypeCompletoId: "33333333-3333-4333-8333-333333333302",
  washTypeDetalheId: "33333333-3333-4333-8333-333333333303",
  customerJoaoId: "44444444-4444-4444-8444-444444444401",
  customerMariaId: "44444444-4444-4444-8444-444444444402",
  vehicleEntry1Id: "55555555-5555-4555-8555-555555555501",
  vehicleEntry2Id: "55555555-5555-4555-8555-555555555502",
} as const;

/** Status da ordem na esteira/board. */
export enum VehicleStatus {
  RECEBIDO = "recebido",
  FILA = "fila",
  LAVANDO = "lavando",
  SECANDO = "secando",
  PRONTO = "pronto",
  ENTREGUE = "entregue",
  CANCELADO = "cancelado",
}

/** Colunas Kanban principal (exceto estado finalizado/cancelados). */
export const PIPELINE_COLUMNS: readonly VehicleStatus[] = [
  VehicleStatus.RECEBIDO,
  VehicleStatus.FILA,
  VehicleStatus.LAVANDO,
  VehicleStatus.SECANDO,
  VehicleStatus.PRONTO,
];

/** Padrão antigo: 3 letras + 4 números (ABC1234). */
export const LEGACY_PLATE_REGEX = /^[A-Z]{3}[0-9]{4}$/;

/** Padrão Mercosul: 3 letras + 1 número + 1 letra + 2 números (ABC1D23). */
export const MERCOSUL_PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export type PlateFormat = "legacy" | "mercosul";

export interface PlateValidationResult {
  ok: boolean;
  /** Apenas dígitos e letras (sem hífen) em maiúsculas. */
  normalized?: string;
  format?: PlateFormat;
  reason?: string;
}

/** @deprecated Use PlateValidationResult */
export type MercosulValidationResult = PlateValidationResult;

/** Remove não alfanuméricos e põe em maiúsculas. */
export function normalizePlateInput(input: string): string {
  return input.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

/** Formata entrada enquanto digita: AAA-9999 ou ABC-1D23 (máx. 7 chars). */
export function formatPlateInput(input: string): string {
  const raw = normalizePlateInput(input).slice(0, 7);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export function detectPlateFormat(normalized: string): PlateFormat | null {
  if (normalized.length !== 7) return null;
  if (MERCOSUL_PLATE_REGEX.test(normalized)) return "mercosul";
  if (LEGACY_PLATE_REGEX.test(normalized)) return "legacy";
  return null;
}

export function plateFormatLabel(format: PlateFormat): string {
  return format === "mercosul" ? "Mercosul" : "Padrão antigo";
}

/**
 * Valida placa brasileira: **Mercosul** (ABC1D23) ou **antiga** (3 letras + 4 números, ex. ABC1234).
 */
export function validateBrazilianPlate(plate: string): PlateValidationResult {
  const raw = normalizePlateInput(plate);

  if (raw.length !== 7) {
    return {
      ok: false,
      reason:
        "A placa deve ter 7 caracteres: Mercosul (ABC1D23) ou antiga (ABC1234).",
    };
  }

  const format = detectPlateFormat(raw);
  if (!format) {
    return {
      ok: false,
      reason:
        "Formato inválido. Use Mercosul (ABC1D23) ou antiga — 3 letras + 4 números (ABC1234).",
    };
  }

  return { ok: true, normalized: raw, format };
}

/** Alias histórico — aceita Mercosul e padrão antigo. */
export const validateMercosulPlate = validateBrazilianPlate;

/** Formata placa normalizada com hífen (ABC-1234 ou ABC-1D23). */
export function formatPlate(normalized: string): string {
  const raw = normalizePlateInput(normalized);
  if (raw.length !== 7) return normalized.trim().toUpperCase();
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export type UserRole = "admin" | "user";

/** Métodos de pagamento aceitos pela API MVP. */
export type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "cartao_debito"
  | "cartao_credito";

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "dinheiro",
  "pix",
  "cartao_debito",
  "cartao_credito",
] as const;

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "dinheiro":
      return "Dinheiro";
    case "pix":
      return "Pix";
    case "cartao_debito":
      return "Cartão débito";
    case "cartao_credito":
      return "Cartão crédito";
    default:
      return method;
  }
}

export interface JwtLikeClaims {
  sub: string;
  tenant_id: string;
  role: UserRole;
  /** Filiais permitidas; ausência ou "*" significa todas (somente para admin em dev JWT). */
  branch_ids?: string[];
  default_branch_id?: string | null;
}
