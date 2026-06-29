import { NextResponse } from "next/server";
import { getClientPhotoBytesForPortal } from "@/lib/groomer/client-photos";
import { requireClient } from "@/lib/payments/auth";

type RouteContext = { params: Promise<{ photoId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireClient();
    const { photoId } = await context.params;
    const result = await getClientPhotoBytesForPortal(photoId, sessionUser.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return new NextResponse(new Uint8Array(result.bytes), {
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
