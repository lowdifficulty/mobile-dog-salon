import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { listCrmContacts, refreshCrm } from "@/lib/crm/service";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const result = await listCrmContacts({
      q: searchParams.get("q") ?? undefined,
      status: (searchParams.get("status") as "all" | "lead" | "customer" | "inactive") || "all",
      tag: searchParams.get("tag") ?? undefined,
      unread: searchParams.get("unread") === "1",
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireStaff();
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "refresh") {
      const result = await refreshCrm();
      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
