/**
 * Import Heyflow funnel export into data/leads.json (idempotent).
 *
 * Usage:
 *   node scripts/import-heyflow-contacts.mjs
 *   node scripts/import-heyflow-contacts.mjs --dry-run
 *   HEYFLOW_EXPORT=data/heyflow-export.raw.txt node scripts/import-heyflow-contacts.mjs
 *
 * After import, refresh local CRM:
 *   node scripts/seed-crm.mjs
 *
 * Production Redis (requires real KV env from Vercel):
 *   node scripts/import-heyflow-contacts.mjs
 *   node scripts/push-leads-redis.mjs
 *   Then in production Admin → Conversations, click Refresh contacts
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXPORT_FILE = process.env.HEYFLOW_EXPORT || "data/heyflow-export.raw.txt";
const LEADS_FILE = "data/leads.json";
const DRY_RUN = process.argv.includes("--dry-run");

const INVALID_PHONE_RAW = new Set([
  "",
  "+1",
  "1",
  "test",
  "testing",
  "j",
  "b",
  "s",
  "mendoza",
]);

const SPAM_NAME_RE =
  /^(test2?|testing|fdas)$/i;

function readJson(rel) {
  const file = path.join(ROOT, rel);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(rel, data) {
  const file = path.join(ROOT, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function isValidPhone(raw) {
  const lower = String(raw ?? "").trim().toLowerCase();
  if (INVALID_PHONE_RAW.has(lower)) return false;
  if (/^[a-z]$/i.test(lower)) return false;
  const digits = normalizePhone(raw);
  return digits.length === 10;
}

function isSpamName(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (SPAM_NAME_RE.test(lower)) return true;
  if (lower === "matthew lewis") return true;
  return false;
}

function mapPetSize(sizeText) {
  const s = String(sizeText ?? "").toLowerCase();
  if (s.includes("small")) return "small";
  if (s.includes("medium")) return "medium";
  if (s.includes("large")) return "large";
  return undefined;
}

function mapService(serviceTexts) {
  const joined = serviceTexts.filter(Boolean).join(" ").toLowerCase();
  if (!joined.trim()) return undefined;
  if (/bath\s*&\s*cut|bath and cut|haircut|full groom|groom and haircut/.test(joined)) {
    return "full-groom";
  }
  if (/bath/.test(joined)) return "bath-brush";
  return undefined;
}

function normalizeZip(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length >= 5) return digits.slice(0, 5);
  return undefined;
}

function findZipInCols(cols, phoneCol) {
  for (let i = 10; i < cols.length; i += 1) {
    if (i === phoneCol) continue;
    const raw = cols[i]?.trim();
    if (!raw || isValidPhone(raw)) continue;
    const z = normalizeZip(raw);
    if (z?.length === 5) return z;
  }
  return undefined;
}

function splitName(full) {
  const trimmed = String(full ?? "").trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseSubmissionIso(dateLine, timeLine) {
  const dateMatch = String(dateLine).match(/(\d{1,2})\/(\d{1,2})/);
  const timeMatch = String(timeLine).match(/(\d{1,2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return new Date().toISOString();
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  // Heyflow export uses day/month; submissions are from 2025 funnel activity.
  const year = 2025;
  return new Date(Date.UTC(year, month - 1, day, hour + 7, minute)).toISOString();
}

function findPhoneInCols(cols) {
  for (let i = 9; i < cols.length; i += 1) {
    const raw = cols[i]?.trim();
    if (!raw) continue;
    if (isValidPhone(raw)) return { raw, digits: normalizePhone(raw), col: i };
  }
  return null;
}

function parseHeyflowExport(rawText) {
  const lines = rawText.split(/\n/);
  const records = [];
  let i = 0;
  while (i < lines.length) {
    const id = lines[i]?.trim();
    if (!/^[A-Za-z0-9]{10,}$/.test(id ?? "")) {
      i += 1;
      continue;
    }
    const dateLine = lines[i + 1]?.trim() ?? "";
    const timeLine = lines[i + 2]?.trim() ?? "";
    const dataLine = lines[i + 3]?.trim() ?? "";
    if (!dataLine.startsWith("http")) {
      i += 1;
      continue;
    }
    const cols = dataLine.split("\t");
    records.push({
      responseId: id,
      submittedAt: parseSubmissionIso(dateLine, timeLine),
      url: cols[0] ?? "",
      referrer: cols[1] ?? "",
      pageUrl: cols[2] ?? "",
      sizeText: cols[3] ?? "",
      services: [cols[4], cols[5], cols[6]].filter((v) => v?.trim()),
      petCount: Number.parseInt(cols[7] ?? "", 10) || undefined,
      name: cols[8]?.trim() ?? "",
      zipRaw: cols[10]?.trim() ?? cols[9]?.trim() ?? "",
      cols,
    });
    i += 4;
  }
  return records;
}

function rowScore(row) {
  let score = 0;
  if (row.url.includes("#thank-you")) score += 100;
  if (row.name) score += 10;
  if (row.phone) score += 10;
  if (row.zipCode) score += 5;
  if (row.petSize) score += 3;
  if (row.service) score += 3;
  if (row.services?.length) score += 2;
  if (row.zipCode && row.zipCode !== row.phone?.slice(0, 5)) score += 4;
  score += new Date(row.submittedAt).getTime() / 1e15;
  return score;
}

function normalizeRecord(rec) {
  const phoneHit = findPhoneInCols(rec.cols);
  if (!phoneHit) return { skip: "no_valid_phone", rec };

  const zipCode = findZipInCols(rec.cols, phoneHit.col);

  const name = rec.name?.trim();
  if (isSpamName(name)) return { skip: "spam_name", rec, phone: phoneHit.digits };

  const petSize = mapPetSize(rec.sizeText);
  const service = mapService(rec.services);
  const { firstName, lastName } = splitName(name);

  return {
    skip: null,
    row: {
      responseId: rec.responseId,
      submittedAt: rec.submittedAt,
      url: rec.url,
      phone: phoneHit.digits,
      firstName,
      lastName,
      fullName: name,
      zipCode,
      petSize,
      service,
      petCount: rec.petCount,
      servicesLabel: rec.services.join(" | ") || undefined,
      isThankYou: rec.url.includes("#thank-you"),
    },
  };
}

function dedupeRows(rows) {
  const byPhone = new Map();
  for (const row of rows) {
    const prev = byPhone.get(row.phone);
    if (!prev || rowScore(row) > rowScore(prev)) {
      byPhone.set(row.phone, row);
    }
  }
  return [...byPhone.values()];
}

function buildPets(row) {
  const count = row.petCount && row.petCount > 0 ? row.petCount : 1;
  const pets = [];
  for (let i = 0; i < count; i += 1) {
    pets.push({
      petName: count === 1 ? "" : `Pet ${i + 1}`,
      petSize: row.petSize ?? "",
    });
  }
  return pets.filter((p) => p.petSize || p.petName);
}

function mergeLead(existing, row, now) {
  const noteText = `Heyflow funnel lead (${row.submittedAt.slice(0, 10)}).`;
  const hasHeyflowNote = (existing.notes ?? []).some((n) =>
    /heyflow/i.test(n.text)
  );

  const merged = { ...existing };
  merged.firstName = merged.firstName || row.firstName;
  merged.lastName = merged.lastName || row.lastName;
  merged.fullName = merged.fullName || row.fullName;
  merged.zipCode =
    row.zipCode &&
    (!merged.zipCode || merged.zipCode === merged.phone?.slice(0, 5))
      ? row.zipCode
      : merged.zipCode || row.zipCode;
  merged.petSize = merged.petSize || row.petSize;
  merged.service = merged.service || row.service;
  if (!merged.pets?.length && row.petSize) {
    merged.pets = buildPets(row);
    merged.petName = merged.pets[0]?.petName;
  }
  if (
    merged.funnelStep !== "scheduled" &&
    merged.funnelStep !== "appointment_completed"
  ) {
    merged.funnelStep = "contact_info";
  }
  if (
    merged.source !== "booking" &&
    merged.source !== "booking-hb" &&
    merged.source !== "booking-oc" &&
    merged.source !== "booking-jessica" &&
    merged.source !== "booking-melanie" &&
    !merged.appointmentId
  ) {
    merged.source = "heyflow";
  }
  merged.notes = merged.notes ?? [];
  if (!hasHeyflowNote) {
    merged.notes.unshift({
      id: randomUUID(),
      text: noteText,
      createdAt: now,
    });
  }
  merged.lastActiveAt = now;
  merged.updatedAt = now;
  if (row.submittedAt < (merged.createdAt ?? now)) {
    merged.createdAt = row.submittedAt;
    merged.contactMadeAt = row.submittedAt;
  }
  return merged;
}

function createLead(row, now) {
  const pets = buildPets(row);
  const notes = [
    {
      id: randomUUID(),
      text: `Imported from Heyflow (${row.submittedAt.slice(0, 10)}).${
        row.servicesLabel ? ` Service: ${row.servicesLabel}.` : ""
      }`,
      createdAt: now,
    },
  ];
  return {
    id: randomUUID(),
    phone: row.phone,
    contactMadeAt: row.submittedAt,
    funnelStep: "contact_info",
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    petSize: row.petSize,
    pets: pets.length ? pets : undefined,
    petName: pets[0]?.petName,
    service: row.service,
    zipCode: row.zipCode,
    followUpMode: "fu",
    listStatus: "active",
    notes,
    source: "heyflow",
    lastActiveAt: row.submittedAt,
    createdAt: row.submittedAt,
    updatedAt: now,
  };
}

function main() {
  const exportPath = path.join(ROOT, EXPORT_FILE);
  if (!existsSync(exportPath)) {
    console.error(`Missing export file: ${EXPORT_FILE}`);
    process.exit(1);
  }

  const rawText = readFileSync(exportPath, "utf8");
  const parsed = parseHeyflowExport(rawText);
  const stats = {
    exportFile: EXPORT_FILE,
    rowsParsed: parsed.length,
    skippedNoPhone: 0,
    skippedSpam: 0,
    skippedInvalidPhone: 0,
    uniqueAfterDedupe: 0,
    importedNew: 0,
    mergedExisting: 0,
    skippedDuplicate: 0,
    sampleImported: [],
  };

  const normalizedRows = [];
  for (const rec of parsed) {
    const result = normalizeRecord(rec);
    if (result.skip === "no_valid_phone") {
      stats.skippedNoPhone += 1;
      continue;
    }
    if (result.skip === "spam_name") {
      stats.skippedSpam += 1;
      continue;
    }
    normalizedRows.push(result.row);
  }

  const uniqueRows = dedupeRows(normalizedRows);
  stats.uniqueAfterDedupe = uniqueRows.length;

  const leadsData = readJson(LEADS_FILE) ?? { leads: [] };
  const leads = leadsData.leads ?? [];
  const byPhone = new Map();
  for (const lead of leads) {
    const phone = normalizePhone(lead.phone);
    if (phone.length === 10) byPhone.set(phone, lead);
  }

  const now = new Date().toISOString();
  for (const row of uniqueRows) {
    const existing = byPhone.get(row.phone);
    if (existing) {
      const before = JSON.stringify(existing);
      const merged = mergeLead(existing, row, now);
      if (JSON.stringify(merged) !== before) {
        stats.mergedExisting += 1;
        Object.assign(existing, merged);
      } else {
        stats.skippedDuplicate += 1;
      }
      continue;
    }

    const lead = createLead(row, now);
    leads.push(lead);
    byPhone.set(row.phone, lead);
    stats.importedNew += 1;
    if (stats.sampleImported.length < 12) {
      stats.sampleImported.push({
        name: lead.fullName,
        phone: lead.phone,
        zip: lead.zipCode,
        size: lead.petSize,
        service: lead.service,
      });
    }
  }

  if (!DRY_RUN) {
    writeJson(LEADS_FILE, { leads });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        ...stats,
        totalLeadsNow: leads.length,
        nextStep: DRY_RUN
          ? "Re-run without --dry-run, then: node scripts/seed-crm.mjs"
          : "Run: node scripts/seed-crm.mjs",
      },
      null,
      2
    )
  );
}

main();
