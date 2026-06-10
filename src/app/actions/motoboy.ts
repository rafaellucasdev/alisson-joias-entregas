"use server";

import { supabaseAdmin } from "@/lib/supabase";
import {
  carregarEntregasPorMotoboy,
  carregarEntregaPorId,
  carregarEntregaPorCodigo,
} from "@/lib/queries";
import { registrarTentativa, excedeuTentativas } from "@/lib/audit";
import { textoNaoVazio } from "@/lib/validators";
import type { ActionResult, VendaResumo } from "@/lib/types";

type MotoboyInfo = { id: string; nome: string };

/**
 * Valida o código do motoboy no backend. Retorna o registro APENAS se
 * existir e estiver ativo. Função interna reutilizada por todas as ações —
 * é o ponto único que garante "motoboy só vê as próprias entregas".
 */
async function validarMotoboy(codigoRaw: string): Promise<MotoboyInfo | null> {
  const codigo = (codigoRaw || "").trim().toUpperCase();
  if (codigo.length < 4) return null;
  const db = supabaseAdmin();
  const { data } = await db
    .from("motoboys")
    .select("id, nome, ativo")
    .eq("codigo", codigo)
    .maybeSingle();
  if (!data || !data.ativo) return null;
  return { id: data.id, nome: data.nome };
}

