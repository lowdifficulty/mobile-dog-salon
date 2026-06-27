import type { ReactNode } from "react";
import Link from "next/link";
import HeroBrandingImage from "@/components/HeroBrandingImage";
import FAQSection from "@/components/pages/FAQSection";
import BulletList from "@/components/pages/BulletList";
import FranchiseForm from "@/components/franchise/FranchiseForm";
import {
  FranchiseCTABand,
  FranchisePillarCard,
  FranchiseSectionHeader,
  FranchiseSupportTile,
} from "@/components/franchise/FranchiseLayout";
import {
  FRANCHISE_ADVANTAGE_ITEMS,
  FRANCHISE_CUSTOMER_BENEFITS,
  FRANCHISE_FAQS,
  FRANCHISE_FINANCING_USES,
  FRANCHISE_IDEAL_CANDIDATES,
  FRANCHISE_INCLUDED_GROUPS,
  FRANCHISE_LAUNCH_SUPPORT,
  FRANCHISE_LEGAL_NOTICE,
  FRANCHISE_MARKETING_SYSTEMS,
  FRANCHISE_PACKAGES,
  FRANCHISE_PLATFORM_FEATURES,
  FRANCHISE_PROCESS_STEPS,
  FRANCHISE_STATS,
  FRANCHISE_SUPPORT_PILLARS,
  FRANCHISE_UNIT_ASSUMPTIONS,
  FRANCHISE_WHY_PILLARS,
} from "@/lib/franchise-content";
import { ROUTES } from "@/lib/routes";

