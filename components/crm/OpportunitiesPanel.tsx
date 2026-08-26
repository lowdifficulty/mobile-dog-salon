"use client";

import { useState } from "react";
import LeadsPanel from "@/components/leads/LeadsPanel";
import CrmContactsPanel from "@/components/crm/CrmContactsPanel";

type SubTab = "pipeline" | "contacts";

export default function OpportunitiesPanel({
  onOpenConversation,
  appointmentsApiBase = "/api/staff/appointments",
  allowOverrideAvailability = false,
}: {
  onOpenConversation?: (contactId: string) => void;
  appointmentsApiBase?: string;
  allowOverrideAvailability?: boolean;
}) {
  const [subTab, setSubTab] = useState<SubTab>("pipeline");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {(
          [
            { id: "pipeline" as const, label: "Opportunities" },
            { id: "contacts" as const, label: "Contacts" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              subTab === t.id
                ? "bg-brand text-white border-brand"
                : "bg-white text-brand border-gray-200 hover:border-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "pipeline" && (
        <LeadsPanel
          apiBase="/api/staff/leads"
          appointmentsApiBase={appointmentsApiBase}
          contactsLayout
          hideJobApplicants
          allowOverrideAvailability={allowOverrideAvailability}
          onOpenConversation={onOpenConversation}
        />
      )}
      {subTab === "contacts" && (
        <CrmContactsPanel onOpenConversation={onOpenConversation} />
      )}
    </div>
  );
}
