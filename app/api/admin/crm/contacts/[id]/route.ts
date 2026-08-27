import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { getCrmContactDetail, updateContactBot } from "@/lib/crm/service";
import { patchCrmContactDetails, type CrmContactDetailsPatch } from "@/lib/crm/patch-contact";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireStaff();
    const { id } = await params;
    const contact = await getCrmContactDetail(id);
    if (!contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireStaff();
    const { id } = await params;
    const body = (await request.json()) as CrmContactDetailsPatch & { botEnabled?: boolean };

    if (typeof body.botEnabled === "boolean") {
      const contact = await updateContactBot(id, body.botEnabled);
      if (!contact) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ contact });
    }

    const {
      phone,
      firstName,
      lastName,
      email,
      pets,
      service,
      address,
      city,
      zipCode,
    } = body;

    const hasDetailFields =
      phone !== undefined ||
      firstName !== undefined ||
      lastName !== undefined ||
      email !== undefined ||
      pets !== undefined ||
      service !== undefined ||
      address !== undefined ||
      city !== undefined ||
      zipCode !== undefined;

    if (!hasDetailFields) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const result = await patchCrmContactDetails(
      id,
      { phone, firstName, lastName, email, pets, service, address, city, zipCode },
      user.email
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ contact: result.contact });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