function SectionIntro({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-3xl ${className}`}>
      <h2 className="site-heading-section mb-4">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-4 text-lg">{children}</div>
    </div>
  );
}

function StatGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {FRANCHISE_STATS.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl bg-white border border-gray-100 p-5 sm:p-6 shadow-sm text-center"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
          <p className="text-3xl sm:text-4xl font-black text-brand mt-2">{stat.value}</p>
          <p className="text-sm text-gray-500 mt-1">{stat.detail}</p>
        </div>
      ))}
    </div>
  );
}

export default function FranchisePageContent() {
  return (
    <>
      {/* Hero */}
      <section className="bg-hero-spa site-section relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/25 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#0f2447]/35 rounded-full blur-3xl -translate-x-1/4 -translate-y-1/4" />
        <div className="site-container relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              <p className="text-sm font-bold uppercase tracking-widest text-white/85 mb-3 drop-shadow-sm">
                Founder Franchise Program
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-black text-white leading-tight mb-5 drop-shadow-md">
                Start Your Own Mobile Dog Grooming Franchise
              </h1>
              <p className="text-white/95 text-base md:text-lg leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0 font-medium drop-shadow-sm">
                Looking for a great new opportunity? Mobile Dog Salon is building a tech-enabled
                mobile grooming franchise for groomers and owner-operators — with the van sourcing
                support, brand, software, marketing systems, and launch guidance to help you open
                with confidence.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <Link href="#franchise-form" className="site-btn site-btn-hero site-btn-hero-attention">
                  Get Started
                </Link>
                <Link
                  href="#why-choose"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white/70 text-sm font-bold text-white rounded-full transition-colors hover:bg-white/10"
                >
                  Why Mobile Dog Salon
                </Link>
              </div>
            </div>
            <div className="relative">
              <HeroBrandingImage href={null} />
            </div>
          </div>
        </div>
      </section>

      {/* Key numbers */}
      <section className="site-section bg-section-white border-b border-gray-100">
        <div className="site-container">
          <StatGrid />
        </div>
      </section>

      {/* Why choose — icon pillars (Zoomin-style) */}
      <section id="why-choose" className="site-section bg-section-gray scroll-mt-24">
        <div className="site-container">
          <FranchiseSectionHeader
            title="Why Choose Mobile Dog Salon?"
            subtitle="A complete mobile grooming franchise built for real operators — not just a logo and a manual."
            className="mb-12"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {FRANCHISE_WHY_PILLARS.map((pillar) => (
              <FranchisePillarCard key={pillar.title} {...pillar} />
            ))}
          </div>
        </div>
      </section>

      {/* Industry opportunity */}
      <section className="site-section bg-section-white">
        <div className="site-container max-w-4xl mx-auto text-center">
          <FranchiseSectionHeader
            title="Proven Demand for Mobile Pet Grooming"
            subtitle="Today's pet services industry is one of the fastest-growing sectors in the nation. More than two-thirds of American households own a pet, and owners increasingly want convenient, stress-free grooming at home."
          />
          <p className="text-gray-600 text-lg leading-relaxed mt-6">
            Starting alone usually means buying a van, building a website, finding customers, handling
            calls and texts, creating ads, and building systems from scratch. Mobile Dog Salon gives
            franchisees a faster path with the business infrastructure already in place.
          </p>
        </div>
      </section>

      <FranchiseCTABand
        title="Learn more about becoming a franchisee today"
        description="Whether you are an experienced groomer, a grooming business owner, or a local service entrepreneur, we will help you evaluate territory fit, startup expectations, and the full franchise package."
      />

      {/* Support pillars */}
      <section className="site-section bg-section-blue">
        <div className="site-container">
          <FranchiseSectionHeader
            title="We'll Help You Launch and Grow"
            subtitle="When you succeed, we succeed. Franchisees receive hands-on support across branding, training, marketing, technology, and daily operations."
            className="mb-10"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FRANCHISE_SUPPORT_PILLARS.map((pillar) => (
              <FranchiseSupportTile key={pillar.title} {...pillar} />
            ))}
          </div>
        </div>
      </section>

      {/* Business-in-a-box */}
      <section id="whats-included" className="site-section bg-section-white scroll-mt-24">
        <div className="site-container">
          <div className="grid lg:grid-cols-2 gap-10 items-start mb-10">
            <SectionIntro title="A Full Business-in-a-Box for Less Than Many New Grooming Vans">
              <p>
                A new mobile grooming van can cost more than the entire startup package for a Mobile
                Dog Salon franchise. Our goal is to help qualified franchisees start with a lower
                upfront cost, a proven operating structure, and the technology to manage customers,
                appointments, employees, routes, and marketing.
              </p>
            </SectionIntro>
            <div className="rounded-2xl bg-section-blue/40 border border-accent/15 p-6 sm:p-8">
              <p className="font-bold text-brand text-lg mb-3">The smarter path to opening</p>
              <p className="text-gray-700 leading-relaxed">
                Instead of spending six figures on a new van and still having no customers or
                systems, franchisees launch with brand, software, CRM, communication tools,
                marketing systems, training, and operating procedures already built.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-lg border border-gray-100 p-6 sm:p-8 lg:p-10">
            <h3 className="text-xl font-bold text-brand mb-6 text-center">
              The Mobile Dog Salon Advantage
            </h3>
            <BulletList items={FRANCHISE_ADVANTAGE_ITEMS} />
          </div>
        </div>
      </section>

      {/* Ideal candidates */}
      <section className="site-section bg-section-gray">
        <div className="site-container">
          <FranchiseSectionHeader
            title="Built for Groomers, Owner-Operators, and Entrepreneurs"
            className="mb-10"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {FRANCHISE_IDEAL_CANDIDATES.map((candidate) => (
              <div key={candidate.title} className="site-card p-6 sm:p-8 h-full border-t-4 border-accent">
                <h3 className="font-bold text-brand text-lg mb-3">{candidate.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{candidate.description}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 mt-8 max-w-2xl mx-auto">
            You do not need to be a software expert, marketing expert, or web developer. The Mobile
            Dog Salon platform and systems are included in the franchise model.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="site-section bg-section-white">
        <div className="site-container">
          <FranchiseSectionHeader
            title="Everything You Need to Launch and Operate"
            subtitle="Mobile Dog Salon is more than a name and logo. Franchisees receive a complete operating system designed specifically for mobile grooming."
            className="mb-10"
          />
          <div className="grid md:grid-cols-2 gap-6">
            {FRANCHISE_INCLUDED_GROUPS.map((group) => (
              <div key={group.title} className="site-card p-6 sm:p-8">
                <h3 className="font-bold text-brand text-lg mb-4">{group.title}</h3>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-accent font-bold shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="site-section bg-section-blue">
        <div className="site-container">
          <FranchiseSectionHeader
            title="Founder Franchise Package"
            subtitle="Mobile Dog Salon is currently building its founder franchise program for qualified early franchisees."
            className="mb-10"
          />
          <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
            {FRANCHISE_PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className={`rounded-2xl border p-6 sm:p-8 h-full ${
                  pkg.featured
                    ? "border-accent bg-white shadow-xl ring-2 ring-accent/20"
                    : "border-white/60 bg-white/80"
                }`}
              >
                {pkg.featured && (
                  <span className="inline-block text-xs font-bold uppercase tracking-wide text-accent mb-3">
                    Most complete
                  </span>
                )}
                <h3 className="font-bold text-brand text-xl mb-3">{pkg.name}</h3>
                <p className="text-gray-600 leading-relaxed">{pkg.description}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center max-w-3xl mx-auto">
            Estimated total startup range: approximately{" "}
            <strong className="text-brand">$95,000 to $139,000</strong> depending on van
            availability, equipment, territory, insurance, working capital, and launch marketing.
            All franchise costs, fees, and obligations will be disclosed in the Franchise Disclosure
            Document.
          </p>
        </div>
      </section>

      {/* Unit model */}
      <section className="site-section bg-section-white">
        <div className="site-container grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="site-heading-section mb-6">Designed Around a Simple Single-Van Model</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              One mobile grooming van serving a local territory — manageable weekly appointment
              volume, repeat customers, efficient routing, and strong customer communication.
            </p>
            <BulletList items={FRANCHISE_UNIT_ASSUMPTIONS} />
          </div>
          <div className="site-card p-6 sm:p-8 bg-section-gray/50">
            <p className="text-sm text-gray-600 leading-relaxed">
              Actual results vary by market, owner involvement, groomer availability, customer
              demand, ad performance, pricing, route density, and operating execution. Financial
              performance information, if provided, will be included in the Franchise Disclosure
              Document.
            </p>
          </div>
        </div>
      </section>

      {/* Tech + marketing */}
      <section className="site-section bg-section-gray">
        <div className="site-container">
          <FranchiseSectionHeader
            title="A Grooming Business Powered by Software"
            subtitle="Most independent groomers struggle with missed calls, manual scheduling, and inconsistent marketing. Mobile Dog Salon gives franchisees technology from day one."
            className="mb-10"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FRANCHISE_PLATFORM_FEATURES.map((feature) => (
              <div key={feature.title} className="site-card p-5 sm:p-6 border-t-4 border-brand/30">
                <h3 className="font-bold text-brand mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section bg-section-white">
        <div className="site-container grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="site-heading-section mb-4">Local Lead Generation Built In</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Franchisees receive marketing systems designed to generate leads, convert appointments,
              follow up with customers, and build repeat business.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Lead costs and results vary by market, advertising conditions, competition, seasonality,
              and execution.
            </p>
          </div>
          <BulletList items={FRANCHISE_MARKETING_SYSTEMS} />
        </div>
      </section>

      {/* Financing + launch */}
      <section className="site-section bg-section-blue">
        <div className="site-container grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="site-heading-section mb-4">Designed to Be Lender-Friendly</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              A practical, lower-cost franchise model with clear use of funds. Qualified franchisees
              may use SBA or other small business financing, subject to lender approval. Financing is
              not guaranteed.
            </p>
            <BulletList items={FRANCHISE_FINANCING_USES} />
          </div>
          <div>
            <h2 className="site-heading-section mb-4">You Are Not Starting From Scratch</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Launch support, training, systems, and procedures designed to help you open and operate
              with confidence.
            </p>
            <BulletList items={FRANCHISE_LAUNCH_SUPPORT} />
          </div>
        </div>
      </section>

      {/* Customer benefits + territory */}
      <section className="site-section bg-section-white">
        <div className="site-container grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="site-heading-section mb-4">
              Convenient Grooming at the Customer&apos;s Driveway
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Mobile grooming solves a real problem — no shop drop-offs, long waits, or stress for
              pets and owners. Mobile Dog Salon brings professional care directly to the customer.
            </p>
            <p className="font-script text-2xl text-brand">Good Dogs Take Baths.</p>
          </div>
          <BulletList items={FRANCHISE_CUSTOMER_BENEFITS} />
        </div>
      </section>

      <section className="site-section bg-section-gray">
        <div className="site-container max-w-3xl mx-auto text-center">
          <h2 className="site-heading-section mb-4">Protected Local Territories</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Franchisees operate in defined local territories based on ZIP codes, population, market
            opportunity, pet ownership density, and other local factors. Territory rights are defined
            in the Franchise Agreement.
          </p>
          <ul className="space-y-2 text-gray-700 text-left max-w-md mx-auto">
            <li>• Territory size varies by market</li>
            <li>• Additional vans may require approval</li>
            <li>• Expansion may be based on performance</li>
          </ul>
        </div>
      </section>

      {/* Process */}
      <section className="site-section bg-section-white">
        <div className="site-container">
          <FranchiseSectionHeader title="How to Get Started" className="mb-12" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {FRANCHISE_PROCESS_STEPS.map((step) => (
              <div
                key={step.step}
                className="relative site-card p-6 sm:p-7 border-l-4 border-brand"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand text-white text-sm font-black mb-4">
                  {step.step}
                </span>
                <h3 className="font-bold text-brand text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FranchiseCTABand
        title="Ready to own a Mobile Dog Salon?"
        description="Request franchise information and tell us about your target market. Founder opportunities may be limited by territory availability."
      />

      <FAQSection faqs={FRANCHISE_FAQS} />

      {/* Form */}
      <section id="franchise-form" className="site-section bg-section-pattern-blue scroll-mt-24">
        <div className="site-container max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="site-heading-section mb-3">Request Franchise Information</h2>
            <p className="text-gray-600 leading-relaxed">
              Tell us a little about yourself and your target market. A member of the Mobile Dog
              Salon team will follow up with more information.
            </p>
          </div>
          <FranchiseForm />
        </div>
      </section>

      {/* Legal */}
      <section className="site-section bg-section-gray border-t border-gray-200">
        <div className="site-container max-w-4xl">
          <p className="text-xs text-gray-500 leading-relaxed text-center">{FRANCHISE_LEGAL_NOTICE}</p>
          <p className="text-center mt-6">
            <Link href={ROUTES.contact} className="site-link text-sm font-semibold">
              Contact us with questions
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
