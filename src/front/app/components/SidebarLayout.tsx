"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Package,
  MapPin,
  Users,
  UserCheck,
  Store,
  Tags,
  AlertCircle,
  Wrench,
  Menu,
  X,
  FileBarChart2,
  QrCode,
  DollarSign,
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import type { Papel } from "../lib/auth";

const PAPEL_LABEL: Record<Papel, string> = {
  gestor: "Gestor",
  responsavel: "Responsável",
  conferente: "Conferente",
};

interface MenuItem {
  path: string;
  icon: typeof Home;
  label: string;
  papeis: Papel[];
}

const menuItems: MenuItem[] = [
  { path: "/", icon: Home, label: "Dashboard", papeis: ["gestor", "responsavel", "conferente"] },
  { path: "/patrimonios", icon: Package, label: "Patrimônios", papeis: ["gestor", "responsavel", "conferente"] },
  { path: "/solicitacoes", icon: Wrench, label: "Solicitações", papeis: ["gestor", "responsavel", "conferente"] },
  { path: "/ambientes", icon: MapPin, label: "Ambientes", papeis: ["gestor", "responsavel", "conferente"] },
  { path: "/relatorios", icon: FileBarChart2, label: "Relatórios", papeis: ["gestor", "responsavel"] },
  { path: "/financeiro", icon: DollarSign, label: "Financeiro", papeis: ["gestor"] },
  { path: "/notificacoes", icon: Bell, label: "Notificações", papeis: ["gestor"] },
  { path: "/responsaveis", icon: Users, label: "Responsáveis", papeis: ["gestor", "responsavel"] },
  { path: "/conferentes", icon: UserCheck, label: "Conferentes", papeis: ["gestor"] },
  { path: "/fornecedores", icon: Store, label: "Fornecedores", papeis: ["gestor"] },
  { path: "/tipos-material", icon: Tags, label: "Tipos de Material", papeis: ["gestor"] },
  { path: "/estados-item", icon: AlertCircle, label: "Estados do Item", papeis: ["gestor"] },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { usuario, organizacao, papel, logout } = useAuth();

  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  const itensVisiveis = menuItems.filter(
    (item) => papel && item.papeis.includes(papel)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <div
        className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Zelium</h1>
          <p className="text-xs text-gray-500">Gestão Patrimonial</p>
        </div>
        <nav className="p-4 flex-1 overflow-auto">
          {itensVisiveis.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {usuario && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-800 truncate">
              {usuario.nome}
            </p>
            <p className="text-xs text-gray-500 mb-2">{PAPEL_LABEL[usuario.papel]}</p>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 rounded-lg px-2 py-1.5 w-full"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">
              Sistema de Gestão Patrimonial
            </h2>
            {organizacao && (
              <p className="text-xs text-gray-500">{organizacao.nome}</p>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
