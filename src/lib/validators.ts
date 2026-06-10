// Validações reutilizadas no backend (server actions).

export function apenasDigitos(v: string): string {
  return (v || "").replace(/\D/g, "");
}

/** Valida CPF (com dígitos verificadores). */
export function cpfValido(cpfRaw: string): boolean {
  const cpf = apenasDigitos(cpfRaw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const calcDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = calcDigito(cpf.slice(0, 9), 10);
  const d2 = calcDigito(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/**
 * Normaliza um número para o formato whatsapp:+55...
 * Aceita entradas como "(11) 99999-0000", "11999990000", "+5511999990000".
 */
export function normalizarWhatsapp(numeroRaw: string): string {
  let n = apenasDigitos(numeroRaw);
  if (!n) return "";
  // Sem código de país -> assume Brasil (55).
  if (!n.startsWith("55") || n.length <= 11) {
    n = "55" + n;
  }
  return "+" + n;
}

export function whatsappValido(numeroRaw: string): boolean {
  const n = apenasDigitos(numeroRaw);
  return n.length >= 10 && n.length <= 15;
}

export function textoNaoVazio(v: unknown, min = 1): v is string {
  return typeof v === "string" && v.trim().length >= min;
}
