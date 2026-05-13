import { NextResponse } from "next/server";
import { z } from "zod";
import { parseLinkedInAlertEmail } from "@/lib/job-import";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  rawContent: z.string().min(10)
});

export async function POST(request: Request) {
  const body = requestSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const parsedJobs = parseLinkedInAlertEmail(body.data.rawContent);

  const sourceImport = await prisma.sourceImport.create({
    data: {
      source: "email",
      rawContent: body.data.rawContent,
      parsedStatus: parsedJobs.length > 0 ? "parsed" : "failed",
      errorMessage: parsedJobs.length > 0 ? undefined : "No job links found in pasted email content."
    }
  });

  const jobs = await Promise.all(
    parsedJobs.map((parsedJob) =>
      prisma.job.upsert({
        where: { sourceUrl: parsedJob.sourceUrl },
        update: parsedJob,
        create: parsedJob
      })
    )
  );

  return NextResponse.json({ sourceImport, jobs });
}
