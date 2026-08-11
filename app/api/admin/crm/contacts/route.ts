import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { listCrmContacts, refreshCrm } from "@/lib/crm/service";
import type { CrmContactSortField } from "@/lib/crm/types";

const SORT_FIELDS: CrmContactSortField[] = [
  "lastInteraction",
  "areaCode",
  "address",
  "booked",
  "lastAppointment",
  "zone",
];

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const sortParam = searchParams.get("sort") as CrmContactSortField | null;
    const orderParam = searchParams.get("order");
    const result = await listCrmContacts({
      q: searchParams.get("q") ?? undefined,
      status: (searchParams.get("status") as "all" | "lead" | "customer" | "inactive") || "all",
      tag: searchParams.get("tag") ?? undefined,
      unread: searchParams.get("unread") === "1",
      sort: sortParam && SORT_FIELDS.includes(sortParam) ? sortParam : undefined,
      order: orderParam === "asc" || orderParam === "desc" ? orderParam : undefined,
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
