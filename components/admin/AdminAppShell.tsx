"use client";

import StaffAppShell, { type StaffNavItem } from "@/components/staff/StaffAppShell";

export type AdminNavItem = StaffNavItem;

export default function AdminAppShell({
  title,
  items,
  activeId,
  onSelect,
  onLogout,
  children,
}: {
  title: string;
  items: AdminNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  return (
    <StaffAppShell
      title={title}
      eyebrow="Admin"
      items={items}
      activeId={activeId}
      onSelect={onSelect}
      onLogout={onLogout}
      storageKey="mds-admin-sidebar-collapsed"
    >
      {children}
    </StaffAppShell>
  );
}
