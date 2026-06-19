import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/pages/PageHero";
import { companyLegal, legalRoutes } from "@/lib/company-legal";
import { smsMessageFlowDescription, smsTerms } from "@/lib/a2p";

export const metadata: Metadata = {
  title: "Terms & Conditions | Mobile Dog Salon",
  description:
    "Terms and conditions for Mobile Dog Salon grooming services and SMS text messaging program.",
};

export default function TermsPage() {
  const { name, siteUrl, contactEmail, businessPhoneDisplay, lastUpdated } = companyLegal;

  return (
    <>
      <PageHero
        title={<>Terms &amp; <span className="site-heading-pink">Conditions</span></>}
        subtitle="Terms for booking grooming services and our optional SMS program."
        background="hero"
      />

      <section className="site-section bg-section-white">
        <div className="site-container max-w-3xl">
          <p className="text-gray-500 text-sm mb-10">Last updated: {lastUpdated}</p>

          <div className="space-y-10 text-gray-600 leading-relaxed">
            <section>
              <h2 className="site-heading-section text-xl mb-3">Agreement</h2>
              <p>
                These Terms &amp; Conditions govern your use of the {name} website at{" "}
                <Link href={siteUrl} className="site-link">
                  mobiledog-salon.com
                </Link>{" "}
                and, where applicable, your participation in our SMS text messaging program. By
                booking services or opting in to SMS, you agree to these Terms and our{" "}
                <Link href={legalRoutes.privacy} className="site-link">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Grooming services</h2>
              <p>
                {name} provides mobile dog grooming in Orange County, California. Appointment
                times are estimates; we will communicate if a groomer is delayed. Pricing depends
                on pet size, coat condition, and service selected at booking. You agree to provide
                accurate pet and contact information and a safe environment for grooming at your
                location.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">SMS Terms</h2>
              <p>{smsTerms}</p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">How to opt in</h2>
              <p>{smsMessageFlowDescription}</p>
              <p className="mt-3">
                Primary web opt-in:{" "}
                <Link href={legalRoutes.book} className="site-link">
                  {siteUrl.replace("https://", "")}/book
                </Link>
                . You may also text <strong className="text-gray-800">START</strong> to{" "}
                {businessPhoneDisplay}.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Opt-out and help</h2>
              <p>
                Reply <strong className="text-gray-800">STOP</strong> to any message to unsubscribe.
                Reply <strong className="text-gray-800">HELP</strong> for assistance or contact{" "}
                <Link href={`mailto:${contactEmail}`} className="site-link">
                  {contactEmail}
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Privacy</h2>
              <p>
                <strong className="text-gray-800">
                  {name} does not sell, rent, or share mobile phone numbers or SMS opt-in consent
                  with third parties or affiliates for marketing or promotional purposes.
                </strong>{" "}
                See our{" "}
                <Link href={legalRoutes.privacy} className="site-link">
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>
            </section>

            <section>
              <h2 className="site-heading-section text-xl mb-3">Contact</h2>
              <p>
                Questions? Email{" "}
                <Link href={`mailto:${contactEmail}`} className="site-link">
                  {contactEmail}
                </Link>{" "}
                or call {businessPhoneDisplay}.
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
