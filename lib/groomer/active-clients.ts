import "server-only";

import { getAppointmentBookedPrice, appointmentHasPhoneDiscount } from "@/lib/booking/appointment-title";
import { getAppointmentPets } from "@/lib/booking/pets";
import { appointmentPacificDate } from "@/lib/leads/filters";
import { normalizePhone } from "@/lib/leads/normalize";
import { readLeadsData } from "@/lib/leads/store";
import type { Lead, LeadNote } from "@/lib/leads/types";
import { clientPhotoUrl } from "@/lib/groomer/client-photos";
import { enrichPaymentsWithClients } from "@/lib/payments/staff";
import { isSquareConfigured, listRecentPayments } from "@/lib/payments/square";
import { readClientsData } from "@/lib/payments/store";
import type { ClientAccount, PaymentHistoryItem } from "@/lib/payments/types";
import { groomerSeesTeamAppointments } from "@/lib/scheduling/groomers";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export interface GroomerClientAppointment {
  id: string;
  startAt: string;
  service: string;
  petName: string;
  petSize: string;
  isUpcoming: boolean;
  quotedPriceCents: number | null;
  paidAmountCents: number | null;
}

export interface GroomerClientPayment {
  id: string;
  amountCents: number;
  createdAt: string;
  status: string;
  note?: string;
}

export interface GroomerClientPhoto {
  id: string;
  url: string;
  petName?: string;
  caption?: string;
  createdAt: string;
}

export interface GroomerClientRecord {
  key: string;
  leadId: string | null;
  anchorAppointmentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  service: string;
  discountActive: boolean;
  pets: { petName: string; petSize: string }[];
  notes: LeadNote[];
  photos: GroomerClientPhoto[];
  appointments: GroomerClientAppointment[];
  payments: GroomerClientPayment[];
  nextAppointmentAt: string | null;
  lastAppointmentAt: string | null;
  totalQuotedCents: number;
  totalPaidCents: number;
}

function clientKeyForAppointment(appointment: Appointment): string {
  const phone = normalizePhone(appointment.phone);
  if (phone.length >= 10) return `phone:${phone}`;
  return `appointment:${appointment.id}`;
}

function findLeadForAppointment(
  appointment: Appointment,
  leads: Lead[]
): Lead | null {
  const byId = leads.find((lead) => lead.appointmentId === appointment.id);
  if (byId) return byId;

  const phone = normalizePhone(appointment.phone);
  if (phone.length < 10) return null;

  return leads.find((lead) => normalizePhone(lead.phone) === phone) ?? null;
}

function findPortalClient(
  clients: ClientAccount[],
  phone: string,
  email: string
): ClientAccount | null {
  const normPhone = normalizePhone(phone);
  const normEmail = email.trim().toLowerCase();

  if (normPhone.length >= 10) {
    const byPhone = clients.find(
      (c) => normalizePhone(c.phone) === normPhone
    );
    if (byPhone) return byPhone;
  }

  if (normEmail) {
    const byEmail = clients.find(
      (c) => c.email.trim().toLowerCase() === normEmail
    );
    if (byEmail) return byEmail;
  }

  return null;
}

function mergePets(
  appointments: Appointment[]
): { petName: string; petSize: string }[] {
  const seen = new Set<string>();
  const pets: { petName: string; petSize: string }[] = [];

  for (const appointment of appointments) {
    for (const pet of getAppointmentPets(appointment)) {
      if (!pet.petSize) continue;
      const id = `${pet.petName}|${pet.petSize}`;
      if (seen.has(id)) continue;
      seen.add(id);
      pets.push(pet);
    }
  }

  return pets;
}

function quotedPriceCents(appointment: Appointment): number | null {
  const price = getAppointmentBookedPrice(appointment);
  if (price == null) return null;
  return Math.round(price * 100);
}

function isCompletedPayment(status: string): boolean {
  return status === "COMPLETED" || status === "APPROVED";
}

function matchPaidAmountCents(
  appointment: Appointment,
  clientPayments: PaymentHistoryItem[],
  usedPaymentIds: Set<string>
): number | null {
  const quoted = quotedPriceCents(appointment);
  const apDate = appointmentPacificDate(appointment.startAt);

  for (const payment of clientPayments) {
    if (!isCompletedPayment(payment.status)) continue;
    if (usedPaymentIds.has(payment.id)) continue;

    const payDate = appointmentPacificDate(payment.createdAt);
    if (payDate !== apDate) continue;

    if (quoted != null) {
      const diff = Math.abs(payment.amountCents - quoted);
      if (diff <= 150) {
        usedPaymentIds.add(payment.id);
        return payment.amountCents;
      }
    } else {
      usedPaymentIds.add(payment.id);
      return payment.amountCents;
    }
  }

  return null;
}

