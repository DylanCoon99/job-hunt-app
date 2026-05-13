import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const applicationDraft = await prisma.applicationDraft.update({
    where: { id },
    data: { status: "approved" },
    include: { job: true }
  });

  await prisma.job.update({
    where: { id: applicationDraft.jobId },
    data: { status: "approved" }
  });

  return NextResponse.json({ applicationDraft });
}
