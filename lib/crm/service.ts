import "server-only";
import { readSchedulingData } from "@/lib/scheduling/store";
import { twilioStatus } from "@/lib/notifications/twilio-client";
import { isSmsBotEnabled } from "./sms-bot";
import {
  ensureCrmSeeded,
  refreshCrmContactsPreservingLiveInteractions,
} from "./seed";
import {
  findContactById,
  listInteractionsForContact,
  listRecentInteractions,
  markContactRead,
  readCrmData,
  setContactBotEnabled,
} from "./store";
import { displayNameFromContact } from "./phone";
import type { CrmContact, CrmContactDetail, CrmInteraction } from "./types";

export type CrmListFilter = {
  q?: string;
  status?: "all" | "lead" | "customer" | "inactive";
  tag?: string;
  unread?: boolean;
};

export async function listCrmContacts(filter: CrmListFilter = {}): Promise<{
  contacts: CrmContact[];
  stats: {
    total: number;
    leads: number;
    customers: number;
    inactive: number;
    unread: number;
  };
  platform: ReturnType<typeof twilioStatus> & { smsBotEnabled: boolean };
}> {
  await ensureCrmSeeded();
  const data = await readCrmData();
  const q = filter.q?.trim().toLowerCase();

  let contacts = [...data.contacts];
  if (filter.status && filter.status !== "all") {
    contacts = contacts.filter((c) => c.status === filter.status);
  }
  if (filter.tag) {
    contacts = contacts.filter((c) => c.tags.includes(filter.tag!));
  }
  if (filter.unread) {
    contacts = contacts.filter((c) => (c.unreadCount ?? 0) > 0);
  }
  if (q) {
    contacts = contacts.filter((c) => {
      const hay = [
        c.fullName,
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.zipCode,
        ...c.pets.map((p) => p.petName),
        ...c.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  contacts.sort((a, b) =>
    (b.lastInteractionAt || b.updatedAt).localeCompare(a.lastInteractionAt || a.updatedAt)
  );

  const all = data.contacts;
  return {
    contacts,
    stats: {
      total: all.length,
      leads: all.filter((c) => c.status === "lead").length,
      customers: all.filter((c) => c.status === "customer").length,
      inactive: all.filter((c) => c.status === "inactive").length,
      unread: all.filter((c) => (c.unreadCount ?? 0) > 0).length,
    },
    platform: { ...twilioStatus(), smsBotEnabled: isSmsBotEnabled() },
  };
}

export async function getCrmContactDetail(
  contactId: string
): Promise<CrmContactDetail | null> {
  await ensureCrmSeeded();
  const contact = await findContactById(contactId);
  if (!contact) return null;

  const interactions = await listInteractionsForContact(contactId);
  const { appointments } = await readSchedulingData();
  const now = Date.now();
  const mine = appointments.filter(
    (a) =>
      contact.appointmentIds.includes(a.id) ||
      a.phone.replace(/\D/g, "").endsWith(contact.phone)
  );

  const mapped = mine.map((a) => ({
    id: a.id,
    startAt: a.startAt,
    status: a.status,
    service: a.service,
    petName: a.petName,
    groomerId: a.groomerId,
  }));

  await markContactRead(contactId);
  const refreshed = (await findContactById(contactId)) ?? contact;

  return {
    ...refreshed,
    fullName: displayNameFromContact(refreshed),
    interactions,
    upcomingAppointments: mapped
      .filter((a) => a.status === "confirmed" && new Date(a.startAt).getTime() >= now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    pastAppointments: mapped
      .filter((a) => new Date(a.startAt).getTime() < now)
      .sort((a, b) => b.startAt.localeCompare(a.startAt)),
  };
}

export async function listCrmInbox(limit = 80): Promise<{
  interactions: (CrmInteraction & { contactName: string })[];
}> {
  await ensureCrmSeeded();
  const data = await readCrmData();
  const byId = new Map(data.contacts.map((c) => [c.id, c]));
  const recent = await listRecentInteractions(limit);
  return {
    interactions: recent.map((i) => ({
      ...i,
      contactName: displayNameFromContact(byId.get(i.contactId) || { phone: i.phone }),
    })),
  };
}

export async function refreshCrm(): Promise<{ contactCount: number; interactionCount: number }> {
  const data = await refreshCrmContactsPreservingLiveInteractions();
  return {
    contactCount: data.contacts.length,
    interactionCount: data.interactions.length,
  };
}

export async function updateContactBot(
  contactId: string,
  botEnabled: boolean
): Promise<CrmContact | null> {
  return setContactBotEnabled(contactId, botEnabled);
}