export async function listGroomerActiveClients(
  groomerId: GroomerId
): Promise<GroomerClientRecord[]> {
  const [{ appointments }, { leads }, { clients: portalClients }] =
    await Promise.all([
      readSchedulingData(),
      readLeadsData(),
      readClientsData(),
    ]);

  let allPayments: PaymentHistoryItem[] = [];
  if (isSquareConfigured()) {
    try {
      allPayments = await enrichPaymentsWithClients(
        await listRecentPayments(200)
      );
    } catch {
      allPayments = [];
    }
  }

  const paymentsBySquareId = new Map<string, PaymentHistoryItem[]>();
  for (const payment of allPayments) {
    if (!payment.customerId) continue;
    const list = paymentsBySquareId.get(payment.customerId) ?? [];
    list.push(payment);
    paymentsBySquareId.set(payment.customerId, list);
  }

  const now = Date.now();

  const scopeToOwnAppointments = !groomerSeesTeamAppointments(groomerId);
  const groomerAppointments = appointments
    .filter(
      (a) =>
        a.status === "confirmed" &&
        (!scopeToOwnAppointments || a.groomerId === groomerId)
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const groups = new Map<string, Appointment[]>();
  for (const appointment of groomerAppointments) {
    const key = clientKeyForAppointment(appointment);
    const list = groups.get(key) ?? [];
    list.push(appointment);
    groups.set(key, list);
  }

  const clients: GroomerClientRecord[] = [];

  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => a.startAt.localeCompare(b.startAt));
    const latest = sorted[sorted.length - 1];
    const lead = findLeadForAppointment(latest, leads);

    const portalClient = findPortalClient(
      portalClients,
      lead?.phone ?? latest.phone,
      lead?.email ?? latest.email
    );

    const clientPayments = portalClient
      ? (paymentsBySquareId.get(portalClient.squareCustomerId) ?? [])
      : [];

    const usedPaymentIds = new Set<string>();
    const appointmentSummaries: GroomerClientAppointment[] = sorted.map(
      (ap) => ({
        id: ap.id,
        startAt: ap.startAt,
        service: ap.service,
        petName: ap.petName,
        petSize: ap.petSize,
        isUpcoming: new Date(ap.startAt).getTime() >= now,
        quotedPriceCents: quotedPriceCents(ap),
        paidAmountCents: matchPaidAmountCents(ap, clientPayments, usedPaymentIds),
      })
    );

    const upcoming = appointmentSummaries.filter((ap) => ap.isUpcoming);
    const past = appointmentSummaries.filter((ap) => !ap.isUpcoming);

    const payments: GroomerClientPayment[] = clientPayments
      .filter((p) => isCompletedPayment(p.status))
      .map((p) => ({
        id: p.id,
        amountCents: p.amountCents,
        createdAt: p.createdAt,
        status: p.status,
        note: p.note,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const totalQuotedCents = appointmentSummaries.reduce(
      (sum, ap) => sum + (ap.quotedPriceCents ?? 0),
      0
    );

    const totalPaidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

    const discountActive =
      lead?.discountActive === true ||
      (lead?.discountActive !== false &&
        !lead?.discountSkipped &&
        appointmentHasPhoneDiscount(latest));

    clients.push({
      key,
      leadId: lead?.id ?? null,
      anchorAppointmentId: latest.id,
      firstName: lead?.firstName ?? latest.firstName,
      lastName: lead?.lastName ?? latest.lastName,
      phone: lead?.phone ?? latest.phone,
      email: lead?.email ?? latest.email ?? "",
      address: lead?.address ?? latest.address ?? "",
      city: lead?.city ?? latest.city ?? "",
      zipCode: lead?.zipCode ?? latest.zipCode ?? "",
      service: lead?.service ?? latest.service ?? "",
      discountActive,
      pets: mergePets(sorted),
      notes: lead?.notes ?? [],
      photos: (lead?.photos ?? []).map((photo) => ({
        id: photo.id,
        url: clientPhotoUrl(photo.id),
        petName: photo.petName,
        caption: photo.caption,
        createdAt: photo.createdAt,
      })),
      appointments: [...upcoming, ...past.reverse()],
      payments,
      nextAppointmentAt: upcoming[0]?.startAt ?? null,
      lastAppointmentAt: past[past.length - 1]?.startAt ?? null,
      totalQuotedCents,
      totalPaidCents,
    });
  }

  clients.sort((a, b) => {
    if (a.nextAppointmentAt && b.nextAppointmentAt) {
      return a.nextAppointmentAt.localeCompare(b.nextAppointmentAt);
    }
    if (a.nextAppointmentAt) return -1;
    if (b.nextAppointmentAt) return 1;
    if (a.lastAppointmentAt && b.lastAppointmentAt) {
      return b.lastAppointmentAt.localeCompare(a.lastAppointmentAt);
    }
    return 0;
  });

  return clients;
}
