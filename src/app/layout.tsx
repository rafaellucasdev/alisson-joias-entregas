import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Alisson Joias — Entregas",
  description: "PDV + Módulo de Entregas com WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <Sidebar />
        <div className="lg:pl-64">
          <main className="mx-auto max-w-6xl px-4 py-6 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
