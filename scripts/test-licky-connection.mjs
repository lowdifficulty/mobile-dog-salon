/**
 * Verify OpenAI credentials for Licky chat.
 *
 * Usage:
 *   node scripts/test-licky-connection.mjs
 *
 * Requires OPENAI_API_KEY in .env.local or environment.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY.");
  console.error("Run: node scripts/connect-licky.mjs YOUR_KEY");
  process.exit(1);
}

const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const client = new OpenAI({ apiKey });

try {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "You are Licky, a friendly tan Chihuahua. Reply in one short sentence.",
      },
      { role: "user", content: "Say hello to a new client!" },
    ],
    max_tokens: 80,
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  console.log("OpenAI connected ✓");
  console.log("Model:", model);
  console.log("Licky says:", reply ?? "(empty response)");
} catch (err) {
  console.error("OpenAI connection failed:", err.message ?? err);
  process.exit(1);
}
