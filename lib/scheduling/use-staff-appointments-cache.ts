"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

type Listener = () => void;

const cache = new Map<GroomerId, Appointment[]>();
const inflight = new Map<GroomerId, Promise<Appointment[]>>();
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeStaffAppointments(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStaffAppointmentsCache(groomerId: GroomerId): Appointment[] | null {
  return cache.get(groomerId) ?? null;
}

export function setStaffAppointmentsCache(
  groomerId: GroomerId,
  appointments: Appointment[]
): void {
  cache.set(groomerId, appointments);
  notify();
}

export function invalidateStaffAppointmentsCache(groomerId?: GroomerId): void {
  if (groomerId) {
    cache.delete(groomerId);
    inflight.delete(groomerId);
  } else {
    cache.clear();
    inflight.clear();
  }
  notify();
}

/** Prefetch appointments for conflict checking in staff/groomer book forms. */
export async function prefetchStaffAppointments(
  groomerId: GroomerId,
  options?: { apiUrl?: string; query?: string }
): Promise<Appointment[]> {
  const cached = cache.get(groomerId);
  if (cached) return cached;

  const existing = inflight.get(groomerId);
  if (existing) return existing;

  const apiUrl = options?.apiUrl ?? "/api/staff/appointments";
  const query =
    options?.query ?? `groomerId=${encodeURIComponent(groomerId)}&filter=all`;
  const url = query ? `${apiUrl}?${query}` : apiUrl;

  const promise = fetch(url, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { appointments: [] }))
    .then((data) => {
      const list = (data.appointments ?? []) as Appointment[];
      cache.set(groomerId, list);
      inflight.delete(groomerId);
      notify();
      return list;
    })
    .catch(() => {
      inflight.delete(groomerId);
      return cache.get(groomerId) ?? [];
    });

  inflight.set(groomerId, promise);
  return promise;
}

export function useStaffAppointmentsForPicker(groomerId: GroomerId): Appointment[] {
  const appointments = useSyncExternalStore(
    subscribeStaffAppointments,
    () => getStaffAppointmentsCache(groomerId) ?? [],
    () => []
  );

  useEffect(() => {
    if (!getStaffAppointmentsCache(groomerId)) {
      void prefetchStaffAppointments(groomerId);
    }
  }, [groomerId]);
  return appointments;
}
