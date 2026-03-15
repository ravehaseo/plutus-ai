"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/allocate", label: "Allocate", icon: "💰" },
  { href: "/compare", label: "Compare", icon: "📋" },
  { href: "/calculator", label: "Income Goal", icon: "🎯" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/profiles", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-plutus-border bg-plutus-surface">
      <div className="flex h-16 items-center gap-2 border-b border-plutus-border px-5">
        <span className="text-2xl">⚡</span>
        <span className="text-lg font-bold text-plutus-gold">Plutus A.I</span>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-plutus-gold/10 text-plutus-gold"
                      : "text-plutus-text-secondary hover:bg-plutus-surface-light hover:text-plutus-text-primary"
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-plutus-border p-4">
        <p className="text-xs text-plutus-text-secondary">Plutus A.I v0.1</p>
      </div>
    </aside>
  );
}
