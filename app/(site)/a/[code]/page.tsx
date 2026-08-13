import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPetsList, getAppointmentPets } from "@/lib/booking/pets";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import { getServiceLabel } from "@/lib/pricing";
import { ROUTES } from "@/lib/routes";
import { formatAppointmentAddress, googleMapsSearchUrl } from "@/lib/scheduling/address";
import { findAppointmentByShortCode } from "@/lib/scheduling/appointment-short-link";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { AppointmentShortLinkOpened } from "@/components/scheduling/AppointmentShortLinkOpened";
import type { Appointment } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const appointment = await findAppointmentByShortCode(code);
  if (!appointment) {
    return { title: "Appointment not found | Mobile Dog Salon", robots: { index: false, follow: false } };
  }
  return {
    title: "Appointment details | Mobile Dog Salon",
    robots: { index: false, follow: false },
  };
}

function formatWhen(appointment: Appointment): { dateLine: string; timeRange: string } {
  const start = new Date(appointment.startAt);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);
  const tz = "America/Los_Angeles";
  return {
    dateLine: start.toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    timeRange: `${start.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    })} – ${end.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    })} PT`,
  };
}

export default async function AppointmentShortLinkPage({ params }: PageProps) {
  const { code } = await params;
  const appointment = await findAppointmentByShortCode(code);
  if (!appointment) notFound();

  const when = formatWhen(appointment);
  const address = formatAppointmentAddress(appointment);
  const cancelled = appointment.status === "cancelled";
  const clientName = [appointment.firstName, appointment.lastName].filter(Boolean).join(" ").trim();
  const pets = formatPetsList(getAppointmentPets(appointment));

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <AppointmentShortLinkOpened code={code} />
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2">
        Mobile Dog Salon
      </p>
      <h1 className="text-3xl font-bold text-brand mb-2">Appointment details</h1>
      <p className="text-gray-600 mb-6">
        {cancelled ? "This visit was cancelled." : "Save this page for your grooming visit."}
      </p>

      <div className="site-card p-6 space-y-4">
        {cancelled && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm font-semibold">
            Cancelled
          </div>
        )}
        <Detail label="When" value={`${when.dateLine} · ${when.timeRange}`} />
        <Detail label="Groomer" value={GROOMERS[appointment.groomerId]?.name ?? appointment.groomerId} />
        <Detail label="Client" value={clientName || "—"} />
        <Detail label="Pet" value={pets || "—"} />
        <Detail label="Service" value={getServiceLabel(appointment.service)} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Location</div>
          <a
            href={googleMapsSearchUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            {address}
          </a>
        </div>
        <Detail label="Phone" value={formatPhoneDisplay(appointment.phone)} />
        {appointment.notes.trim() ? <Detail label="Notes" value={appointment.notes} /> : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={ROUTES.myAppointment} className="site-btn px-4 py-2 text-sm">
          Manage appointment
        </Link>
        <Link
          href={ROUTES.book}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-brand"
        >
          Book another visit
        </Link>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-gray-900 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
