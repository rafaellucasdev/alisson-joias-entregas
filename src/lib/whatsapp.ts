import "server-only";
import twilio from "twilio";
import { normalizarWhatsapp } from "./validators";

const NOME_LOJA = process.env.NOME_LOJA || "Mercado HoldPrint";

type Resultado =
  | { enviado: true; sid: string }
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

/**
 * Envia o código de retirada via WhatsApp (Twilio Sandbox).
 * Nunca lança: se o Twilio não estiver configurado ou falhar, a venda
 * continua válida e devolvemos o motivo para exibir na confirmação.
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
    const to = "whatsapp:" + normalizarWhatsapp(params.para);
    const msg = await client.messages.create({
      from,
      to,
      body: montarMensagem(params),
    });
    return { enviado: true, sid: msg.sid };
  } catch (err) {
    const motivo = err instanceof Error ? err.message : "erro desconhecido";
    console.error("[whatsapp] falha ao enviar:", motivo);
    return { enviado: false, motivo };
  }
}
