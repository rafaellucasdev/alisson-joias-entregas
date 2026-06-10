"use server";

import { supabaseAdmin } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

/**
 * Exclui um pedido (venda) e todos os dados relacionados.
 * As tabelas de auditoria (autorizacoes) não têm ON DELETE CASCADE de
 * propósito, então removemos as referências antes de apagar a venda.
 * O restante (itens_venda, entregas, itens_entrega, entrega_eventos) cai por cascade.
 */
export async function excluirPedido(
  vendaId: string,
): Promise<ActionResult<{ vendaId: string }>> {
  if (!vendaId || typeof vendaId !== "string") {
    return { ok: false, erro: "Pedido inválido." };
  }

  const db = supabaseAdmin();

  // Confirma que a venda existe.
  const { data: venda } = await db
    .from("vendas")
    .select("id")
    .eq("id", vendaId)
    .maybeSingle();
  if (!venda) {
    return { ok: false, erro: "Pedido não encontrado." };
  }

  // Entregas vinculadas.
  const { data: entregas } = await db
    .from("entregas")
    .select("id")
    .eq("venda_id", vendaId);
  const entregaIds = (entregas ?? []).map((e) => e.id);

  // Exclusão explícita em ordem bottom-up — robusta independente das FKs
  // terem ON DELETE CASCADE ou não.
  await db.from("autorizacoes").delete().eq("venda_id", vendaId);
  if (entregaIds.length > 0) {
    await db.from("autorizacoes").delete().in("entrega_id", entregaIds);
    await db.from("entrega_eventos").delete().in("entrega_id", entregaIds);
    await db.from("itens_entrega").delete().in("entrega_id", entregaIds);
  }
  await db.from("entregas").delete().eq("venda_id", vendaId);
  await db.from("itens_venda").delete().eq("venda_id", vendaId);

  const { error } = await db.from("vendas").delete().eq("id", vendaId);
  if (error) {
    return { ok: false, erro: "Não foi possível excluir o pedido." };
  }

  return { ok: true, data: { vendaId } };
}
