"use client";

import TwilioSettingsPanel from "@/components/admin/TwilioSettingsPanel";
import MetaSettingsPanel from "@/components/admin/MetaSettingsPanel";
import SmsBotPanel from "@/components/crm/SmsBotPanel";
import MetaBotPanel from "@/components/crm/MetaBotPanel";

/** Phone settings, Meta DMs, and Licky bots on one admin screen. */
export default function PhoneSmsPanel() {
  return (
    <div className="divide-y divide-gray-200">
      <TwilioSettingsPanel />
      <MetaSettingsPanel />
      <SmsBotPanel />
      <MetaBotPanel />
    </div>
  );
}
