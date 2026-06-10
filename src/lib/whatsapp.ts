import "server-only";
import twilio from "twilio";
import { normalizarWhatsapp } from "./validators";

const NOME_LOJA = process.env.NOME_LOJA || "Mercado HoldPrint";

type Resultado =
  | { enviado: true; sid: string; status: string; numeroUsado: string }
  | { enviado: false; motivo: string };

function montarMensagem(params: {
  nomeCliente: string;
  codigo: string;
  tipoEntrega: "retirada" | "motoboy";
}): string {
  const { nomeCliente, codigo, tipoEntrega } = params;
  const instrucao =
    tipoEntrega === "retirada"
      ? "🏬 *Retirada na loja*: apresente este código no balcão de retirada."
      : "🛵 *Entrega por motoboy*: informe este código ao entregador para liberar seus itens.";

  return [
    `*${NOME_LOJA}*`,
    ``,
    `Olá, ${nomeCliente}! Sua compra foi registrada. ✅`,
    ``,
    `Seu código de retirada é:`,
    `*${codigo}*`,
    ``,
    instrucao,
    ``,
    `_Guarde este código. Ele é necessário para receber seus itens._`,
  ].join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gera as variantes de um número BR para contornar a pegadinha do 9º dígito:
 * o WhatsApp pode registrar o número com OU sem o 9 após o DDD. Retornamos
 * a forma informada e a alternativa, para tentar entregar de qualquer jeito.
 */
function variantesNumero(e164: string): string[] {
  const d = e164.replace(/\D/g, "");
  const variantes = [e164];
  if (d.startsWith("55") && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const resto = d.slice(4);
    if (resto.length === 9 && resto.startsWith("9")) {
      variantes.push(`+55${ddd}${resto.slice(1)}`); // sem o 9
    } else if (resto.length === 8) {
      variantes.push(`+55${ddd}9${resto}`); // com o 9
    }
  }
  return Array.from(new Set(variantes));
}

const STATUS_OK = ["delivered", "read", "sent"];
const STATUS_FALHA = ["failed", "undelivered"];

/** Cria a mensagem e aguarda o status terminal (a falha do sandbox é assíncrona). */
async function enviarEConfirmar(
  client: twilio.Twilio,
  from: string,
  to: string,
  body: string,
): Promise<{ sid: string; status: string }> {
  const msg = await client.messages.create({ from, to: `whatsapp:${to}`, body });
  let status = msg.status as string;
  // Poll curto: só bloqueia quando precisa (até ~6s).
  for (let i = 0; i < 6 && !STATUS_OK.includes(status) && !STATUS_FALHA.includes(status); i += 1) {
    await sleep(1000);
    const atual = await client.messages(msg.sid).fetch();
    status = atual.status as string;
  }
  return { sid: msg.sid, status };
}

/**
 * Envia o código por WhatsApp (Twilio). Nunca lança. Confirma a entrega e,
 * em caso de falha num número BR, tenta a variante com/sem o 9º dígito.
 */
export async function enviarCodigoWhatsApp(params: {
  para: string;
  nomeCliente: string;
  codigo: string;
  tipoEntrega: "retirada" | "motoboy";
}): Promise<Resultado> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    return { enviado: false, motivo: "Twilio não configurado (.env)" };
  }

  try {
    const client = twilio(sid, token);
    const body = montarMensagem(params);
    const base = normalizarWhatsapp(params.para);

    let ultimoStatus = "";
    for (const numero of variantesNumero(base)) {
      const { sid: msgSid, status } = await enviarEConfirmar(client, from, numero, body);
      ultimoStatus = status;
      if (!STATUS_FALHA.includes(status)) {
        return { enviado: true, sid: msgSid, status, numeroUsado: numero };
      }
      // falhou nesta variante -> tenta a próxima (ex.: 9º dígito)
    }
    return { enviado: false, motivo: `Falha na entrega (status: ${ultimoStatus})` };
  } catch (err) {
    const motivo = err instanceof Error ? err.message : "erro desconhecido";
    console.error("[whatsapp] falha ao enviar:", motivo);
    return { enviado: false, motivo };
  }
}
