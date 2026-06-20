import type { Appointment, GroomerId } from "@/lib/scheduling/types";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { formatPetsList, getAppointmentPetLabel, getAppointmentPets } from "@/lib/booking/pets";
import { getServiceLabel, getServicePrice, normalizePetSize } from "@/lib/pricing";
import { GROOMERS, formatDisplayTime } from "@/lib/scheduling/groomers";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const TZ = "America/Los_Angeles";

export interface GhlBookingSyncResult {
  contactId: string | null;
  appointmentId: string | null;
  workflowEnrolled: boolean;
  webhookSent: boolean;
  errors: string[];
}

interface GhlContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  postalCode?: string;
  tags: string[];
  customFields: Record<string, string>;
}

function hasApiCredentials(): boolean {
  return Boolean(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
}

function getCalendarId(groomerId: GroomerId): string | null {
  const envKey = `GHL_CALENDAR_ID_${groomerId.toUpperCase()}` as const;
  const perGroomer = process.env[envKey];
  return perGroomer || process.env.GHL_CALENDAR_ID || null;
}

async function ghlFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${GHL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function formatAppointmentTime(iso: string): string {
  const d = new Date(iso);
  const time24 = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return formatDisplayTime(time24);
}

function formatAppointmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildCustomFields(appointment: Appointment): Record<string, string> {
  const groomer = GROOMERS[appointment.groomerId]?.name ?? appointment.groomerId;
  const serviceLabel = getServiceLabel(appointment.service);
  const price = getServicePrice(appointment.petSize, appointment.service);
  const start = new Date(appointment.startAt);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);

  return {
    pet_name: getAppointmentPetLabel(appointment),
    pet_breed: appointment.petBreed,
    pet_size: normalizePetSize(appointment.petSize),
    service: serviceLabel,
    service_price: price != null ? String(price) : "",
    groomer,
    appointment_date: formatAppointmentDate(appointment.startAt),
    appointment_time: formatAppointmentTime(appointment.startAt),
    appointment_start: start.toISOString(),
    appointment_end: end.toISOString(),
    appointment_address: formatAppointmentAddress(appointment),
    booking_id: appointment.id,
    booking_notes: appointment.notes ?? "",
  };
}

function customFieldsToApi(fields: Record<string, string>) {
  return Object.entries(fields)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, field_value]) => ({ key, field_value }));
}

