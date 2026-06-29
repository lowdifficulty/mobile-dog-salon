import { NextResponse } from "next/server";
import {
  buildLickyTrainingDump,
  formatLickyTrainingMarkdown,
} from "@/lib/client/licky-training-dump";
import {
  LICKY_CUSTOM_TEXT_MAX,
  readLickyConfig,
  writeLickyConfig,
} from "@/lib/client/licky-config-store";
import { requireAdmin } from "@/lib/scheduling/auth";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    const dump = await buildLickyTrainingDump();

    if (format === "markdown" || format === "text") {
      const body = formatLickyTrainingMarkdown(dump);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="licky-training-${dump.generatedAt.slice(0, 10)}.md"`,
        },
      });
    }

    if (format === "json-download") {
      const json = JSON.stringify(dump, null, 2);
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="licky-training-${dump.generatedAt.slice(0, 10)}.json"`,
        },
      });
    }

    return NextResponse.json(dump);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const customTrainingText =
      typeof body.customTrainingText === "string" ? body.customTrainingText : "";

    if (customTrainingText.length > LICKY_CUSTOM_TEXT_MAX) {
      return NextResponse.json(
        {
          error: `Custom text must be ${LICKY_CUSTOM_TEXT_MAX.toLocaleString()} characters or fewer`,
        },
        { status: 400 }
      );
    }

    const config = await writeLickyConfig(customTrainingText);
    return NextResponse.json({
      ok: true,
      customTrainingText: config.customTrainingText,
      customTrainingUpdatedAt: config.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
