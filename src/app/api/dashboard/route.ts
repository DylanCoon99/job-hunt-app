import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [jobs, applications, profile] = await Promise.all([
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        scores: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        resumeDrafts: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.applicationDraft.findMany({
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: {
        job: true,
        resumeDraft: true
      }
    }),
    prisma.profile.findFirst({
      orderBy: { updatedAt: "desc" },
      include: { skills: true, experiences: true }
    })
  ]);

  const counts = {
    jobsImported: jobs.length,
    readyToReview: applications.filter((application) => application.status === "needs_review").length,
    submitted: applications.filter((application) => application.status === "submitted").length
  };

  return NextResponse.json({ counts, jobs, applications, profile });
}
