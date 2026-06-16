import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";

export const metadata: Metadata = {
  title: "Privacy Policy | Mobile Dog Salon",
  description:
    "How Mobile Dog Salon collects, uses, and protects your information when you book grooming, contact us, or use our online payment portal.",
};

const LAST_UPDATED = "June 15, 2026";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title={<>Privacy <span className="site-heading-pink">Policy</span></>}
        subtitle="How we handle your information when you book, contact us, or pay online."
        background="hero"
      />

      <section className="site-section bg-section-white">
        <div className="site-container max-w-3xl">
          <p className="text-gray-500 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-10 text-gray-600 leading-relaxed">
            <section>
              <h2 className="site-heading-section text-xl mb-3">Who we are</h2>
              <p>
                Mobile Dog Salon provides mobile dog grooming services in Orange County,
                California. This privacy policy describes how we collect, use, and share
                information when you use our website at{" "}
                <a href="https://mobiledog-salon.com" className="site-link">
                  mobiledog-salon.com
                </a>
                , book appointments, contact us, or use our client payment portal.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Information we collect</h2>
              <p className="mb-3">We may collect the following information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-gray-800">Booking &amp; contact details</strong> — name,
                  email address, phone number, service address, pet information, preferred dates and
                  times, and messages you send through our contact or booking forms.
                </li>
                <li>
                  <strong className="text-gray-800">Client account information</strong> — if you
                  create an account in our client payment portal, we store your name, email, phone
                  number, and a hashed password so you can sign in.
                </li>
                <li>
                  <strong className="text-gray-800">Payment information</strong> — card payments are
                  processed by Square. We do not store your full credit card number on our servers.
                  Square may collect card details, billing information, and payment history
                  according to their own privacy policy.
                </li>
                <li>
                  <strong className="text-gray-800">Staff login data</strong> — groomer and admin
                  accounts use secure session cookies; we do not publish staff credentials.
                </li>
                <li>
                  <strong className="text-gray-800">Technical data</strong> — basic server logs
                  (such as IP address, browser type, and pages visited) may be collected by our
                  hosting provider to operate and secure the site.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">How we use your information</h2>
              <p className="mb-3">We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Schedule, confirm, and perform grooming appointments</li>
                <li>Send booking confirmations and calendar invitations by email</li>
                <li>Respond to questions and customer service requests</li>
                <li>Process payments and maintain payment records through Square</li>
                <li>Operate staff scheduling tools for our groomers</li>
                <li>Improve our website, security, and customer experience</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal information.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Cookies and sessions</h2>
              <p>
                Our site uses essential cookies and encrypted session cookies so clients and staff
                can stay signed in to their portals. These cookies are required for those features to
                work and are not used for third-party advertising.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Service providers</h2>
              <p className="mb-3">
                We use trusted third parties to run parts of our business. They may process your
                information only as needed to provide their services to us:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-gray-800">Square</strong> — payment processing and stored
                  cards on file
                </li>
                <li>
                  <strong className="text-gray-800">Resend</strong> — transactional email (such as
                  booking confirmations)
                </li>
                <li>
                  <strong className="text-gray-800">Vercel</strong> — website hosting
                </li>
                <li>
                  <strong className="text-gray-800">Upstash</strong> — secure data storage for
                  appointments and client accounts when configured
                </li>
              </ul>
              <p className="mt-3">
                Each provider maintains its own privacy practices. We encourage you to review
                Square&apos;s privacy policy at{" "}
                <a
                  href="https://squareup.com/us/legal/general/privacy"
                  className="site-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  squareup.com/us/legal/general/privacy
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">How long we keep information</h2>
              <p>
                We retain booking and contact records for as long as needed to provide services,
                manage appointments, resolve disputes, and meet legal requirements. Payment records
                are retained according to Square&apos;s policies and our business record-keeping
                needs. You may request deletion of account information where we are not required to
                retain it by law.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Security</h2>
              <p>
                We use industry-standard measures such as HTTPS encryption, hashed passwords, and
                secure session handling. No method of transmission over the internet is completely
                secure, but we work to protect your information appropriately.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Your choices</h2>
              <p className="mb-3">Depending on your relationship with us, you may:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Update or correct booking details by contacting us before your appointment</li>
                <li>Request information about data we hold about you</li>
                <li>Ask us to delete client account data where permitted by law</li>
                <li>Opt out of non-essential marketing communications (we send primarily service-related messages)</li>
              </ul>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">California residents</h2>
              <p>
                If you are a California resident, you may have additional rights under the
                California Consumer Privacy Act (CCPA), including the right to know what personal
                information we collect and to request deletion. We do not sell personal information.
                To exercise your rights, contact us using the information below.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Children</h2>
              <p>
                Our website is intended for adults booking pet grooming services. We do not
                knowingly collect personal information from children under 13. If you believe a
                child has provided us information, please contact us so we can remove it.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Changes to this policy</h2>
              <p>
                We may update this privacy policy from time to time. The &ldquo;Last updated&rdquo;
                date at the top of this page will reflect the most recent version. Continued use of
                our site after changes means you accept the updated policy.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Contact us</h2>
              <p>
                For privacy questions or requests, email{" "}
                <a href="mailto:hello@mobiledog-salon.com" className="site-link">
                  hello@mobiledog-salon.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
