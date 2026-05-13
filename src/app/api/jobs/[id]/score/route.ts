import { NextResponse } from "next/server";
import { scoreJob } from "@/lib/llm";
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
    return NextResponse.json({ error: "Create a profile before scoring jobs." }, { status: 409 });
  }

  const score = await scoreJob(job, profile);
  const jobScore = await prisma.jobScore.create({
    data: {
      jobId: job.id,
      ...score
    }
  });

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: score.overallScore >= 75 ? "interesting" : "needs_review"
    }
  });

  return NextResponse.json({ jobScore });
}
