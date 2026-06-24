import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/AuthGate";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "AJ Progress Tracker",
  description: "Acompanhamento em tempo real do desenvolvimento do ERP Alisson Joias",
  applicationName: "AJ Tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AJ Tracker" },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
