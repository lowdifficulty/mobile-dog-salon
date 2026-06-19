import { companyLegal, legalRoutes } from "./company-legal";

const { name, siteUrl, businessPhoneDisplay } = companyLegal;

/** Paste into Twilio A2P Campaign → Message Flow / Call to Action. */
export const smsMessageFlowDescription = `End users consent to receive text messages from ${name} by booking at ${siteUrl}${legalRoutes.book} and entering their phone number. The form includes an unchecked consent box stating that by checking the box, the user agrees to receive SMS messages from ${name}. The consent language states that message and data rates may apply, message frequency may vary, users may reply STOP to opt out, and users may reply HELP for help. Users can also opt in by texting START to ${businessPhoneDisplay}. SMS consent is not a condition of purchase. ${name} does not sell or share SMS opt-in consent or mobile phone numbers with third parties or affiliates for marketing or promotional purposes. Privacy: ${siteUrl}${legalRoutes.privacy}. Terms: ${siteUrl}${legalRoutes.terms}.`;

export const smsOptInCheckboxLabel = `I agree to receive SMS messages from ${name} at the phone number provided above. Message and data rates may apply. Message frequency may vary. You may reply STOP to opt out and HELP for help. SMS consent is not a condition of purchase. ${name} does not sell or share SMS opt-in consent or mobile phone numbers with third parties or affiliates for marketing or promotional purposes.`;

export const smsPrivacyNotice = `${name} may collect your mobile phone number when you voluntarily provide it through our website booking form, contact form, or by texting an opt-in keyword to ${businessPhoneDisplay}. We use your mobile number to send appointment confirmations, reminders, scheduling updates, and customer support messages related to mobile dog grooming services.

${name} does not sell, rent, or share mobile phone numbers or SMS opt-in consent with third parties or affiliates for marketing or promotional purposes.`;

export const smsTerms = `By opting in to receive SMS messages from ${name}, you agree to receive text messages related to your grooming appointment, including booking confirmations, reminders (typically 24 hours and 2 hours before your appointment), scheduling updates, and follow-up communications. Message frequency may vary. Message and data rates may apply. You may reply STOP at any time to unsubscribe. You may reply HELP for assistance. Consent to receive SMS messages is not a condition of purchase.`;

export const smsKeywordOptInNote = `You may also opt in to SMS messages by texting START to ${businessPhoneDisplay}.`;

export const sampleConfirmationSms = `Mobile Dog Salon: You're booked! Bella — Full Groom. Saturday, June 21 at 2:00 PM PT. Groomer: Melanie. 123 Main St, Irvine. Reply STOP to opt out. HELP for help.`;

export const sampleReminderSms = `Mobile Dog Salon: Reminder — Bella's grooming is tomorrow. Full Groom · Saturday at 2:00 PM PT. Reply STOP to opt out.`;
