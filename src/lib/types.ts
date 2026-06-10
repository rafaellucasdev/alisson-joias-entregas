// Tipos compartilhados entre server actions e componentes client.

export type Produto = {
  id: string;
  nome: string;
  preco: number;
};

export type ItemCarrinho = {
  produto: Produto;
  quantidade: number;
};

export type TipoEntrega = "retirada" | "motoboy";

export type ItemEntregaView = {
  itemEntregaId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  entregue: boolean;
  observacao: string | null;
};

export type VendaResumo = {
  vendaId: string;
  codigoRetirada: string;
  cliente: string;
  total: number;
  tipoEntrega: TipoEntrega;
  situacaoVenda: string;
  entregaId: string;
  situacaoEntrega: string;
  endereco: string | null;
  criadaEm: string;
  itens: ItemEntregaView[];
};

export type EntregaMotoboy = VendaResumo & {
  enderecoWhatsapp: string;
};

export type PedidoResumo = {
  vendaId: string;
  codigo: string;
  cliente: string;
  total: number;
  tipoEntrega: TipoEntrega;
  situacaoEntrega: string;
  motoboy: string | null;
  endereco: string | null;
  itensTotal: number;
  itensEntregues: number;
  criadaEm: string;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; erro: string };
