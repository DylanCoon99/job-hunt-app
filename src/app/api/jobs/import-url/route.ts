import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJobUrl } from "@/lib/job-import";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  sourceUrl: z.string().url()
});

export async function POST(request: Request) {
  const body = requestSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const { sourceUrl } = body.data;

  try {
    const parsedJob = await parseJobUrl(sourceUrl);

    const job = await prisma.job.upsert({
      where: { sourceUrl },
      update: parsedJob,
      create: parsedJob
    });

    await prisma.sourceImport.create({
      data: {
        source: parsedJob.source,
        rawContent: sourceUrl,
        parsedStatus: "parsed"
      }
    });

    return NextResponse.json({ job });
  } catch (error) {
    await prisma.sourceImport.create({
      data: {
        source: "manual",
        rawContent: sourceUrl,
        parsedStatus: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown import error"
      }
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown import error" },
      { status: 502 }
    );
  }
}
