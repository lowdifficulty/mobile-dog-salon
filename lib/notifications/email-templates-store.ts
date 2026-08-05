import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getRedisClient } from "@/lib/scheduling/redis-client";
import { isVercelServerless } from "@/lib/scheduling/persistence";
import { DEFAULT_EMAIL_TEMPLATES } from "./email-templates-defaults";
import type { EmailTemplate, EmailTemplateId } from "./email-template-types";

const FILE_PATH = path.join(process.cwd(), "data", "email-templates.json");
const REDIS_KEY = "mds:email-templates";

export type EmailTemplatesData = {
  templates: Partial<Record<EmailTemplateId, EmailTemplate>>;
};

function mergeWithDefaults(data: EmailTemplatesData): Record<EmailTemplateId, EmailTemplate> {
  const out = { ...DEFAULT_EMAIL_TEMPLATES };
  for (const id of Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateId[]) {
    const override = data.templates?.[id];
    if (override) {
      out[id] = { ...out[id], ...override, id };
    }
  }
  return out;
}

async function readFromFile(): Promise<EmailTemplatesData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as EmailTemplatesData;
  } catch {
    return { templates: {} };
  }
}

async function writeToFile(data: EmailTemplatesData): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readEmailTemplates(): Promise<Record<EmailTemplateId, EmailTemplate>> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<EmailTemplatesData>(REDIS_KEY);
    return mergeWithDefaults(data ?? { templates: {} });
  }
  if (isVercelServerless()) {
    return mergeWithDefaults({ templates: {} });
  }
  return mergeWithDefaults(await readFromFile());
}

export async function getEmailTemplate(id: EmailTemplateId): Promise<EmailTemplate> {
  const all = await readEmailTemplates();
  return all[id];
}

export async function updateEmailTemplate(
  id: EmailTemplateId,
  patch: Partial<Pick<EmailTemplate, "subject" | "html" | "enabled">>
): Promise<EmailTemplate> {
  const redis = getRedisClient();
  let data: EmailTemplatesData;
  if (redis) {
    data = (await redis.get<EmailTemplatesData>(REDIS_KEY)) ?? { templates: {} };
  } else if (isVercelServerless()) {
    data = { templates: {} };
  } else {
    data = await readFromFile();
  }

  const current = mergeWithDefaults(data)[id];
  const updated: EmailTemplate = {
    ...current,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };

  data.templates = { ...data.templates, [id]: updated };

  if (redis) {
    await redis.set(REDIS_KEY, data);
  } else if (!isVercelServerless()) {
    await writeToFile(data);
  }

  return updated;
}
