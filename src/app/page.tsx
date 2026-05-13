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

        <section className="grid content-start gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Jobs imported" value="0" />
            <Stat label="Ready to review" value="0" />
            <Stat label="Submitted" value="0" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Job Inbox</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    Paste LinkedIn URLs, LinkedIn job-alert emails, or supported board URLs.
                  </p>
                </div>
                <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-moss">
                  Intake ready
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <textarea
                  className="min-h-32 w-full rounded-md border border-ink/15 bg-paper/50 p-3 text-sm outline-none focus:border-steel"
                  placeholder="Paste a job URL or LinkedIn alert email body..."
                />
                <div className="flex flex-wrap gap-3">
                  <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
                    Import URL
                  </button>
                  <button className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold">
                    Import Email
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Application Queue</h2>
              <p className="mt-1 text-sm text-ink/60">
                Drafts pause here until explicitly approved.
              </p>
              <div className="mt-6 rounded-md border border-dashed border-ink/20 p-5 text-sm text-ink/60">
                No application drafts yet.
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-ink/60">{label}</div>
    </div>
  );
}
