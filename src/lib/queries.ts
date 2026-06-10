import "server-only";
import { supabaseAdmin } from "./supabase";
import type { VendaResumo, ItemEntregaView, TipoEntrega, PedidoResumo } from "./types";

// Linha "crua" devolvida pelo embed do Supabase.
type EntregaRow = {
  id: string;
  tipo: TipoEntrega;
  situacao: string;
  motoboy_id: string | null;
  vendas: {
    id: string;
    codigo_retirada: string;
    total: number;
    tipo_entrega: TipoEntrega;
    situacao: string;
    created_at: string;
    clientes: { nome: string; whatsapp: string } | null;
  } | null;
  itens_entrega: Array<{
    id: string;
    quantidade: number;
    entregue: boolean;
    observacao: string | null;
    itens_venda: {
      preco_unitario: number;
      produtos: { nome: string } | null;
    } | null;
  }>;
};

const SELECT = `
  id, tipo, situacao, motoboy_id,
  vendas (
    id, codigo_retirada, total, tipo_entrega, situacao, created_at,
    clientes ( nome, whatsapp )
  ),
  itens_entrega (
    id, quantidade, entregue, observacao,
    itens_venda ( preco_unitario, produtos ( nome ) )
  )
` as const;

function mapear(row: EntregaRow): VendaResumo {
  const venda = row.vendas;
  const itens: ItemEntregaView[] = (row.itens_entrega ?? []).map((it) => ({
    itemEntregaId: it.id,
    nomeProduto: it.itens_venda?.produtos?.nome ?? "Produto",
    quantidade: it.quantidade,
    precoUnitario: Number(it.itens_venda?.preco_unitario ?? 0),
    entregue: it.entregue,
    observacao: it.observacao,
  }));
  // Ordena por nome para exibição estável.
  itens.sort((a, b) => a.nomeProduto.localeCompare(b.nomeProduto));

  return {
    vendaId: venda?.id ?? "",
    codigoRetirada: venda?.codigo_retirada ?? "",
    cliente: venda?.clientes?.nome ?? "Cliente",
    total: Number(venda?.total ?? 0),
    tipoEntrega: (venda?.tipo_entrega ?? "retirada") as TipoEntrega,
    situacaoVenda: venda?.situacao ?? "",
    entregaId: row.id,
    situacaoEntrega: row.situacao,
    criadaEm: venda?.created_at ?? "",
    itens,
  };
}

/** Resolve o venda_id a partir do código de retirada. */
async function vendaIdPorCodigo(codigo: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("vendas")
    .select("id")
    .eq("codigo_retirada", codigo)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function carregarEntregaPorCodigo(
  codigo: string,
): Promise<VendaResumo | null> {
  const vendaId = await vendaIdPorCodigo(codigo);
  if (!vendaId) return null;
  return carregarEntregaPorVendaId(vendaId);
}

export async function carregarEntregaPorVendaId(
  vendaId: string,
): Promise<VendaResumo | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("entregas")
    .select(SELECT)
    .eq("venda_id", vendaId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapear(data as unknown as EntregaRow) : null;
}

/** Todas as entregas atribuídas a UM motoboy (segurança: filtra por motoboy_id). */
export async function carregarEntregasPorMotoboy(
  motoboyId: string,
): Promise<VendaResumo[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("entregas")
    .select(SELECT)
    .eq("motoboy_id", motoboyId)
    .eq("tipo", "motoboy")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as unknown as EntregaRow[]) ?? []).filter((r) => r.vendas).map(mapear);
}

/** Todos os pedidos (vendas) com status da entrega — para o painel operacional. */
export async function carregarPedidos(): Promise<PedidoResumo[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("vendas")
    .select(
      `id, codigo_retirada, total, tipo_entrega, created_at,
       clientes ( nome ),
       entregas ( situacao, motoboys ( nome ), itens_entrega ( entregue ) )`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data as unknown as any[]) ?? []).map((v) => {
    const entrega = Array.isArray(v.entregas) ? v.entregas[0] : v.entregas;
    const itens = (entrega?.itens_entrega ?? []) as Array<{ entregue: boolean }>;
    return {
      vendaId: v.id,
      codigo: v.codigo_retirada,
      cliente: v.clientes?.nome ?? "Cliente",
      total: Number(v.total ?? 0),
      tipoEntrega: (v.tipo_entrega ?? "retirada") as TipoEntrega,
      situacaoEntrega: entrega?.situacao ?? "pendente",
      motoboy: entrega?.motoboys?.nome ?? null,
      itensTotal: itens.length,
      itensEntregues: itens.filter((i) => i.entregue).length,
      criadaEm: v.created_at ?? "",
    };
  });
}

export async function carregarEntregaPorId(
  entregaId: string,
): Promise<VendaResumo | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("entregas")
    .select(SELECT)
    .eq("id", entregaId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapear(data as unknown as EntregaRow) : null;
}
