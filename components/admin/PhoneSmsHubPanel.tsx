"use client";

import TwilioSettingsPanel from "@/components/admin/TwilioSettingsPanel";
import SmsBotPanel from "@/components/crm/SmsBotPanel";
import EmailCampaignsPanel from "@/components/admin/EmailCampaignsPanel";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import LickyTrainingPanel from "@/components/scheduling/LickyTrainingPanel";
import QaDiagnosticsPanel from "@/components/scheduling/QaDiagnosticsPanel";

export type PhoneSmsSectionId =
  | "settings"
  | "sms-bot"
  | "payments"
  | "emails"
  | "licky"
  | "qa";

export const PHONE_SMS_SECTIONS: { id: PhoneSmsSectionId; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "sms-bot", label: "SMS Chatbot" },
  { id: "payments", label: "Payments" },
  { id: "emails", label: "Emails" },
  { id: "licky", label: "Licky bot" },
  { id: "qa", label: "QA" },
];

export function phoneSmsSectionLabel(id: PhoneSmsSectionId): string {
  return PHONE_SMS_SECTIONS.find((s) => s.id === id)?.label ?? "Phone & SMS";
}

export default function PhoneSmsHubPanel({
  section,
  onSectionChange,
}: {
  section: PhoneSmsSectionId;
  onSectionChange: (id: PhoneSmsSectionId) => void;
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="border-b border-gray-200 bg-white px-4 md:px-6 pt-4 pb-0 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Phone & SMS
        </p>
        <div className="flex gap-1 overflow-x-auto scrollbar-grey -mb-px">
          {PHONE_SMS_SECTIONS.map((item) => {
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`shrink-0 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={section === "settings" ? "" : "p-4 md:p-6"}>
        {section === "settings" && <TwilioSettingsPanel />}
        {section === "sms-bot" && <SmsBotPanel />}
        {section === "payments" && <StaffPaymentsPanel />}
        {section === "emails" && <EmailCampaignsPanel />}
        {section === "licky" && <LickyTrainingPanel />}
        {section === "qa" && <QaDiagnosticsPanel />}
      </div>
    </div>
  );
}
