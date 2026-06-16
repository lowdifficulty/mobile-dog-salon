interface Feature {
  title: string;
  description: string;
}

export default function FeatureGrid({ features, columns = 3 }: { features: Feature[]; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-6 ${colClass}`}>
      {features.map((f) => (
        <article key={f.title} className="site-card p-6 border-t-4 border-accent">
          <h3 className="font-bold text-brand text-lg mb-2">{f.title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
        </article>
      ))}
    </div>
  );
}
