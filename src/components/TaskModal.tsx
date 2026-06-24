"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  atualizarPrioridade,
  comentar,
  listarEventos,
  moverTarefa,
} from "@/lib/data";
import {
  NIVEL_LABEL,
  STATUS_LABEL,
  type Nivel,
  type Status,
  type Tarefa,
  type TarefaEvento,
} from "@/lib/types";
import { formatarData } from "@/lib/ui";

const NIVEIS: Nivel[] = ["baixa", "media", "alta", "critica"];
const STATUSES: Status[] = ["todo", "doing", "blocked", "done", "cancelled"];

export function TaskModal({
  tarefa,
  onFechar,
  onMutate,
}: {
  tarefa: Tarefa;
  onFechar: () => void;
  onMutate: () => void;
}) {
  const { usuario, podeEditar } = useAuth();
  const [eventos, setEventos] = useState<TarefaEvento[]>([]);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregarEventos() {
    setEventos(await listarEventos(tarefa.id));
  }
  useEffect(() => {
    carregarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefa.id]);

  async function mudarStatus(novo: Status) {
    if (!usuario) return;
    await moverTarefa(tarefa, novo, usuario.id);
    onMutate();
    await carregarEventos();
  }

  async function mudarPrioridade(p: Nivel) {
    if (!usuario) return;
    await atualizarPrioridade(tarefa, p, tarefa.urgencia, usuario.id);
    onMutate();
    await carregarEventos();
  }

  async function enviarComentario() {
    if (!usuario || !texto.trim()) return;
    setSalvando(true);
    await comentar(tarefa.id, texto.trim(), usuario.id);
    setTexto("");
    setSalvando(false);
    await carregarEventos();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onFechar}
    >
      <div
        className="card max-h-[88vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {tarefa.codigo && (
              <span className="text-xs font-bold text-slate-400">{tarefa.codigo}</span>
            )}
            <h2 className="text-lg font-bold leading-tight text-slate-900">
              {tarefa.titulo}
            </h2>
            {tarefa.categoria && (
              <p className="text-xs text-slate-500">{tarefa.categoria}</p>
            )}
          </div>
          <button className="btn-ghost px-3 py-1" onClick={onFechar}>
            ✕
          </button>
        </div>

        {tarefa.descricao && (
          <section className="mb-4">
            <h3 className="label">O que é</h3>
            <p className="text-sm leading-relaxed text-slate-700">{tarefa.descricao}</p>
          </section>
        )}

        {tarefa.impacto && (
          <section className="mb-4 rounded-lg border-l-4 border-emerald-400 bg-emerald-50 p-3">
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              Por que importa
            </h3>
            <p className="text-sm text-emerald-900">{tarefa.impacto}</p>
          </section>
        )}

        {tarefa.analise_ia && (
          <section className="mb-4 rounded-lg border-l-4 border-violet-400 bg-violet-50 p-3">
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">
              Análise da IA — urgência {tarefa.urgencia ? NIVEL_LABEL[tarefa.urgencia] : "—"} · prioridade {NIVEL_LABEL[tarefa.prioridade]}
            </h3>
            <p className="text-sm text-violet-900">{tarefa.analise_ia}</p>
          </section>
        )}

        {tarefa.criterio_teste && (
          <section className="mb-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
              Critério de teste
            </h3>
            <p className="text-sm text-amber-900">{tarefa.criterio_teste}</p>
          </section>
        )}

        {tarefa.branch && (
          <p className="mb-4 text-xs text-slate-500">
            Branch: <code className="rounded bg-slate-100 px-1.5 py-0.5">{tarefa.branch}</code>
          </p>
        )}

        {podeEditar && (
          <section className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Status</label>
              <select
                className="field"
                value={tarefa.status}
                onChange={(e) => mudarStatus(e.target.value as Status)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prioridade</label>
              <select
                className="field"
                value={tarefa.prioridade}
                onChange={(e) => mudarPrioridade(e.target.value as Nivel)}
              >
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {NIVEL_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        <section>
          <h3 className="label">Histórico</h3>
          {podeEditar && (
            <div className="mb-3 flex gap-2">
              <input
                className="field"
                placeholder="Comentar…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarComentario()}
              />
              <button
                className="btn-primary"
                onClick={enviarComentario}
                disabled={salvando || !texto.trim()}
              >
                Enviar
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {eventos.map((ev) => (
              <li key={ev.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {ev.tipo}
                    {ev.autor_label ? ` · ${ev.autor_label}` : ""}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatarData(ev.criado_em)}</span>
                </div>
                {ev.descricao && <p className="text-slate-700">{ev.descricao}</p>}
              </li>
            ))}
            {eventos.length === 0 && (
              <li className="text-xs text-slate-400">Sem histórico ainda.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
