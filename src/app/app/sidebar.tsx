"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { canManageFlows, canManageUsers } from "@/lib/auth/permissions";

export default function Sidebar({
  userName,
  rol,
}: {
  userName: string;
  rol: string;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/app/inbox", label: "Inbox", icon: "💬", show: true },
    { href: "/app/leads", label: "Leads", icon: "👤", show: true },
    { href: "/app/flows", label: "Flujos", icon: "⚙️", show: canManageFlows(rol) },
    { href: "/app/ads", label: "Rendimiento", icon: "📊", show: true },
    { href: "/app/ads-config", label: "Anuncios", icon: "📢", show: canManageUsers(rol) },
    { href: "/app/usuarios", label: "Usuarios", icon: "👥", show: canManageUsers(rol) },
    { href: "/app/config", label: "Config", icon: "🔧", show: canManageUsers(rol) },
  ];

  return (
    <aside className="flex w-64 flex-col" style={{ background: "#003160" }}>
      <div className="border-b px-5 py-5" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <h2 className="text-lg font-bold text-white">leadsGuadalupana</h2>
        <p className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.6)" }}>{rol.replace("_", " ")}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.filter(i => i.show).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "font-medium text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              style={active ? { background: "#cf2e2e" } : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <p className="mb-2 truncate text-sm text-white/80">{userName}</p>
        <p className="mb-2 text-xs text-white/50">{rol.replace("_", " ")}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