function buildAppointmentNote(appointment: Appointment): string {
  const groomer = GROOMERS[appointment.groomerId]?.name ?? appointment.groomerId;
  const serviceLabel = getServiceLabel(appointment.service);
  const price = getServicePrice(appointment.petSize, appointment.service);
  const priceLine = price != null ? `$${price}` : "See size tier";

  return [
    "Mobile Dog Salon — Website Booking",
    "",
    `Pet: ${formatPetsList(getAppointmentPets(appointment))}`,
    `Size: ${normalizePetSize(appointment.petSize)}`,
    `Service: ${serviceLabel} (${priceLine})`,
    `Date: ${formatAppointmentDate(appointment.startAt)}`,
    `Time: ${formatAppointmentTime(appointment.startAt)} (2 hours)`,
    `Groomer: ${groomer}`,
    `Address: ${formatAppointmentAddress(appointment)}`,
    appointment.notes ? `Notes: ${appointment.notes}` : "",
    appointment.smsOptIn ? "SMS opt-in: Yes" : "SMS opt-in: No",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWebhookPayload(appointment: Appointment): Record<string, unknown> {
  const groomer = GROOMERS[appointment.groomerId]?.name ?? appointment.groomerId;
  const serviceLabel = getServiceLabel(appointment.service);
  const price = getServicePrice(appointment.petSize, appointment.service);
  const customFields = buildCustomFields(appointment);

  return {
    type: "mds_booking_confirmed",
    source: "Mobile Dog Salon Website",
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    fullName: `${appointment.firstName} ${appointment.lastName}`,
    email: appointment.email,
    phone: appointment.phone,
    address: appointment.address,
    city: appointment.city,
    zipCode: appointment.zipCode ?? "",
    petName: getAppointmentPetLabel(appointment),
    petBreed: appointment.petBreed,
    petSize: normalizePetSize(appointment.petSize),
    service: appointment.service,
    serviceLabel,
    price,
    startAt: appointment.startAt,
    appointmentDate: customFields.appointment_date,
    appointmentTime: customFields.appointment_time,
    groomer,
    groomerId: appointment.groomerId,
    notes: appointment.notes,
    smsOptIn: appointment.smsOptIn,
    appointmentId: appointment.id,
    ...customFields,
  };
}

async function upsertContact(input: GhlContactInput): Promise<string | null> {
  const locationId = process.env.GHL_LOCATION_ID!;

  const res = await ghlFetch("/contacts/upsert", {
    method: "POST",
    body: JSON.stringify({
      locationId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      address1: input.address1,
      city: input.city,
      postalCode: input.postalCode,
      tags: input.tags,
      source: "Mobile Dog Salon Booking",
      customFields: customFieldsToApi(input.customFields),
    }),
  });

  if (!res.ok) {
    console.error("GHL contact upsert failed:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.contact?.id ?? data.id ?? null;
}

async function addContactNote(contactId: string, body: string): Promise<void> {
  const res = await ghlFetch(`/contacts/${contactId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    console.error("GHL note failed:", await res.text());
  }
}

async function createGhlAppointment(
  appointment: Appointment,
  contactId: string
): Promise<string | null> {
  const calendarId = getCalendarId(appointment.groomerId);
  if (!calendarId) {
    console.warn(
      `GHL calendar not configured for ${appointment.groomerId} — set GHL_CALENDAR_ID or GHL_CALENDAR_ID_${appointment.groomerId.toUpperCase()}`
    );
    return null;
  }

  const locationId = process.env.GHL_LOCATION_ID!;
  const groomer = GROOMERS[appointment.groomerId]?.name ?? appointment.groomerId;
  const serviceLabel = getServiceLabel(appointment.service);
  const start = new Date(appointment.startAt);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);

  const res = await ghlFetch("/calendars/events/appointments", {
    method: "POST",
    body: JSON.stringify({
      locationId,
      calendarId,
      contactId,
      title: `Mobile Dog Groom — ${getAppointmentPetLabel(appointment)}`,
      appointmentStatus: "confirmed",
      address: `${formatAppointmentAddress(appointment)}, CA`,
      description: buildAppointmentNote(appointment),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      toNotify: true,
      ignoreFreeSlotValidation: true,
      assignedUserId: process.env[`GHL_USER_ID_${appointment.groomerId.toUpperCase()}`] ?? undefined,
    }),
  });

  if (!res.ok) {
    console.error("GHL appointment create failed:", await res.text());
    return null;
  }

  const data = await res.json();
  const appointmentId =
    data.appointment?.id ?? data.event?.id ?? data.id ?? null;

  if (appointmentId) {
    console.info(`GHL appointment created for ${groomer} / ${serviceLabel}: ${appointmentId}`);
  }

  return appointmentId;
}

async function enrollInBookingWorkflow(contactId: string): Promise<boolean> {
  const workflowId = process.env.GHL_BOOKING_WORKFLOW_ID;
  if (!workflowId) return false;

  const res = await ghlFetch(`/contacts/${contactId}/workflow/${workflowId}`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    console.error("GHL workflow enrollment failed:", await res.text());
    return false;
  }

  return true;
}

async function sendBookingWebhook(payload: Record<string, unknown>): Promise<boolean> {
  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("GHL webhook failed:", await res.text());
    return false;
  }

  return true;
}

/**
 * Sync a confirmed booking to Go High Level:
 * - Upsert contact + custom fields
 * - Create calendar appointment (toNotify → GHL confirmation/reminder emails)
 * - Enroll in confirmation/reminder workflow (optional)
 * - Fire inbound webhook for workflow automation (optional)
 */
export async function sendBookingToGoHighLevel(
  appointment: Appointment
): Promise<GhlBookingSyncResult> {
  const result: GhlBookingSyncResult = {
    contactId: null,
    appointmentId: null,
    workflowEnrolled: false,
    webhookSent: false,
    errors: [],
  };

  const webhookPayload = buildWebhookPayload(appointment);
  result.webhookSent = await sendBookingWebhook(webhookPayload);

  if (!hasApiCredentials()) {
    if (!process.env.GHL_WEBHOOK_URL) {
      result.errors.push(
        "GoHighLevel API not configured — set GHL_API_KEY + GHL_LOCATION_ID and/or GHL_WEBHOOK_URL"
      );
    }
    return result;
  }

  try {
    const tags = [
      "website-booking",
      "mds-booking-confirmed",
      appointment.service,
      `groomer-${appointment.groomerId}`,
    ];
    if (appointment.smsOptIn) tags.push("sms-opt-in");

    result.contactId = await upsertContact({
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      email: appointment.email,
      phone: appointment.phone,
      address1: appointment.address,
      city: appointment.city,
      postalCode: appointment.zipCode,
      tags,
      customFields: buildCustomFields(appointment),
    });

    if (!result.contactId) {
      result.errors.push("Could not upsert GHL contact");
      return result;
    }

    await addContactNote(result.contactId, buildAppointmentNote(appointment));

    result.appointmentId = await createGhlAppointment(
      appointment,
      result.contactId
    );

    if (!result.appointmentId && !getCalendarId(appointment.groomerId)) {
      result.errors.push("GHL calendar ID not configured — appointment not created in GHL");
    }

    result.workflowEnrolled = await enrollInBookingWorkflow(result.contactId);
  } catch (err) {
    console.error("GoHighLevel sync failed:", err);
    result.errors.push(err instanceof Error ? err.message : "Unknown GHL error");
  }

  return result;
}

export function isGoHighLevelConfigured(): boolean {
  return (
    hasApiCredentials() ||
    Boolean(process.env.GHL_WEBHOOK_URL) ||
    Boolean(process.env.GHL_BOOKING_WORKFLOW_ID)
  );
}
