import {
  formatPlate,
  normalizePlateInput,
  validateBrazilianPlate,
} from "@lava-rapido/shared";

export { formatPlate as formatPlateDisplay, normalizePlateInput as normalizePlate };

export function isValidBrazilianPlate(normalizedSevenChars: string): boolean {
  return validateBrazilianPlate(normalizedSevenChars).ok;
}
