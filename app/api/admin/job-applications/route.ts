import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { listJobApplications } from "@/lib/careers/store";

export async function GET() {
  try {
    await requireAdmin();
    const applications = await listJobApplications();
    return NextResponse.json({
      applications: applications.map((application) => ({
        ...application,
        resume: application.resume
          ? {
              fileName: application.resume.fileName,
              mimeType: application.resume.mimeType,
              hasFile: true,
            }
          : undefined,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
