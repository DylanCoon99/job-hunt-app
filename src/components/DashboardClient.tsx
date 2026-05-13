"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  counts: {
    jobsImported: number;
    readyToReview: number;
    submitted: number;
  };
  jobs: Array<{
    id: string;
    title: string;
    company: string | null;
    source: string;
    sourceUrl: string;
    status: string;
    scores: Array<{ overallScore: number; explanation: string }>;
  }>;
  applications: Array<{
    id: string;
    status: string;
    job: { title: string; company: string | null };
  }>;
  profile: {
    name: string;
    targetRoles: string[];
    remotePreference: string | null;
    skills: Array<{ name: string }>;
  } | null;
};

const emptyDashboard: DashboardData = {
  counts: { jobsImported: 0, readyToReview: 0, submitted: 0 },
  jobs: [],
  applications: [],
  profile: null
};

export function DashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [jobInput, setJobInput] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshDashboard() {
    const response = await fetch("/api/dashboard");
    if (response.ok) {
      setDashboard(await response.json());
    }
  }

  useEffect(() => {
    refreshDashboard().catch(() => undefined);
  }, []);

  const firstLine = useMemo(() => jobInput.trim().split(/\r?\n/)[0] ?? "", [jobInput]);
  const isUrl = /^https?:\/\//i.test(firstLine);

  async function importJob(mode: "url" | "email") {
    setLoading(true);
    setJobStatus("");

    const response = await fetch(mode === "url" ? "/api/jobs/import-url" : "/api/jobs/import-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "url" ? { sourceUrl: firstLine } : { rawContent: jobInput })
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setJobStatus(result.error ?? "Import failed.");
      return;
    }

    setJobInput("");
    setJobStatus(mode === "url" ? "Imported job URL." : `Imported ${result.jobs?.length ?? 0} jobs.`);
    await refreshDashboard();
  }

  async function saveProfile(formData: FormData) {
    setLoading(true);
    setProfileStatus("");

    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    setLoading(false);
    setProfileStatus(response.ok ? "Profile saved." : "Profile save failed.");

    if (response.ok) {
      await refreshDashboard();
    }
  }

  async function runJobAction(jobId: string, action: "score" | "tailor-resume") {
    setLoading(true);
    setJobStatus("");

    const response = await fetch(`/api/jobs/${jobId}/${action}`, {
      method: "POST"
    });
    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      setJobStatus(result.error ?? "Job action failed.");
      return;
    }

    setJobStatus(action === "score" ? "Job scored." : "Resume draft created.");
    await refreshDashboard();
  }

  async function runApplicationAction(applicationId: string, action: "approve" | "mark-submitted") {
    setLoading(true);

    const response = await fetch(`/api/applications/${applicationId}/${action}`, {
      method: "POST"
    });

    setLoading(false);
    setJobStatus(response.ok ? "Application updated." : "Application update failed.");

    if (response.ok) {
      await refreshDashboard();
    }
  }

  return (
    <section className="grid content-start gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Jobs imported" value={String(dashboard.counts.jobsImported)} />
        <Stat label="Ready to review" value={String(dashboard.counts.readyToReview)} />
        <Stat label="Submitted" value={String(dashboard.counts.submitted)} />
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
              Human reviewed
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            <textarea
              className="min-h-32 w-full rounded-md border border-ink/15 bg-paper/50 p-3 text-sm outline-none focus:border-steel"
              placeholder="Paste a job URL or LinkedIn alert email body..."
              value={jobInput}
              onChange={(event) => setJobInput(event.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={loading || !isUrl}
                onClick={() => importJob("url")}
              >
                Import URL
              </button>
              <button
                className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={loading || jobInput.trim().length < 10}
                onClick={() => importJob("email")}
              >
                Import Email
              </button>
            </div>
            {jobStatus ? <p className="text-sm text-steel">{jobStatus}</p> : null}
          </div>

          <div className="mt-6 grid gap-3">
            {dashboard.jobs.length === 0 ? (
              <div className="rounded-md border border-dashed border-ink/20 p-5 text-sm text-ink/60">
                No jobs imported yet.
              </div>
            ) : (
              dashboard.jobs.map((job) => (
                <article key={job.id} className="rounded-md border border-ink/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="mt-1 text-sm text-ink/60">
                        {[job.company, job.source, job.status].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {job.scores[0] ? (
                      <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-semibold text-clay">
                        {job.scores[0].overallScore}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      disabled={loading}
                      onClick={() => runJobAction(job.id, "score")}
                    >
                      Score
                    </button>
                    <button
                      className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      disabled={loading}
                      onClick={() => runJobAction(job.id, "tailor-resume")}
                    >
                      Tailor Resume
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="grid gap-6">
          <ProfilePanel profile={dashboard.profile} status={profileStatus} onSave={saveProfile} loading={loading} />
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Application Queue</h2>
            <p className="mt-1 text-sm text-ink/60">Drafts pause here until explicitly approved.</p>
            <div className="mt-5 grid gap-3">
              {dashboard.applications.length === 0 ? (
                <div className="rounded-md border border-dashed border-ink/20 p-5 text-sm text-ink/60">
                  No application drafts yet.
                </div>
              ) : (
                dashboard.applications.map((application) => (
                  <div key={application.id} className="rounded-md border border-ink/10 p-3">
                    <div className="text-sm font-semibold">{application.job.title}</div>
                    <div className="mt-1 text-xs text-ink/60">{application.status}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                        disabled={loading || application.status === "approved"}
                        onClick={() => runApplicationAction(application.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                        disabled={loading || application.status === "submitted"}
                        onClick={() => runApplicationAction(application.id, "mark-submitted")}
                      >
                        Mark Submitted
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function ProfilePanel({
  profile,
  status,
  loading,
  onSave
}: {
  profile: DashboardData["profile"];
  status: string;
  loading: boolean;
  onSave: (formData: FormData) => void;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Profile</h2>
      <form action={onSave} className="mt-4 grid gap-3">
        <input name="name" className="rounded-md border border-ink/15 px-3 py-2 text-sm" placeholder="Name" defaultValue={profile?.name ?? ""} />
        <input name="email" className="rounded-md border border-ink/15 px-3 py-2 text-sm" placeholder="Email" />
        <input name="location" className="rounded-md border border-ink/15 px-3 py-2 text-sm" placeholder="Location" />
        <input
          name="targetRoles"
          className="rounded-md border border-ink/15 px-3 py-2 text-sm"
          placeholder="Target roles"
          defaultValue={profile?.targetRoles.join(", ") ?? ""}
        />
        <input
          name="remotePreference"
          className="rounded-md border border-ink/15 px-3 py-2 text-sm"
          placeholder="Remote preference"
          defaultValue={profile?.remotePreference ?? ""}
        />
        <textarea
          name="skills"
          className="min-h-20 rounded-md border border-ink/15 px-3 py-2 text-sm"
          placeholder="Approved skills, comma or line separated"
          defaultValue={profile?.skills.map((skill) => skill.name).join(", ") ?? ""}
        />
        <textarea
          name="truthConstraints"
          className="min-h-20 rounded-md border border-ink/15 px-3 py-2 text-sm"
          placeholder="Truth constraints"
        />
        <button className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={loading}>
          Save Profile
        </button>
        {status ? <p className="text-sm text-steel">{status}</p> : null}
      </form>
    </section>
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
