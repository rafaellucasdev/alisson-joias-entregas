import { carregarPedidos } from "@/lib/queries";
import { PedidosLista } from "@/components/PedidosLista";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const pedidos = await carregarPedidos();
  return <PedidosLista pedidos={pedidos} />;
}
