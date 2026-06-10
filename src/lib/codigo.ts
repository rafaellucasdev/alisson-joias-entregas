import { randomInt } from "node:crypto";

// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para leitura humana.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Código de retirada aleatório e NÃO sequencial.
 * Usa crypto.randomInt (CSPRNG). Default 7 chars (> mínimo de 6).
 */
export function gerarCodigoRetirada(tamanho = 7): string {
  let out = "";
  for (let i = 0; i < tamanho; i += 1) {
    out += ALFABETO[randomInt(ALFABETO.length)];
  }
  return out;
}

/** Mascara um identificador para gravar em log sem expor o valor inteiro. */
export function mascarar(valor: string): string {
  if (!valor) return "";
  if (valor.length <= 4) return "*".repeat(valor.length);
  return valor.slice(0, 2) + "*".repeat(valor.length - 4) + valor.slice(-2);
}
