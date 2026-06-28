import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import { listGroomerActiveClients } from "@/lib/groomer/active-clients";

export async function GET() {
  try {
    const user = await requireGroomer();
    const clients = await listGroomerActiveClients(user.groomerId!);
    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
