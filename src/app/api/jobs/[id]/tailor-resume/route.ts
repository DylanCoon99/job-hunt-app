import { NextResponse } from "next/server";
import { tailorResume } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const [job, profile] = await Promise.all([
    prisma.job.findUnique({ where: { id } }),
    prisma.profile.findFirst({
      orderBy: { updatedAt: "desc" },
      include: { skills: true, experiences: true }
    })
  ]);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Create a profile before tailoring resumes." }, { status: 409 });
  }

  const draft = await tailorResume(job, profile);
  const resumeDraft = await prisma.resumeDraft.create({
    data: {
      jobId: job.id,
      profileId: profile.id,
      ...draft
    }
  });

  const applicationDraft = await prisma.applicationDraft.create({
    data: {
      jobId: job.id,
      resumeDraftId: resumeDraft.id,
      status: "needs_review",
      approvalRequired: true
    }
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "tailoring" }
  });

  return NextResponse.json({ resumeDraft, applicationDraft });
}
