import { supabaseAdmin } from "@/lib/supabase";
import { PDV } from "@/components/PDV";
import type { Produto } from "@/lib/types";

// Sempre renderizar com dados atuais (sem cache estático).
export const dynamic = "force-dynamic";

export default async function Home() {
  const db = supabaseAdmin();

  const [{ data: produtos }, { data: motoboys }] = await Promise.all([
    db.from("produtos").select("id, nome, preco").eq("ativo", true).order("nome"),
    db.from("motoboys").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const lista: Produto[] = (produtos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco),
  }));

  return <PDV produtos={lista} motoboys={motoboys ?? []} />;
}
