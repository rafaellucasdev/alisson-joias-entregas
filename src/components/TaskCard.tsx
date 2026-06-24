"use client";

import type { DragEvent } from "react";
import { NIVEL_LABEL, TIPO_LABEL, type Tarefa } from "@/lib/types";
import { corNivel, corTipo } from "@/lib/ui";

export function TaskCard({
  tarefa,
  arrastavel,
  onAbrir,
  onDragStart,
}: {
  tarefa: Tarefa;
  arrastavel: boolean;
  onAbrir: (t: Tarefa) => void;
  onDragStart: (e: DragEvent, t: Tarefa) => void;
}) {
  return (
    <div
      draggable={arrastavel}
      onDragStart={(e) => onDragStart(e, tarefa)}
      onClick={() => onAbrir(tarefa)}
      className={`card mb-2 cursor-pointer p-3 transition hover:shadow-md ${
        tarefa.status === "blocked" ? "border-red-200" : ""
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        {tarefa.codigo && (
          <span className="text-[10px] font-bold text-esmeralda-400">{tarefa.codigo}</span>
        )}
        <span className={`badge ${corNivel[tarefa.prioridade]}`}>
          {NIVEL_LABEL[tarefa.prioridade]}
        </span>
        {tarefa.prioridade_ia && (
          <span className="badge bg-dourado/15 text-dourado-dark" title="Prioridade recomendada pela IA">
            IA
          </span>
        )}
        {tarefa.status === "blocked" && (
          <span className="badge bg-red-100 text-red-700">Bloqueada</span>
        )}
      </div>

      <div className="text-sm font-semibold leading-snug text-esmeralda-900">
        {tarefa.titulo}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tarefa.tipo && (
          <span className={`badge ${corTipo[tarefa.tipo]}`}>{TIPO_LABEL[tarefa.tipo]}</span>
        )}
        {tarefa.categoria && (
          <span className="text-[10px] text-stone-400">{tarefa.categoria}</span>
        )}
      </div>
    </div>
  );
}
