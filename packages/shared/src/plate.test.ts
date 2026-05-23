import { describe, expect, it } from "vitest";
import {
  detectPlateFormat,
  formatPlate,
  formatPlateInput,
  validateBrazilianPlate,
} from "./index.js";

describe("validateBrazilianPlate", () => {
  it("aceita Mercosul ABC1D23", () => {
    const r = validateBrazilianPlate("ABC1D23");
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("ABC1D23");
    expect(r.format).toBe("mercosul");
  });

  it("aceita Mercosul com hífen", () => {
    const r = validateBrazilianPlate("ABC-1D23");
    expect(r.ok).toBe(true);
    expect(r.format).toBe("mercosul");
  });

  it("aceita padrão antigo ABC1234 (3 letras + 4 números)", () => {
    const r = validateBrazilianPlate("ABC1234");
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("ABC1234");
    expect(r.format).toBe("legacy");
  });

  it("aceita antiga com hífen", () => {
    const r = validateBrazilianPlate("xyz-9876");
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("XYZ9876");
    expect(r.format).toBe("legacy");
  });

  it("rejeita 3 letras + 3 números", () => {
    expect(validateBrazilianPlate("ABC123").ok).toBe(false);
  });

  it("rejeita Mercosul inválido na posição da letra", () => {
    expect(validateBrazilianPlate("ABC12D3").ok).toBe(false);
  });
});

describe("formatPlate", () => {
  it("formata antiga", () => {
    expect(formatPlate("ABC1234")).toBe("ABC-1234");
  });

  it("formata Mercosul", () => {
    expect(formatPlate("ABC1D23")).toBe("ABC-1D23");
  });
});

describe("formatPlateInput", () => {
  it("insere hífen após 3 caracteres", () => {
    expect(formatPlateInput("abc1234")).toBe("ABC-1234");
  });
});

describe("detectPlateFormat", () => {
  it("distingue formatos", () => {
    expect(detectPlateFormat("ABC1234")).toBe("legacy");
    expect(detectPlateFormat("ABC1D23")).toBe("mercosul");
    expect(detectPlateFormat("AB12CD3")).toBe(null);
  });
});
