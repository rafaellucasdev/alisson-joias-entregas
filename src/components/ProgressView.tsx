"use client";

import { useMemo } from "react";
import { useTarefas } from "@/lib/useTarefas";
import { STATUS_LABEL, type Status, type Tarefa } from "@/lib/types";

function agruparPorCategoria(tarefas: Tarefa[]) {
  const mapa = new Map<string, { done: number; total: number }>();
  for (const t of tarefas) {
    if (t.status === "cancelled") continue;
    const cat = t.categoria ?? "Sem categoria";
    const acc = mapa.get(cat) ?? { done: 0, total: 0 };
    acc.total += 1;
    if (t.status === "done") acc.done += 1;
    mapa.set(cat, acc);
  }
  return Array.from(mapa.entries()).sort((a, b) => b[1].total - a[1].total);
}

export function ProgressView() {
  const { tarefas, carregando } = useTarefas("financeiro");

  const resumo = useMemo(() => {
    const ativas = tarefas.filter((t) => t.status !== "cancelled");
    const feitas = ativas.filter((t) => t.status === "done").length;
    const pct = ativas.length ? Math.round((feitas / ativas.length) * 100) : 0;
    const porStatus: Record<Status, number> = {
      todo: 0,
      doing: 0,
      done: 0,
      blocked: 0,
      cancelled: 0,
    };
    tarefas.forEach((t) => (porStatus[t.status] += 1));
    return { ativas: ativas.length, feitas, pct, porStatus };
  }, [tarefas]);

  const categorias = useMemo(() => agruparPorCategoria(tarefas), [tarefas]);

  if (carregando) {
    return <p className="py-10 text-center text-sm text-stone-400">Carregando…</p>;
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-esmeralda-800">Progresso — Financeiro</h1>
      <p className="mb-5 text-xs text-stone-500">Atualiza em tempo real conforme o time e a IA avançam.</p>

      <div className="card mb-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="font-display text-5xl font-extrabold text-esmeralda-700">{resumo.pct}%</div>
          <div className="text-sm text-stone-600">
            <strong className="text-esmeralda-800">{resumo.feitas}</strong> de {resumo.ativas} tarefas concluídas
          </div>
          <div className="h-2.5 min-w-[160px] flex-1 overflow-hidden rounded-full bg-creme-200">
            <div className="h-full rounded-full bg-esmeralda-500 transition-all" style={{ width: `${resumo.pct}%` }} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {(["todo", "doing", "blocked", "done"] as Status[]).map((s) => (
            <span key={s} className="rounded-lg border border-creme-200 bg-creme-50 px-2.5 py-1 text-stone-600">
              {STATUS_LABEL[s]}: <strong className="text-esmeralda-700">{resumo.porStatus[s]}</strong>
            </span>
          ))}
        </div>
      </div>

      <h2 className="mb-3 text-sm font-bold text-esmeralda-700">Por categoria</h2>
      <div className="space-y-4">
        {categorias.map(([cat, { done, total }]) => {
          const p = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={cat}>
              <div className="mb-1 flex justify-between text-xs">
                <strong className="text-esmeralda-800">{cat}</strong>
                <span className="text-stone-500">
                  {done}/{total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-creme-200">
                <div className="h-full rounded-full bg-dourado transition-all" style={{ width: `${p}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
