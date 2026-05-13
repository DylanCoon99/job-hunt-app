import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const applicationDraft = await prisma.applicationDraft.update({
    where: { id },
    data: {
      status: "submitted",
      submittedAt: new Date()
    }
  });

  await prisma.job.update({
    where: { id: applicationDraft.jobId },
    data: { status: "submitted" }
  });

  return NextResponse.json({ applicationDraft });
}
