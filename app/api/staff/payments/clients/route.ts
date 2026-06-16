import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { listClientSummaries } from "@/lib/payments/store";

export async function GET() {
  try {
    await requireStaff();
    const clients = await listClientSummaries();
    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
