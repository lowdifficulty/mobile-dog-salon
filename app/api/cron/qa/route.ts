import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { runQaDiagnostics } from "@/lib/qa/diagnostics";

/** Daily QA diagnostics — Vercel Cron. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runQaDiagnostics("cron");
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("QA cron failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "QA cron failed" },
      { status: 500 }
    );
  }
}
