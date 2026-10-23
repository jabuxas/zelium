import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SidebarLayout from "./components/SidebarLayout";
import { ToastProvider } from "./components/Toast";
import { AuthProvider } from "./lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zelium - Gestão Patrimonial",
  description: "Sistema de Gestão Patrimonial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full">
        <AuthProvider>
          <ToastProvider>
            <SidebarLayout>{children}</SidebarLayout>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
