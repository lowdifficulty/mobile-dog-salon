import type { EmailTemplate, EmailTemplateId } from "./email-template-types";

const SITE = "https://mobiledog-salon.com";

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplate> = {
  booking_confirmation: {
    id: "booking_confirmation",
    label: "Booking confirmation & verification",
    description: "Sent immediately after a customer completes booking.",
    subject: "You're booked — {{petLabel}} on {{dateLine}}",
    html: `<p>Hi {{firstName}},</p>
<p>Your Mobile Dog Salon appointment is <strong>confirmed</strong>. Please save this email — it verifies your booking details.</p>
<p>
  <strong>When:</strong> {{dateLine}}<br/>
  <strong>Time:</strong> {{timeRange}}<br/>
  <strong>Groomer:</strong> {{groomerName}}<br/>
  <strong>Pet:</strong> {{petSummary}}<br/>
  <strong>Service:</strong> {{serviceLabel}}<br/>
  <strong>Location:</strong> {{address}}
</p>
<p>{{discountLine}}</p>
<p><a href="{{manageUrl}}">View or manage your appointment</a></p>
<p>We look forward to seeing you and {{petLabel}}!</p>
<p>Questions? Reply to this email or call {{businessPhone}}.</p>
<p>— Mobile Dog Salon</p>`,
    enabled: true,
  },
  reminder_24h: {
    id: "reminder_24h",
    label: "Reminder — 24 hours before",
    description: "Email (and SMS if opted in) one day before the appointment.",
    subject: "Reminder: {{petLabel}}'s grooming is tomorrow — {{dateLine}}",
    html: `<p>Hi {{firstName}},</p>
<p>This is a friendly reminder that {{petLabel}}'s Mobile Dog Salon appointment is <strong>tomorrow</strong>.</p>
<p>
  <strong>When:</strong> {{dateLine}}<br/>
  <strong>Time:</strong> {{timeRange}}<br/>
  <strong>Groomer:</strong> {{groomerName}}<br/>
  <strong>Pet:</strong> {{petSummary}}<br/>
  <strong>Service:</strong> {{serviceLabel}}<br/>
  <strong>Location:</strong> {{address}}
</p>
<p>Our groomer will arrive at your driveway. Please have your pet ready with access to water and a safe area for grooming.</p>
<p><a href="{{manageUrl}}">View appointment details</a></p>
<p>Questions? Reply to this email or call {{businessPhone}}.</p>
<p>— Mobile Dog Salon</p>`,
    enabled: true,
  },
  reminder_1h: {
    id: "reminder_1h",
    label: "Reminder — 1 hour before",
    description: "Email (and SMS if opted in) about one hour before the appointment.",
    subject: "Reminder: {{petLabel}}'s grooming is today at {{timeRange}}",
    html: `<p>Hi {{firstName}},</p>
<p>This is a friendly reminder that {{petLabel}}'s Mobile Dog Salon appointment is in about <strong>one hour</strong>.</p>
<p>
  <strong>When:</strong> {{dateLine}}<br/>
  <strong>Time:</strong> {{timeRange}}<br/>
  <strong>Groomer:</strong> {{groomerName}}<br/>
  <strong>Pet:</strong> {{petSummary}}<br/>
  <strong>Service:</strong> {{serviceLabel}}<br/>
  <strong>Location:</strong> {{address}}
</p>
<p>See you soon!</p>
<p>— Mobile Dog Salon</p>`,
    enabled: true,
  },
  rebook_3w: {
    id: "rebook_3w",
    label: "Rebook — 3 weeks after visit",
    description: "Encourages repeat booking; reminds clients their 50% discount stays active when they rebook.",
    subject: "Book {{petLabel}} again — keep your 50% discount",
    html: `<p>Hi {{firstName}},</p>
<p>It's been about three weeks since {{petLabel}}'s last Mobile Dog Salon visit. We'd love to see you again!</p>
<p>{{discountLine}}</p>
<p><a href="{{bookUrl}}">Book your next appointment</a></p>
<p>Prefer Orange County? <a href="{{melanieBookUrl}}">Book with Melanie</a>.</p>
<p>Questions? Reply to this email or call {{businessPhone}}.</p>
<p>— Mobile Dog Salon</p>`,
    enabled: true,
  },
  staff_new_booking: {
    id: "staff_new_booking",
    label: "Staff — new booking (groomer)",
    description: "Notifies the assigned groomer when a new appointment is booked.",
    subject: "New booking: {{petSummary}} — {{dateLine}}",
    html: `<p><strong>New Mobile Dog Salon booking</strong></p>
<p>
  <strong>Groomer:</strong> {{groomerName}}<br/>
  <strong>When:</strong> {{dateLine}} · {{timeRange}}<br/>
  <strong>Client:</strong> {{firstName}} {{lastName}}<br/>
  <strong>Phone:</strong> {{phone}}<br/>
  <strong>Email:</strong> {{email}}<br/>
  <strong>Pet:</strong> {{petSummary}}<br/>
  <strong>Service:</strong> {{serviceLabel}}<br/>
  <strong>Address:</strong> {{address}}
</p>`,
    enabled: true,
  },
  melanie_new_lead: {
    id: "melanie_new_lead",
    label: "Melanie — new lead to follow up",
    description: "Alerts Melanie to follow up on every new booking.",
    subject: "Follow up: new booking — {{firstName}} {{lastName}}",
    html: `<p>Melanie,</p>
<p>A new customer just booked. Please follow up in the CRM.</p>
<p>
  <strong>Client:</strong> {{firstName}} {{lastName}}<br/>
  <strong>Phone:</strong> {{phone}}<br/>
  <strong>Email:</strong> {{email}}<br/>
  <strong>When:</strong> {{dateLine}} · {{timeRange}}<br/>
  <strong>Groomer:</strong> {{groomerName}}<br/>
  <strong>Pet:</strong> {{petSummary}}<br/>
  <strong>Service:</strong> {{serviceLabel}}<br/>
  <strong>Address:</strong> {{address}}
</p>
<p>Open the groomer dashboard → <strong>Follow-ups</strong> to log notes.</p>`,
    enabled: true,
  },
};

export const DEFAULT_BOOK_URL = `${SITE}/book`;
export const DEFAULT_MELANIE_BOOK_URL = `${SITE}/melanie`;
