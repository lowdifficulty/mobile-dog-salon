import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import { listPendingTransfersForGroomer } from "@/lib/staff/transfers";

export async function GET() {
  try {
    const user = await requireGroomer();
    const transfers = await listPendingTransfersForGroomer(user.groomerId!);
    return NextResponse.json({ transfers });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
