"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { carregarEntregaPorCodigo, carregarEntregaPorVendaId } from "@/lib/queries";
import { registrarTentativa, excedeuTentativas } from "@/lib/audit";
import { cpfValido, apenasDigitos, textoNaoVazio } from "@/lib/validators";
import type { ActionResult, VendaResumo } from "@/lib/types";

/**
 * Fluxo normal: localiza a venda pelo código de retirada.
 * Só aceita entregas do tipo "retirada".
 */
export async function buscarPorCodigo(
  codigoRaw: string,
): Promise<ActionResult<VendaResumo>> {
  const codigo = (codigoRaw || "").trim().toUpperCase();
  if (codigo.length < 6) {
    return { ok: false, erro: "Código inválido." };
  }

  if (await excedeuTentativas({ contexto: "retirada_codigo", identificador: codigo })) {
    return { ok: false, erro: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const resumo = await carregarEntregaPorCodigo(codigo);
  if (!resumo || resumo.tipoEntrega !== "retirada") {
    await registrarTentativa({
      contexto: "retirada_codigo",
      identificador: codigo,
      sucesso: false,
      detalhe: "código não encontrado / não é retirada na loja",
    });
    return { ok: false, erro: "Venda não encontrada para retirada na loja." };
  }

  await registrarTentativa({ contexto: "retirada_codigo", identificador: codigo, sucesso: true });
  return { ok: true, data: resumo };
}

/**
 * Fluxo de exceção: cliente não tem o código.
 * EXIGE autorização de gerente (nome + motivo), que é gravada em `autorizacoes`
 * e em `tentativas_log`. Só então a venda é liberada.
 */
export async function buscarPorCpfComAutorizacao(input: {
  cpf: string;
  autorizadoPor: string;
  motivo: string;
}): Promise<ActionResult<VendaResumo>> {
  const cpf = apenasDigitos(input?.cpf || "");

  if (!cpfValido(cpf)) {
    return { ok: false, erro: "CPF inválido." };
  }
  if (!textoNaoVazio(input.autorizadoPor, 2)) {
    return { ok: false, erro: "Informe quem está autorizando (gerente)." };
  }
  if (!textoNaoVazio(input.motivo, 3)) {
    return { ok: false, erro: "Informe o motivo da liberação sem código." };
  }

  // Rate limit no fluxo sensível.
  if (await excedeuTentativas({ contexto: "retirada_cpf", identificador: cpf })) {
    return { ok: false, erro: "Muitas tentativas para este CPF. Aguarde alguns minutos." };
  }

  const db = supabaseAdmin();

  // Localiza a venda de retirada mais recente do cliente que ainda não foi concluída.
  const { data: cliente } = await db
    .from("clientes")
    .select("id, nome")
    .eq("cpf", cpf)
    .maybeSingle();

  if (!cliente) {
    await registrarTentativa({
      contexto: "retirada_cpf",
      identificador: cpf,
      sucesso: false,
      detalhe: "cliente não encontrado",
    });
    return { ok: false, erro: "Nenhum cliente encontrado com este CPF." };
  }

  const { data: venda } = await db
    .from("vendas")
    .select("id")
    .eq("cliente_id", cliente.id)
    .eq("tipo_entrega", "retirada")
    .neq("situacao", "concluida")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!venda) {
    await registrarTentativa({
      contexto: "retirada_cpf",
      identificador: cpf,
      sucesso: false,
      detalhe: "sem venda de retirada pendente",
    });
    return { ok: false, erro: "Nenhuma retirada pendente para este CPF." };
  }

  const resumo = await carregarEntregaPorVendaId(venda.id);
  if (!resumo) {
    return { ok: false, erro: "Entrega não localizada." };
  }

  // Grava a autorização (log obrigatório) ANTES de liberar.
  await db.from("autorizacoes").insert({
    entrega_id: resumo.entregaId,
    venda_id: resumo.vendaId,
    autorizado_por: input.autorizadoPor.trim(),
    motivo: input.motivo.trim(),
    cpf_informado: cpf,
  });
  await registrarTentativa({
    contexto: "retirada_cpf",
    identificador: cpf,
    sucesso: true,
    detalhe: `autorizado por ${input.autorizadoPor.trim()}`,
  });

  return { ok: true, data: resumo };
}

/**
 * Confirma a retirada na loja: marca todos os itens como entregues,
 * registra responsável + data/hora e conclui a venda.
 * Revalida tudo no backend a partir do código (não confia no client).
 */
export async function confirmarRetirada(input: {
  codigo: string;
  responsavel: string;
}): Promise<ActionResult<{ concluidaEm: string }>> {
  const codigo = (input?.codigo || "").trim().toUpperCase();

  if (!textoNaoVazio(input.responsavel, 2)) {
    return { ok: false, erro: "Informe o responsável pela entrega." };
  }

  const resumo = await carregarEntregaPorCodigo(codigo);
  if (!resumo || resumo.tipoEntrega !== "retirada") {
    return { ok: false, erro: "Venda não encontrada." };
  }
  if (resumo.situacaoEntrega === "concluida") {
    return { ok: false, erro: "Esta retirada já foi concluída." };
  }

  const db = supabaseAdmin();
  const agora = new Date().toISOString();

  await db
    .from("itens_entrega")
    .update({ entregue: true, entregue_em: agora })
    .eq("entrega_id", resumo.entregaId)
    .eq("entregue", false);

  await db
    .from("entregas")
    .update({ situacao: "concluida", responsavel: input.responsavel.trim(), concluida_em: agora })
    .eq("id", resumo.entregaId);

  await db.from("vendas").update({ situacao: "concluida" }).eq("id", resumo.vendaId);

  await db.from("entrega_eventos").insert({
    entrega_id: resumo.entregaId,
    motoboy_id: null,
    itens_entregues: resumo.itens.length,
    itens_pendentes: 0,
    observacao: `Retirada na loja confirmada por ${input.responsavel.trim()}`,
  });

  return { ok: true, data: { concluidaEm: agora } };
}
