"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/app/inbox", label: "Inbox", icon: "💬" },
  { href: "/app/leads", label: "Leads", icon: "👤" },
  { href: "/app/flows", label: "Flujos", icon: "⚙️" },
  { href: "/app/ads", label: "Anuncios", icon: "📊" },
  { href: "/app/config", label: "Config", icon: "🔧" },
];

export default function Sidebar({
  userName,
  rol,
}: {
  userName: string;
  rol: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-white">
      <div className="border-b p-4">
        <h2 className="text-lg font-bold text-gray-800">leadsGuadalupana</h2>
        <p className="text-xs text-gray-500 capitalize">{rol}</p>
      </div>

      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <p className="mb-2 truncate text-sm text-gray-700">{userName}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
