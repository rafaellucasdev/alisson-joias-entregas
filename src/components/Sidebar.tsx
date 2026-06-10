"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string; desc: string; icon: JSX.Element };

const CartIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2 4h12" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
  </svg>
);
const StoreIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M3 9l1.5-5h15L21 9M4 9h16v10a1 1 0 01-1 1H5a1 1 0 01-1-1V9zM4 9a2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 20v-5h6v5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BikeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" />
    <path d="M8.5 17h6l-2.5-7H9m3 0l2 4m1.5-7H18l1 3m-12.5 4L9 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NAV: Item[] = [
  { href: "/", label: "PDV / Vendas", desc: "Registrar vendas", icon: CartIcon },
  { href: "/retirada", label: "Retirada na Loja", desc: "Confirmar retiradas", icon: StoreIcon },
  { href: "/motoboy", label: "Entregas — Motoboy", desc: "Área do entregador", icon: BikeIcon },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2 py-1">
      <span className="text-2xl">💎</span>
      <div className="leading-tight">
        <div className="font-bold text-white">Alisson Joias</div>
        <div className="text-[11px] text-slate-400">Entregas &amp; Retiradas</div>
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

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Topbar mobile */}
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
        <span className="font-bold">💎 Alisson Joias</span>
      </header>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
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

        <div className="absolute inset-x-0 bottom-4 px-5 text-[11px] text-slate-500">
          PDV + Módulo de Entregas
        </div>
      </aside>
    </>
  );
}
