"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

type Item = { href: string; label: string; desc: string; icon: JSX.Element };

const KanbanIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <rect x="3" y="4" width="5" height="16" rx="1" />
    <rect x="10" y="4" width="5" height="10" rx="1" />
    <rect x="17" y="4" width="4" height="13" rx="1" />
  </svg>
);
const ChartIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NAV: Item[] = [
  { href: "/", label: "Kanban", desc: "Quadro de tarefas", icon: KanbanIcon },
  { href: "/progresso", label: "Progresso", desc: "Visão geral e barras", icon: ChartIcon },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2 py-1">
      <span className="text-2xl">💎</span>
      <div className="leading-tight">
        <div className="font-bold text-white">Alisson Joias</div>
        <div className="text-[11px] text-slate-400">Progresso do ERP</div>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 space-y-1 px-3">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "bg-brand/15 text-brand-light"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className={active ? "text-brand-light" : "text-slate-400"}>{item.icon}</span>
            <span>
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-[11px] text-slate-500">{item.desc}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function Rodape() {
  const { usuario, sair } = useAuth();
  return (
    <div className="absolute inset-x-0 bottom-4 px-4">
      <div className="rounded-xl bg-white/5 px-3 py-2.5">
        <div className="truncate text-sm font-semibold text-white">{usuario?.nome}</div>
        <div className="mb-2 text-[11px] capitalize text-slate-400">{usuario?.papel}</div>
        <button
          onClick={sair}
          className="w-full rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-300 p-2"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <span className="font-bold">💎 Progresso do ERP</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 pb-6 pt-5 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-3">
          <Brand />
          <button
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:text-white lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <NavLinks onNavigate={() => setOpen(false)} />
        <Rodape />
      </aside>
    </>
  );
}
