import "server-only";
import { readSchedulingData } from "@/lib/scheduling/store";
import { twilioStatus } from "@/lib/notifications/twilio-client";
import { isSmsBotEnabled } from "./sms-bot";
import {
  ensureCrmSeeded,
  refreshCrmContactsPreservingLiveInteractions,
} from "./seed";
import { getPersistenceMode } from "@/lib/scheduling/persistence";
import {
  findContactById,
  invalidateCrmReadCache,
  listInteractionsForContact,
  listRecentInteractions,
  markContactRead,
  readCrmData,
  setContactBotEnabled,
} from "./store";
import { displayNameFromContact } from "./phone";
import {
  extractAreaCode,
  getContactServiceZone,
  zoneSortRank,
} from "./contact-zones";
import type {
  CrmContact,
  CrmContactDetail,
  CrmContactListItem,
  CrmContactSortField,
  CrmInteraction,
} from "./types";

export type CrmListFilter = {
  q?: string;
  status?: "all" | "lead" | "customer" | "inactive";
  tag?: string;
  unread?: boolean;
  sort?: CrmContactSortField;
  order?: "asc" | "desc";
};

function enrichContactWithSortMeta(
  contact: CrmContact,
  appointments: { id: string; phone: string; startAt: string }[]
): CrmContactListItem {
  const phoneDigits = contact.phone.replace(/\D/g, "");
  const linked = appointments.filter(
    (a) =>
      contact.appointmentIds.includes(a.id) ||
      a.phone.replace(/\D/g, "").endsWith(phoneDigits)
  );
  const hasBookedAppointment = contact.appointmentIds.length > 0 || linked.length > 0;

  const pastStarts = linked
    .map((a) => a.startAt)
    .filter((startAt) => new Date(startAt).getTime() < Date.now());
  const lastAppointmentAt =
    pastStarts.length > 0
      ? pastStarts.sort((a, b) => b.localeCompare(a))[0]
      : null;

  return {
    ...contact,
    areaCode: extractAreaCode(contact.phone),
    hasBookedAppointment,
    lastAppointmentAt,
    serviceZone: getContactServiceZone(contact),
  };
}

function sortContacts(
  contacts: CrmContactListItem[],
  sort: CrmContactSortField,
  order: "asc" | "desc"
): CrmContactListItem[] {
  const dir = order === "asc" ? 1 : -1;
  const neverLast = order === "asc" ? 1 : -1;

  return [...contacts].sort((a, b) => {
    switch (sort) {
      case "areaCode": {
        const av = a.areaCode ?? "";
        const bv = b.areaCode ?? "";
        if (!av && bv) return neverLast;
        if (av && !bv) return -neverLast;
        return av.localeCompare(bv) * dir || a.fullName?.localeCompare(b.fullName ?? "") || 0;
      }
      case "address": {
        const av = (a.address || a.city || a.zipCode || "").toLowerCase();
        const bv = (b.address || b.city || b.zipCode || "").toLowerCase();
        if (!av && bv) return neverLast;
        if (av && !bv) return -neverLast;
        return av.localeCompare(bv) * dir || a.fullName?.localeCompare(b.fullName ?? "") || 0;
      }
      case "booked": {
        const av = a.hasBookedAppointment ? 1 : 0;
        const bv = b.hasBookedAppointment ? 1 : 0;
        return (av - bv) * dir || a.fullName?.localeCompare(b.fullName ?? "") || 0;
      }
      case "lastAppointment": {
        const av = a.lastAppointmentAt;
        const bv = b.lastAppointmentAt;
        if (!av && bv) return neverLast;
        if (av && !bv) return -neverLast;
        if (!av || !bv) return a.fullName?.localeCompare(b.fullName ?? "") || 0;
        return av.localeCompare(bv) * dir;
      }
      case "zone": {
        const av = zoneSortRank(a.serviceZone);
        const bv = zoneSortRank(b.serviceZone);
        return (av - bv) * dir || a.fullName?.localeCompare(b.fullName ?? "") || 0;
      }
      case "lastInteraction":
      default:
        return (
          (a.lastInteractionAt || a.updatedAt).localeCompare(
            b.lastInteractionAt || b.updatedAt
          ) * dir
        );
    }
  });
}

export async function listCrmContacts(filter: CrmListFilter = {}): Promise<{
  contacts: CrmContactListItem[];
  stats: {
    total: number;
    leads: number;
    customers: number;
    inactive: number;
    unread: number;
  };
  platform: Awaited<ReturnType<typeof twilioStatus>> & {
    smsBotEnabled: boolean;
    smsBotMode?: string;
    crmStorage: ReturnType<typeof getPersistenceMode>;
  };
}> {
  await ensureCrmSeeded();
  const data = await readCrmData();
  const { appointments } = await readSchedulingData();
  const q = filter.q?.trim().toLowerCase();

  let contacts = data.contacts.map((c) => enrichContactWithSortMeta(c, appointments));
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

  const sortField = filter.sort ?? "lastInteraction";
  const sortOrder = filter.order ?? "desc";
  contacts = sortContacts(contacts, sortField, sortOrder);

  const all = data.contacts;
  const [platform, botEnabled, botConfig] = await Promise.all([
    twilioStatus(),
    isSmsBotEnabled(),
    import("./sms-bot-config").then((m) => m.readSmsBotConfig()).catch(() => null),
  ]);
  return {
    contacts,
    stats: {
      total: all.length,
      leads: all.filter((c) => c.status === "lead").length,
      customers: all.filter((c) => c.status === "customer").length,
      inactive: all.filter((c) => c.status === "inactive").length,
      unread: all.filter((c) => (c.unreadCount ?? 0) > 0).length,
    },
    platform: {
      ...platform,
      smsBotEnabled: botConfig?.enabled ?? botEnabled,
      smsBotMode: botConfig?.mode,
      crmStorage: getPersistenceMode(),
    },
  };
}

export async function getCrmContactDetail(
  contactId: string
): Promise<CrmContactDetail | null> {
  await ensureCrmSeeded();
  invalidateCrmReadCache();
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
