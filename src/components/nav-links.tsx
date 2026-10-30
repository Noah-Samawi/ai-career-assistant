"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

const ICONS: Record<string, string> = {
  dashboard: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  cv: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8M9 9h3",
  loops: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4",
  matches: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5",
  applications: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5",
  notifications: "M6 9a6 6 0 1 1 12 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 0 0 4 0",
  sources: "M4 6h16M4 12h16M4 18h10",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 7.5 4 7 3 10l2 1v2l-2 1 1 3 2-.5 1.5 1.5-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z",
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cn("size-4 shrink-0", className)} aria-hidden>
      <path d={ICONS[name] ?? ""} />
    </svg>
  );
}

export function NavLinks({ items, orientation = "vertical" }: { items: NavItem[]; orientation?: "vertical" | "horizontal" }) {
  const path = usePathname();
  return (
    <nav className={orientation === "vertical" ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto"}>
      {items.map((it) => {
        const active = path === it.href || path.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition",
              active ? "bg-surface-2 font-medium text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {!!it.badge && <span className="ms-auto rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-ink tabular">{it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
