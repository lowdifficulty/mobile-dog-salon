/**
 * Email delivery QA — run: node scripts/qa-email-delivery.mjs [recipient]
 * Loads RESEND_API_KEY from .env.local (or env). Does not commit secrets.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Resend } from "resend";
import { DEFAULT_EMAIL_TEMPLATES } from "../lib/notifications/email-templates-defaults.ts";
import { renderEmailTemplate } from "../lib/notifications/template-render.ts";

const TO = process.argv[2]?.trim() || "mattlewis06@gmail.com";
const ROOT = process.cwd();

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const SAMPLE_VARS = {
  firstName: "Matt",
  lastName: "Lewis",
  petLabel: "Bella",
  petSummary: "Bella (Goldendoodle, large)",
  groomerName: "Melanie",
  serviceLabel: "Full groom",
  dateLine: "Tuesday, August 12, 2026",
  timeRange: "2:00 PM – 5:00 PM",
  address: "123 Main St, Newport Beach, CA 92663",
  manageUrl: "https://mobiledog-salon.com/my-appointment",
  bookUrl: "https://mobiledog-salon.com/book",
  melanieBookUrl: "https://mobiledog-salon.com/melanie",
  businessPhone: "(714) 555-0100",
  discountLine: "[QA TEST] Sample discount line for preview.",
  phone: "(714) 555-0100",
  email: TO,
};

const TEST_FROM =
  process.env.EMAIL_TEST_FROM?.trim() ?? "Mobile Dog Salon <team@mobiledog-salon.com>";
const BOOKING_FROM =
  process.env.BOOKING_EMAIL_FROM?.trim() ??
  "Mobile Dog Salon <bookings@mobiledog-salon.com>";

const TEMPLATE_IDS = Object.keys(DEFAULT_EMAIL_TEMPLATES);

async function probeSend(resend, { from, subject, html }) {
  const result = await resend.emails.send({ from, to: [TO], subject, html });
  if (result.error) {
    return {
      ok: false,
      error:
        typeof result.error.message === "string"
          ? result.error.message
          : JSON.stringify(result.error),
    };
  }
  return { ok: true, resendId: result.data?.id };
}

async function main() {
  loadEnvLocal();
  const key = process.env.RESEND_API_KEY?.trim();
  const report = {
    ranAt: new Date().toISOString(),
    recipient: TO,
    checks: [],
    templateSends: [],
  };

  if (!key) {
    report.checks.push({
      id: "resend_api_key",
      status: "fail",
      message: "RESEND_API_KEY not set (.env.local or environment)",
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.checks.push({
    id: "resend_api_key",
    status: "pass",
    message: "RESEND_API_KEY present",
  });

  const resend = new Resend(key);

  const domainProbe = await probeSend(resend, {
    from: TEST_FROM,
    subject: "[QA] Domain probe",
    html: "<p>QA domain probe from team@</p>",
  });
  report.checks.push({
    id: "domain_verification",
    status: domainProbe.ok ? "pass" : "fail",
    message: domainProbe.ok
      ? "Resend accepted send from team@mobiledog-salon.com"
      : domainProbe.error,
  });

  for (const templateId of TEMPLATE_IDS) {
    const template = DEFAULT_EMAIL_TEMPLATES[templateId];
    const subject = `[QA TEST] ${renderEmailTemplate(template.subject, SAMPLE_VARS)}`;
    const html = renderEmailTemplate(template.html, SAMPLE_VARS);
    const from =
      templateId === "booking_confirmation" || templateId.startsWith("reminder")
        ? BOOKING_FROM
        : TEST_FROM;

    const sent = await probeSend(resend, { from, subject, html });
    report.templateSends.push({
      templateId,
      from,
      ok: sent.ok,
      resendId: sent.resendId,
      error: sent.error,
    });
    await new Promise((r) => setTimeout(r, 600));
  }

  const okCount = report.templateSends.filter((t) => t.ok).length;
  report.summary = {
    templatesOk: okCount,
    templatesTotal: report.templateSends.length,
    overall: domainProbe.ok && okCount === report.templateSends.length ? "pass" : "fail",
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.summary.overall === "pass" ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
