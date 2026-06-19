"use client";

import Link from "next/link";
import { smsKeywordOptInNote, smsOptInCheckboxLabel } from "@/lib/a2p";
import { legalRoutes } from "@/lib/company-legal";

interface SmsOptInFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  name?: string;
  showKeywordNote?: boolean;
}

export default function SmsOptInField({
  checked,
  onChange,
  id = "sms-opt-in",
  name = "sms_opt_in",
  showKeywordNote = true,
}: SmsOptInFieldProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-brand focus:ring-brand-bright/30"
        />
        <span className="text-sm text-gray-600 leading-relaxed">
          {smsOptInCheckboxLabel} See our{" "}
          <Link href={legalRoutes.privacy} className="font-medium text-brand hover:text-accent">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href={legalRoutes.terms} className="font-medium text-brand hover:text-accent">
            Terms &amp; Conditions
          </Link>
          .
        </span>
      </label>
      {showKeywordNote && (
        <p className="text-xs leading-relaxed text-gray-500 pl-7">{smsKeywordOptInNote}</p>
      )}
    </div>
  );
}
