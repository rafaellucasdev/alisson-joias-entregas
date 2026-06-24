import type { Nivel, Status, Tipo } from "@/lib/types";

export const corStatus: Record<Status, string> = {
  todo: "bg-slate-100 text-slate-700",
  doing: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-700",
  blocked: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-400 line-through",
};

export const corNivel: Record<Nivel, string> = {
  baixa: "bg-slate-100 text-slate-600",
  media: "bg-sky-100 text-sky-700",
  alta: "bg-orange-100 text-orange-700",
  critica: "bg-red-100 text-red-700",
};

export const corTipo: Record<Tipo, string> = {
  bug: "bg-red-50 text-red-600",
  melhoria: "bg-emerald-50 text-emerald-600",
  seguranca: "bg-orange-50 text-orange-700",
  performance: "bg-violet-50 text-violet-600",
  refatoracao: "bg-sky-50 text-sky-600",
  infra: "bg-slate-100 text-slate-600",
  limpeza: "bg-teal-50 text-teal-600",
};

export function formatarData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
