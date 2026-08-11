import { readFileSync } from "node:fs";
import Stripe from "stripe";

try {
  const envPath = new URL("../.env.local", import.meta.url);
  const envFile = readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && value) process.env[key] = value;
  }
} catch {
  // use existing env
}

const secret = process.env.STRIPE_SECRET_KEY?.trim();
const publishable =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
  process.env.STRIPE_PUBLISHABLE_KEY?.trim();

if (!secret) {
  console.error("Set STRIPE_SECRET_KEY in .env.local or the environment.");
  process.exit(1);
}

if (!publishable) {
  console.error("Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (or STRIPE_PUBLISHABLE_KEY).");
  process.exit(1);
}

const stripe = new Stripe(secret);
const balance = await stripe.balance.retrieve();

console.log("Stripe connection OK");
console.log(`Mode: ${balance.livemode ? "live" : "test"}`);
console.log(
  `Available: ${balance.available.map((b) => `${b.amount / 100} ${b.currency}`).join(", ") || "0"}`
);
console.log(`Publishable key: ${publishable.slice(0, 8)}…${publishable.slice(-4)}`);
console.log("");
console.log("Webhook URL (optional): https://mobiledog-salon.com/api/webhooks/stripe");
