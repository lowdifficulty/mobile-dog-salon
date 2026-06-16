import Link from "next/link";

interface Job {
  id: string;
  title: string;
  type: string;
  count: number;
  pay: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
}

export default function JobListings({ jobs }: { jobs: Job[] }) {
  return (
    <div className="space-y-8">
      {jobs.map((job) => (
        <article key={job.id} className="site-card p-6 md:p-8 border-t-4 border-accent">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-3 py-1 bg-accent-light text-accent text-xs font-bold rounded-full uppercase">
              {job.type}
            </span>
            <span className="px-3 py-1 bg-brand-light text-brand text-xs font-bold rounded-full">
              {job.count} opening{job.count > 1 ? "s" : ""}
            </span>
            <span className="px-3 py-1 bg-section-gray text-brand text-xs font-bold rounded-full">
              {job.pay}
            </span>
          </div>
          <h3 className="font-bold text-brand text-2xl mb-3">{job.title}</h3>
          <p className="text-gray-600 leading-relaxed mb-6">{job.summary}</p>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-bold text-brand mb-3 text-sm uppercase tracking-wide">Responsibilities</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {job.responsibilities.map((r) => (
                  <li key={r} className="flex gap-2"><span className="text-accent">•</span>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-brand mb-3 text-sm uppercase tracking-wide">Requirements</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {job.requirements.map((r) => (
                  <li key={r} className="flex gap-2"><span className="text-accent">•</span>{r}</li>
                ))}
              </ul>
            </div>
          </div>
          <Link
            href={`mailto:careers@mobiledog-salon.com?subject=Application: ${encodeURIComponent(job.title)}`}
            className="site-btn inline-flex text-sm"
          >
            Apply for This Role
          </Link>
        </article>
      ))}
    </div>
  );
}
