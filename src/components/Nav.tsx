"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const items = [
  { href: "/app", label: "Dashboard", icon: "🏠", exact: true },
  { href: "/app/tasks", label: "Tugas", icon: "✅" },
  { href: "/app/gantt", label: "Gantt", icon: "📊" },
  { href: "/app/clients", label: "Sumber Kerja", icon: "🏢" },
  { href: "/app/projects", label: "Proyek", icon: "🚀" },
  { href: "/app/settings", label: "Pengaturan", icon: "⚙️" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="text-xl">✅</span>
          <span className="text-lg font-bold text-white">Taskflow</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-emerald-600/15 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-800 bg-slate-900/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
