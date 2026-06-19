import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { loadQaReport, runQaDiagnostics } from "@/lib/qa/diagnostics";

export async function GET() {
  try {
    await requireAdmin();
    const report = await loadQaReport();
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const report = await runQaDiagnostics("manual");
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "QA run failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
