import Link from "next/link";

interface Package {
  name: string;
  price: string;
  description: string;
  features: string[];
  href?: string;
}

export default function PackageCards({ packages }: { packages: Package[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {packages.map((pkg) => (
        <article key={pkg.name} className="site-card p-6 md:p-8 border-t-4 border-brand">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 className="font-bold text-brand text-xl">{pkg.name}</h3>
            <span className="text-accent font-bold">{pkg.price}</span>
          </div>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{pkg.description}</p>
          <ul className="space-y-2 mb-6">
            {pkg.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-accent mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
          {pkg.href && (
            <Link href={pkg.href} className="site-link text-sm">Learn More &gt;</Link>
          )}
        </article>
      ))}
    </div>
  );
}
