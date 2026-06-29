import { NextResponse } from "next/server";
import {
  getClientPhotoBytes,
  removeClientPhoto,
} from "@/lib/groomer/client-photos";
import { requireGroomer } from "@/lib/scheduling/auth";

type RouteContext = { params: Promise<{ photoId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireGroomer();
    const { photoId } = await context.params;
    const result = await getClientPhotoBytes(photoId, user.groomerId!);
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireGroomer();
    const { photoId } = await context.params;
    const result = await removeClientPhoto(photoId, user.groomerId!);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
