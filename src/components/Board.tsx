"use client";

import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useTarefas } from "@/lib/useTarefas";
import { criarTarefa, moverTarefa } from "@/lib/data";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { TIPO_LABEL, type Status, type Tarefa, type Tipo } from "@/lib/types";

const COLUNAS: { titulo: string; status: Status; cor: string }[] = [
  { titulo: "A fazer", status: "todo", cor: "text-slate-500" },
  { titulo: "Fazendo", status: "doing", cor: "text-amber-600" },
  { titulo: "Feito", status: "done", cor: "text-emerald-600" },
];

const TIPOS: Tipo[] = [
  "bug",
  "melhoria",
  "seguranca",
  "performance",
  "refatoracao",
  "infra",
  "limpeza",
];

function colunaDe(s: Status): Status | null {
  if (s === "doing") return "doing";
  if (s === "done") return "done";
  if (s === "cancelled") return null;
  return "todo"; // todo + blocked ficam em "A fazer"
}

function NovaTarefaModal({
  onCriar,
  onFechar,
  salvando,
}: {
  onCriar: (titulo: string, tipo: Tipo | null, categoria: string) => void;
  onFechar: () => void;
  salvando: boolean;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<Tipo | "">("");
  const [categoria, setCategoria] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onCriar(titulo.trim(), tipo || null, categoria.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <form className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nova tarefa</h2>
        <label className="label">Título</label>
        <input className="field mb-3" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus required />
        <label className="label">Tipo</label>
        <select className="field mb-3" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo | "")}>
          <option value="">—</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPO_LABEL[t]}
            </option>
          ))}
        </select>
        <label className="label">Categoria</label>
        <input className="field mb-5" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Integração Asaas" />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={salvando || !titulo.trim()}>
            {salvando ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Board() {
  const { usuario, podeEditar } = useAuth();
  const { modulo, tarefas, carregando, recarregar } = useTarefas("financeiro");
  const [selId, setSelId] = useState<string | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alvoColuna, setAlvoColuna] = useState<Status | null>(null);

  const porId = useMemo(() => new Map(tarefas.map((t) => [t.id, t])), [tarefas]);
  const sel = selId ? porId.get(selId) ?? null : null;

  const feitas = tarefas.filter((t) => t.status === "done").length;
  const ativas = tarefas.filter((t) => t.status !== "cancelled").length;
  const pct = ativas ? Math.round((feitas / ativas) * 100) : 0;

  function onDragStart(e: DragEvent, t: Tarefa) {
    e.dataTransfer.setData("text/plain", t.id);
  }
  async function onDrop(e: DragEvent, status: Status) {
    e.preventDefault();
    setAlvoColuna(null);
    const id = e.dataTransfer.getData("text/plain");
    const t = porId.get(id);
    if (!t || !usuario || !podeEditar || colunaDe(t.status) === status) return;
    await moverTarefa(t, status, usuario.id);
    recarregar();
  }

  async function criar(titulo: string, tipo: Tipo | null, categoria: string) {
    if (!modulo || !usuario) return;
    setSalvando(true);
    await criarTarefa(modulo.id, { titulo, tipo: tipo ?? undefined, categoria: categoria || undefined }, usuario.id);
    setSalvando(false);
    setNovaAberta(false);
    recarregar();
  }

  if (carregando) {
    return <p className="py-10 text-center text-sm text-slate-400">Carregando tarefas…</p>;
  }
  if (!modulo) {
    return <p className="py-10 text-center text-sm text-slate-400">Módulo Financeiro não encontrado. Rode o seed no Supabase.</p>;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-xs text-slate-500">
            {feitas} de {ativas} concluídas · {pct}%
          </p>
        </div>
        {podeEditar && (
          <button className="btn-accent" onClick={() => setNovaAberta(true)}>
            + Nova tarefa
          </button>
        )}
      </div>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUNAS.map((col) => {
          const itens = tarefas.filter((t) => colunaDe(t.status) === col.status);
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setAlvoColuna(col.status);
              }}
              onDragLeave={() => setAlvoColuna((c) => (c === col.status ? null : c))}
              onDrop={(e) => onDrop(e, col.status)}
              className={`rounded-2xl border p-3 transition ${
                alvoColuna === col.status ? "border-brand bg-brand/5" : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className={`text-xs font-bold uppercase tracking-wide ${col.cor}`}>{col.titulo}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-400">{itens.length}</span>
              </div>
              {itens.map((t) => (
                <TaskCard key={t.id} tarefa={t} arrastavel={podeEditar} onAbrir={(x) => setSelId(x.id)} onDragStart={onDragStart} />
              ))}
              {itens.length === 0 && <p className="py-6 text-center text-[11px] text-slate-300">Vazio</p>}
            </div>
          );
        })}
      </div>

      {sel && <TaskModal tarefa={sel} onFechar={() => setSelId(null)} onMutate={recarregar} />}
      {novaAberta && <NovaTarefaModal onCriar={criar} onFechar={() => setNovaAberta(false)} salvando={salvando} />}
    </div>
  );
}
