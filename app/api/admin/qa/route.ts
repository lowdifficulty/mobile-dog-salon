import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { loadQaReport, runQaDiagnostics, sortQaChecks } from "@/lib/qa/diagnostics";

function withSortedChecks(
  report: Awaited<ReturnType<typeof loadQaReport>>
): NonNullable<Awaited<ReturnType<typeof loadQaReport>>> | null {
  if (!report) return null;
  return { ...report, checks: sortQaChecks(report.checks) };
}

export async function GET() {
  try {
    await requireAdmin();
    const report = withSortedChecks(await loadQaReport());
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
    const report = withSortedChecks(await runQaDiagnostics("manual"));
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "QA run failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
