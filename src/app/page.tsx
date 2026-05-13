import { DashboardClient } from "@/components/DashboardClient";

const milestones = [
  "Profile foundation",
  "Manual job import",
  "Job scoring",
  "Resume tailoring",
  "Application queue",
  "Board adapters"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[340px_1fr]">
        <aside className="border-r border-ink/10 pr-0 lg:pr-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">Local-first</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">Job Hunt App</h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-ink/70">
            A private dashboard for importing jobs, scoring fit, tailoring truthful resume drafts,
            and keeping every application human-approved.
          </p>
          <div className="mt-8 grid gap-2">
            {milestones.map((milestone) => (
              <div key={milestone} className="flex items-center gap-3 text-sm text-ink/75">
                <span className="h-2.5 w-2.5 rounded-full bg-clay" />
                {milestone}
              </div>
            ))}
          </div>
        </aside>

        <DashboardClient />
      </section>
    </main>
  );
}