/** Login do motoboy: devolve seus dados + SOMENTE as entregas atribuídas a ele. */
export async function loginMotoboy(
  codigo: string,
): Promise<ActionResult<{ motoboy: MotoboyInfo; entregas: VendaResumo[] }>> {
  const cod = (codigo || "").trim().toUpperCase();

  if (await excedeuTentativas({ contexto: "motoboy_login", identificador: cod })) {
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const motoboy = await validarMotoboy(cod);
  if (!motoboy) {
    await registrarTentativa({
      contexto: "motoboy_login",
      identificador: cod,
      sucesso: false,
      detalhe: "código de motoboy inválido",
    });
    return { ok: false, erro: "Código de motoboy inválido." };
  }

  await registrarTentativa({ contexto: "motoboy_login", identificador: cod, sucesso: true });
  const entregas = await carregarEntregasPorMotoboy(motoboy.id);
  return { ok: true, data: { motoboy, entregas } };
}

/**
 * Libera a retirada dos itens: exige código do motoboy E código do cliente,
 * AMBOS válidos, e a entrega precisa estar atribuída a esse motoboy.
 */
export async function liberarEntrega(input: {
  codigoMotoboy: string;
  codigoCliente: string;
}): Promise<ActionResult<VendaResumo>> {
  const codMotoboy = (input?.codigoMotoboy || "").trim().toUpperCase();
  const codCliente = (input?.codigoCliente || "").trim().toUpperCase();

  if (await excedeuTentativas({ contexto: "motoboy_liberacao", identificador: codMotoboy })) {
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const motoboy = await validarMotoboy(codMotoboy);
  if (!motoboy) {
    await registrarTentativa({
      contexto: "motoboy_liberacao",
      identificador: codMotoboy,
      sucesso: false,
      detalhe: "código de motoboy inválido",
    });
    return { ok: false, erro: "Código de motoboy inválido." };
  }

  const resumo = await carregarEntregaPorCodigo(codCliente);
  // Precisa existir, ser do tipo motoboy E estar atribuída a ESTE motoboy.
  if (!resumo || resumo.tipoEntrega !== "motoboy") {
    await registrarTentativa({
      contexto: "motoboy_liberacao",
      identificador: codMotoboy,
      sucesso: false,
      detalhe: "código do cliente inválido",
    });
    return { ok: false, erro: "Código do cliente inválido." };
  }

  const dono = await entregaPertenceAoMotoboy(resumo.entregaId, motoboy.id);
  if (!dono) {
    await registrarTentativa({
      contexto: "motoboy_liberacao",
      identificador: codMotoboy,
      sucesso: false,
      detalhe: "entrega não pertence a este motoboy",
    });
    return { ok: false, erro: "Esta entrega não está atribuída a você." };
  }

  await registrarTentativa({
    contexto: "motoboy_liberacao",
    identificador: codMotoboy,
    sucesso: true,
    detalhe: `entrega ${resumo.entregaId}`,
  });
  return { ok: true, data: resumo };
}

async function entregaPertenceAoMotoboy(
  entregaId: string,
  motoboyId: string,
): Promise<boolean> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("entregas")
    .select("id")
    .eq("id", entregaId)
    .eq("motoboy_id", motoboyId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Registra a entrega (parcial ou total).
 * `itensEntreguesIds` = ids de itens_entrega marcados como entregues nesta etapa.
 * Revalida no backend que a entrega é deste motoboy e que os itens pertencem a ela.
 */
export async function registrarEntrega(input: {
  codigoMotoboy: string;
  entregaId: string;
  itensEntreguesIds: string[];
  observacao?: string;
}): Promise<ActionResult<VendaResumo>> {
  const codMotoboy = (input?.codigoMotoboy || "").trim().toUpperCase();

  const motoboy = await validarMotoboy(codMotoboy);
  if (!motoboy) {
    return { ok: false, erro: "Código de motoboy inválido." };
  }
  if (!input.entregaId) {
    return { ok: false, erro: "Entrega não informada." };
  }
  if (!(await entregaPertenceAoMotoboy(input.entregaId, motoboy.id))) {
    return { ok: false, erro: "Esta entrega não está atribuída a você." };
  }

  const db = supabaseAdmin();
  const agora = new Date().toISOString();

  // Itens válidos DESTA entrega (evita marcar itens de outra entrega).
  const { data: itensDb } = await db
    .from("itens_entrega")
    .select("id, entregue")
    .eq("entrega_id", input.entregaId);

  const idsValidos = new Set((itensDb ?? []).map((i) => i.id));
  const aEntregar = (input.itensEntreguesIds || []).filter((id) => idsValidos.has(id));

  const obs = textoNaoVazio(input.observacao) ? input.observacao!.trim() : null;

  if (aEntregar.length > 0) {
    await db
      .from("itens_entrega")
      .update({ entregue: true, entregue_em: agora, observacao: obs })
      .in("id", aEntregar);
  }

  // Recarrega para recalcular a situação da entrega.
  const { data: itensApos } = await db
    .from("itens_entrega")
    .select("entregue")
    .eq("entrega_id", input.entregaId);

  const total = (itensApos ?? []).length;
  const entregues = (itensApos ?? []).filter((i) => i.entregue).length;
  const pendentes = total - entregues;

  const novaSituacao =
    entregues === 0 ? "pendente" : pendentes === 0 ? "concluida" : "parcial";

  await db
    .from("entregas")
    .update({
      situacao: novaSituacao,
      concluida_em: novaSituacao === "concluida" ? agora : null,
    })
    .eq("id", input.entregaId);

  // Atualiza a venda conforme o andamento da entrega.
  const resumoAtual = await carregarEntregaPorId(input.entregaId);
  if (resumoAtual) {
    const situacaoVenda =
      novaSituacao === "concluida"
        ? "concluida"
        : entregues > 0
          ? "em_entrega"
          : "aguardando";
    await db.from("vendas").update({ situacao: situacaoVenda }).eq("id", resumoAtual.vendaId);
  }

  // Auditoria do evento de entrega.
  await db.from("entrega_eventos").insert({
    entrega_id: input.entregaId,
    motoboy_id: motoboy.id,
    itens_entregues: aEntregar.length,
    itens_pendentes: pendentes,
    observacao: obs,
  });

  const resumo = await carregarEntregaPorId(input.entregaId);
  if (!resumo) return { ok: false, erro: "Erro ao recarregar a entrega." };
  return { ok: true, data: resumo };
}
