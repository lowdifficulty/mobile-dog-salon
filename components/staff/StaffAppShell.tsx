"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type StaffNavItem = {
  id: string;
  label: string;
  group?: string;
};

function NavIcon({ id }: { id: string }) {
  const common = "w-5 h-5 shrink-0";
  switch (id) {
    case "crm":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "appointments":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "contacts":
    case "clients":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "follow-ups":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "availability":
    case "shifts":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "route":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 19h4a2 2 0 0 0 2-2V7a2 2 0 0 1 2-2h8" />
          <circle cx="18" cy="5" r="2" />
          <circle cx="6" cy="19" r="2" />
        </svg>
      );
    case "book":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5v14M5 12h14" />
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
    case "team-calendar":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      );
    case "sms-bot":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2a7 7 0 0 0-7 7v3l-2 3h18l-2-3V9a7 7 0 0 0-7-7z" />
          <path d="M9 18a3 3 0 0 0 6 0" />
        </svg>
      );
    case "twilio":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        </svg>
      );
    case "analytics":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 19V5M10 19V9M16 19v-6M22 19V7" />
        </svg>
      );
    case "emails":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

export default function StaffAppShell({
  title,
  eyebrow = "Workspace",
  items,
  activeId,
  onSelect,
  onLogout,
  storageKey = "mds-staff-sidebar-collapsed",
  children,
}: {
  title: string;
  eyebrow?: string;
  items: StaffNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onLogout?: () => void;
  storageKey?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(storageKey) === "1");
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const groups = items.reduce<{ name: string; items: StaffNavItem[] }[]>((acc, item) => {
    const name = item.group || "Workspace";
    const existing = acc.find((g) => g.name === name);
    if (existing) existing.items.push(item);
    else acc.push({ name, items: [item] });
    return acc;
  }, []);

  const activeLabel = items.find((i) => i.id === activeId)?.label || title;

  return (
    <div className="min-h-screen bg-[#eef1f6] text-gray-900 flex">
      <aside
        className={`sticky top-0 h-screen flex flex-col bg-[#111827] text-white transition-[width] duration-200 ${
          collapsed ? "w-[72px]" : "w-[248px]"
        }`}
      >
        <div className={`flex items-center gap-3 border-b border-white/10 ${collapsed ? "px-3 py-4 justify-center" : "px-4 py-4"}`}>
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm shrink-0">
              MD
            </span>
            {!collapsed && (
              <span className="font-semibold leading-tight truncate">
                Mobile Dog <span className="text-accent">Salon</span>
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {groups.map((group) => (
            <div key={group.name}>
              {!collapsed && (
                <div className="px-3 mb-1 text-[10px] uppercase tracking-[0.14em] text-white/40 font-semibold">
                  {group.name}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => onSelect(item.id)}
                      className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                      } ${
                        active
                          ? "bg-brand-bright/20 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <NavIcon id={item.id} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2 space-y-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`w-full flex items-center gap-3 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white ${
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            }`}
            title={collapsed ? "Expand menu" : "Minimize menu"}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {collapsed ? (
                <path d="M9 6l6 6-6 6" />
              ) : (
                <path d="M15 6l-6 6 6 6" />
              )}
            </svg>
            {!collapsed && <span>{collapsed ? "Expand" : "Minimize"}</span>}
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={`w-full flex items-center gap-3 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white ${
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
              }`}
              title="Sign out"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
              {!collapsed && <span>Sign out</span>}
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 px-4 md:px-6 h-14 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{eyebrow}</p>
            <h1 className="text-base font-bold text-brand leading-tight">{activeLabel}</h1>
          </div>
          <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-brand">
            View site
          </Link>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
