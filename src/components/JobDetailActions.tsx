"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JobDetailActions({
  jobId,
  applicationId
}: {
  jobId: string;
  applicationId?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function runAction(label: string, url: string) {
    setLoading(true);
    setStatus("");

    const response = await fetch(url, { method: "POST" });
    const result = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok) {
      setStatus(result.error ?? `${label} failed.`);
      return;
    }

    setStatus(`${label} complete.`);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={loading}
          onClick={() => runAction("Score", `/api/jobs/${jobId}/score`)}
        >
          Score
        </button>
        <button
          className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={loading}
          onClick={() => runAction("Resume draft", `/api/jobs/${jobId}/tailor-resume`)}
        >
          Tailor Resume
        </button>
        {applicationId ? (
          <>
            <button
              className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={loading}
              onClick={() => runAction("Approval", `/api/applications/${applicationId}/approve`)}
            >
              Approve
            </button>
            <button
              className="rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={loading}
              onClick={() => runAction("Submission", `/api/applications/${applicationId}/mark-submitted`)}
            >
              Mark Submitted
            </button>
          </>
        ) : null}
      </div>
      {status ? <p className="text-sm text-steel">{status}</p> : null}
    </div>
  );
}
