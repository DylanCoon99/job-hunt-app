import Link from "next/link";
import { notFound } from "next/navigation";
import { JobDetailActions } from "@/components/JobDetailActions";
import { prisma } from "@/lib/prisma";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      scores: {
        orderBy: { createdAt: "desc" }
      },
      resumeDrafts: {
        orderBy: { createdAt: "desc" }
      },
      applicationDrafts: {
        orderBy: { updatedAt: "desc" },
        include: {
          resumeDraft: true
        }
      }
    }
  });

  if (!job) {
    notFound();
  }

  const latestScore = job.scores[0];
  const latestResumeDraft = job.resumeDrafts[0];
  const latestApplication = job.applicationDrafts[0];

  return (
    <main className="min-h-screen bg-paper px-6 py-8 text-ink">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link className="text-sm font-semibold text-steel" href="/">
            Back to dashboard
          </Link>
          <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold uppercase text-moss">
            {job.status}
          </span>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase text-moss">{job.source}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">{job.title}</h1>
            <p className="mt-3 text-sm text-ink/60">
              {[job.company, job.location, job.remoteType, job.salaryText].filter(Boolean).join(" · ") ||
                "Details pending"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold"
                href={job.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                Source
              </a>
              {job.applyUrl ? (
                <a
                  className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
                  href={job.applyUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Apply Link
                </a>
              ) : null}
            </div>

            <section className="mt-8">
              <h2 className="text-lg font-semibold">Description</h2>
              <div className="mt-3 whitespace-pre-wrap rounded-md border border-ink/10 bg-paper/60 p-4 text-sm leading-6 text-ink/75">
                {job.description || "No description parsed yet."}
              </div>
            </section>
          </article>

          <aside className="grid content-start gap-6">
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Workflow</h2>
              <p className="mt-1 text-sm text-ink/60">
                Actions update saved records, but submission still stays manual and explicit.
              </p>
              <div className="mt-4">
                <JobDetailActions jobId={job.id} applicationId={latestApplication?.id} />
              </div>
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Fit Score</h2>
              {latestScore ? (
                <div className="mt-4 grid gap-3">
                  <div className="text-4xl font-semibold">{latestScore.overallScore}</div>
                  <ScoreBar label="Skills" value={latestScore.skillScore} />
                  <ScoreBar label="Seniority" value={latestScore.seniorityScore} />
                  <ScoreBar label="Compensation" value={latestScore.compensationScore} />
                  <ScoreBar label="Location" value={latestScore.locationScore} />
                  <p className="text-sm leading-6 text-ink/70">{latestScore.explanation}</p>
                  {latestScore.risks.length > 0 ? (
                    <div className="grid gap-2">
                      {latestScore.risks.map((risk) => (
                        <p key={risk} className="rounded-md bg-clay/10 p-2 text-xs text-clay">
                          {risk}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink/60">No score yet.</p>
              )}
            </section>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className="rounded-lg border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Resume Draft</h2>
            {latestResumeDraft ? (
              <div className="mt-4 grid gap-4">
                <div className="rounded-md bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">
                  Truth check: {latestResumeDraft.truthCheckStatus}
                </div>
                <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-md border border-ink/10 bg-paper/60 p-4 text-sm leading-6">
                  {latestResumeDraft.contentMarkdown}
                </pre>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-ink/20 p-5 text-sm text-ink/60">
                No resume draft yet.
              </div>
            )}
          </article>

          <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Tailoring Notes</h2>
            {latestResumeDraft?.tailoringNotes.length ? (
              <div className="mt-4 grid gap-2">
                {latestResumeDraft.tailoringNotes.map((note) => (
                  <p key={note} className="rounded-md border border-ink/10 p-3 text-sm text-ink/70">
                    {note}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink/60">No tailoring notes yet.</p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs font-semibold uppercase text-ink/60">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-ink/10">
        <div className="h-2 rounded-full bg-clay" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
