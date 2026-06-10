"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { brl, dataHora } from "@/lib/format";
import { excluirPedido } from "@/app/actions/pedidos";
import type { PedidoResumo } from "@/lib/types";

type Filtro = "todos" | "pendente" | "parcial" | "concluida";

const STATUS = {
  pendente: { label: "Pendente", cls: "bg-slate-100 text-slate-600" },
  parcial: { label: "Parcial", cls: "bg-amber-100 text-amber-700" },
  concluida: { label: "Concluída", cls: "bg-green-100 text-green-700" },
} as const;

type Toast = { tipo: "ok" | "erro"; msg: string };

export function PedidosLista({ pedidos }: { pedidos: PedidoResumo[] }) {
  const router = useRouter();
  const [lista, setLista] = useState(pedidos);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [aExcluir, setAExcluir] = useState<PedidoResumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Mantém a lista em sincronia se o server recarregar.
  useEffect(() => setLista(pedidos), [pedidos]);

  // Auto-dismiss do toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const contagem = useMemo(
    () => ({
      todos: lista.length,
      pendente: lista.filter((p) => p.situacaoEntrega === "pendente").length,
      parcial: lista.filter((p) => p.situacaoEntrega === "parcial").length,
      concluida: lista.filter((p) => p.situacaoEntrega === "concluida").length,
    }),
    [lista],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((p) => {
      if (filtro !== "todos" && p.situacaoEntrega !== filtro) return false;
      if (q && !p.codigo.toLowerCase().includes(q) && !p.cliente.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [lista, filtro, busca]);

  async function confirmarExclusao() {
    if (!aExcluir) return;
    setExcluindo(true);
    const res = await excluirPedido(aExcluir.vendaId);
    setExcluindo(false);
    if (!res.ok) {
      setToast({ tipo: "erro", msg: res.erro });
      return;
    }
    setLista((l) => l.filter((p) => p.vendaId !== aExcluir.vendaId));
    setToast({ tipo: "ok", msg: `Pedido ${aExcluir.codigo} excluído.` });
    setAExcluir(null);
    router.refresh();
  }

  const tabs: { v: Filtro; label: string }[] = [
    { v: "todos", label: `Todos (${contagem.todos})` },
    { v: "pendente", label: `Pendentes (${contagem.pendente})` },
    { v: "parcial", label: `Parciais (${contagem.parcial})` },
    { v: "concluida", label: `Concluídos (${contagem.concluida})` },
  ];

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-slate-500">Acompanhe o status de todas as entregas e retiradas.</p>
        </div>
        <button onClick={() => router.refresh()} className="btn-ghost shrink-0">↻ Atualizar</button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Resumo titulo="Total" valor={contagem.todos} cor="text-slate-900" />
        <Resumo titulo="Pendentes" valor={contagem.pendente} cor="text-slate-600" />
        <Resumo titulo="Parciais" valor={contagem.parcial} cor="text-amber-600" />
        <Resumo titulo="Concluídos" valor={contagem.concluida} cor="text-green-600" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.v}
              onClick={() => setFiltro(t.v)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                filtro === t.v ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="field sm:max-w-xs"
          placeholder="Buscar por código ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">Nenhum pedido encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((p) => {
            const st = STATUS[p.situacaoEntrega as keyof typeof STATUS] ?? STATUS.pendente;
            return (
              <div key={p.vendaId} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-center">
                    <div className="text-[10px] uppercase text-slate-400">Código</div>
                    <div className="font-mono font-bold tracking-wider">{p.codigo}</div>
                  </div>
                  <div>
                    <div className="font-semibold">{p.cliente}</div>
                    <div className="text-xs text-slate-500">{dataHora(p.criadaEm)} · {brl(p.total)}</div>
                    {p.endereco && <div className="mt-0.5 text-xs text-slate-500">📍 {p.endereco}</div>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="badge bg-slate-100 text-slate-600">
                    {p.tipoEntrega === "retirada" ? "🏬 Loja" : `🛵 ${p.motoboy ?? "Motoboy"}`}
                  </span>
                  {p.itensTotal > 0 && (
                    <span className="badge bg-slate-100 text-slate-500">{p.itensEntregues}/{p.itensTotal} itens</span>
                  )}
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  <button
                    onClick={() => setAExcluir(p)}
                    aria-label="Excluir pedido"
                    title="Excluir pedido"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-1 0v12a1 1 0 01-1 1H9a1 1 0 01-1-1V7m3 4v6m4-6v6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação */}
      {aExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !excluindo && setAExcluir(null)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-3xl">🗑️</div>
            <h3 className="text-lg font-bold">Excluir pedido?</h3>
            <p className="mt-1 text-sm text-slate-600">
              O pedido <span className="font-mono font-semibold">{aExcluir.codigo}</span> de{" "}
              <strong>{aExcluir.cliente}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" disabled={excluindo} onClick={() => setAExcluir(null)}>
                Cancelar
              </button>
              <button
                className="btn flex-1 bg-red-600 text-white hover:bg-red-700"
                disabled={excluindo}
                onClick={confirmarExclusao}
              >
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.tipo === "ok" ? "bg-slate-900" : "bg-red-600"
          }`}
        >
          <span>{toast.tipo === "ok" ? "✅" : "⚠️"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Resumo({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</div>
      <div className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</div>
    </div>
  );
}
