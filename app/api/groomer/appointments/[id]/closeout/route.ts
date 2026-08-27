import { NextResponse } from "next/server";
import { requireGroomer } from "@/lib/scheduling/auth";
import { getGroomerVisitCloseout } from "@/lib/scheduling/visit-closeout";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireGroomer();
    const { id } = await context.params;
    const result = await getGroomerVisitCloseout(id, user.groomerId!);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      appointment: result.appointment,
      leadId: result.leadId,
      photos: result.photos,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
