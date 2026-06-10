"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { gerarCodigoRetirada } from "@/lib/codigo";
import { enviarCodigoWhatsApp } from "@/lib/whatsapp";
import {
  cpfValido,
  apenasDigitos,
  normalizarWhatsapp,
  whatsappValido,
  textoNaoVazio,
} from "@/lib/validators";
import type { ActionResult, TipoEntrega } from "@/lib/types";

type ItemInput = { produtoId: string; quantidade: number };

type FinalizarInput = {
  cliente: { nome: string; whatsapp: string; cpf: string };
  itens: ItemInput[];
  tipoEntrega: TipoEntrega;
  motoboyId?: string | null;
  endereco?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    complemento?: string;
  } | null;
};

type FinalizarOutput = {
  vendaId: string;
  codigo: string;
  tipoEntrega: TipoEntrega;
  total: number;
  whatsappEnviado: boolean;
  whatsappMotivo?: string;
};

/**
 * Finaliza a venda. TODAS as validações e o cálculo do total acontecem aqui
 * no servidor — os preços vêm do banco, nunca do client.
 */
export async function finalizarVenda(
  input: FinalizarInput,
): Promise<ActionResult<FinalizarOutput>> {
  const db = supabaseAdmin();

  // ---- Validação de entrada -------------------------------------------------
  if (!textoNaoVazio(input?.cliente?.nome, 2)) {
    return { ok: false, erro: "Informe o nome do cliente." };
  }
  if (!whatsappValido(input.cliente.whatsapp)) {
    return { ok: false, erro: "WhatsApp inválido." };
  }
  if (!cpfValido(input.cliente.cpf)) {
    return { ok: false, erro: "CPF inválido." };
  }
  if (!Array.isArray(input.itens) || input.itens.length === 0) {
    return { ok: false, erro: "O carrinho está vazio." };
  }
  if (input.tipoEntrega !== "retirada" && input.tipoEntrega !== "motoboy") {
    return { ok: false, erro: "Tipo de entrega inválido." };
  }

  // ---- Motoboy (se aplicável): precisa existir e estar ativo ---------------
  let motoboyId: string | null = null;
  let endereco: string | null = null;
  if (input.tipoEntrega === "motoboy") {
    if (!input.motoboyId) {
      return { ok: false, erro: "Selecione um motoboy para a entrega." };
    }
    const e = input.endereco;
    if (!textoNaoVazio(e?.rua, 2) || !textoNaoVazio(e?.numero, 1) || !textoNaoVazio(e?.bairro, 2)) {
      return { ok: false, erro: "Preencha rua, número e bairro da entrega." };
    }
    const { data: mb } = await db
      .from("motoboys")
      .select("id, ativo")
      .eq("id", input.motoboyId)
      .maybeSingle();
    if (!mb || !mb.ativo) {
      return { ok: false, erro: "Motoboy inválido ou inativo." };
    }
    motoboyId = mb.id;
    const compl = textoNaoVazio(e!.complemento) ? ` (${e!.complemento!.trim()})` : "";
    endereco = `${e!.rua!.trim()}, ${e!.numero!.trim()} - ${e!.bairro!.trim()}${compl}`;
  }

  // ---- Recalcula preços a partir do banco (não confia no client) -----------
  const ids = Array.from(new Set(input.itens.map((i) => i.produtoId)));
  const { data: produtos, error: errProd } = await db
    .from("produtos")
    .select("id, nome, preco")
    .in("id", ids);
  if (errProd) return { ok: false, erro: "Erro ao carregar produtos." };

  const mapaProduto = new Map((produtos ?? []).map((p) => [p.id, p]));
  const itensCalculados: Array<{
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
  }> = [];
  let total = 0;
  for (const item of input.itens) {
    const prod = mapaProduto.get(item.produtoId);
    const qtd = Math.floor(Number(item.quantidade));
    if (!prod) return { ok: false, erro: "Produto inexistente no carrinho." };
    if (!Number.isFinite(qtd) || qtd <= 0) {
      return { ok: false, erro: "Quantidade inválida." };
    }
    const precoUnitario = Number(prod.preco);
    total += precoUnitario * qtd;
    itensCalculados.push({ produtoId: prod.id, quantidade: qtd, precoUnitario });
  }
  total = Math.round(total * 100) / 100;

  // ---- Upsert do cliente (por CPF) -----------------------------------------
  const cpf = apenasDigitos(input.cliente.cpf);
  const whatsapp = normalizarWhatsapp(input.cliente.whatsapp);
  const { data: cliente, error: errCli } = await db
    .from("clientes")
    .upsert(
      { nome: input.cliente.nome.trim(), whatsapp, cpf },
      { onConflict: "cpf" },
    )
    .select("id, nome")
    .single();
  if (errCli || !cliente) {
    return { ok: false, erro: "Erro ao salvar o cliente." };
  }

  // ---- Gera código único (retry em colisão) --------------------------------
  let codigo = "";
  let vendaId = "";
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    codigo = gerarCodigoRetirada(7);
    const { data: venda, error: errVenda } = await db
      .from("vendas")
      .insert({
        cliente_id: cliente.id,
        total,
        tipo_entrega: input.tipoEntrega,
        codigo_retirada: codigo,
        situacao: "aguardando",
      })
      .select("id")
      .single();

    if (!errVenda && venda) {
      vendaId = venda.id;
      break;
    }
    // 23505 = unique_violation (colisão de código) -> tenta de novo
    if (errVenda && errVenda.code !== "23505") {
      return { ok: false, erro: "Erro ao registrar a venda." };
    }
  }
  if (!vendaId) {
    return { ok: false, erro: "Não foi possível gerar um código único." };
  }

  // ---- Itens da venda ------------------------------------------------------
  const { data: itensVenda, error: errItens } = await db
    .from("itens_venda")
    .insert(
      itensCalculados.map((it) => ({
        venda_id: vendaId,
        produto_id: it.produtoId,
        quantidade: it.quantidade,
        preco_unitario: it.precoUnitario,
      })),
    )
    .select("id");
  if (errItens || !itensVenda) {
    return { ok: false, erro: "Erro ao registrar os itens da venda." };
  }

  // ---- Entrega + itens da entrega ------------------------------------------
  const { data: entrega, error: errEntrega } = await db
    .from("entregas")
    .insert({
      venda_id: vendaId,
      tipo: input.tipoEntrega,
      situacao: "pendente",
      motoboy_id: motoboyId,
      endereco,
    })
    .select("id")
    .single();
  if (errEntrega || !entrega) {
    return { ok: false, erro: "Erro ao criar a entrega." };
  }

  const itensEntrega = itensVenda.map((iv, idx) => ({
    entrega_id: entrega.id,
    item_venda_id: iv.id,
    quantidade: itensCalculados[idx].quantidade,
    entregue: false,
  }));
  const { error: errIE } = await db.from("itens_entrega").insert(itensEntrega);
  if (errIE) {
    return { ok: false, erro: "Erro ao criar os itens da entrega." };
  }

  // ---- WhatsApp (não bloqueia a venda em caso de falha) --------------------
  const envio = await enviarCodigoWhatsApp({
    para: whatsapp,
    nomeCliente: cliente.nome,
    codigo,
    tipoEntrega: input.tipoEntrega,
  });

  return {
    ok: true,
    data: {
      vendaId,
      codigo,
      tipoEntrega: input.tipoEntrega,
      total,
      whatsappEnviado: envio.enviado,
      whatsappMotivo: envio.enviado ? undefined : envio.motivo,
    },
  };
}
