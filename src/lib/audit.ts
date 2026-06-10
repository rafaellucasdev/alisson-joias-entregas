import "server-only";
import { supabaseAdmin } from "./supabase";
import { mascarar } from "./codigo";

type Contexto =
  | "retirada_codigo"
  | "retirada_cpf"
  | "motoboy_login"
  | "motoboy_liberacao";

/** Registra uma tentativa (sucesso ou falha) na tabela de auditoria. */
export async function registrarTentativa(params: {
  contexto: Contexto;
  identificador?: string;
  sucesso: boolean;
  detalhe?: string;
}): Promise<void> {
  const db = supabaseAdmin();
  await db.from("tentativas_log").insert({
    contexto: params.contexto,
    identificador: params.identificador ? mascarar(params.identificador) : null,
    sucesso: params.sucesso,
    detalhe: params.detalhe ?? null,
  });
}

/**
 * Rate limit simples baseado na tabela de log.
 * Bloqueia se houver >= `limite` tentativas FALHAS no contexto+identificador
 * dentro da janela (em minutos). Protege os fluxos sensíveis
 * ("esqueci o código" e login de motoboy) contra força bruta.
 */
export async function excedeuTentativas(params: {
  contexto: Contexto;
  identificador: string;
  limite?: number;
  janelaMin?: number;
}): Promise<boolean> {
  const { contexto, identificador, limite = 5, janelaMin = 10 } = params;
  const db = supabaseAdmin();
  const desde = new Date(Date.now() - janelaMin * 60_000).toISOString();

  const { count } = await db
    .from("tentativas_log")
    .select("id", { count: "exact", head: true })
    .eq("contexto", contexto)
    .eq("identificador", mascarar(identificador))
    .eq("sucesso", false)
    .gte("created_at", desde);

  return (count ?? 0) >= limite;
}
