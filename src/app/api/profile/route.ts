import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  targetRoles: z.string().optional(),
  remotePreference: z.string().optional(),
  salaryMin: z.coerce.number().int().positive().optional().or(z.literal("")),
  salaryMax: z.coerce.number().int().positive().optional().or(z.literal("")),
  skills: z.string().optional(),
  truthConstraints: z.string().optional()
});

export async function GET() {
  const profile = await prisma.profile.findFirst({
    orderBy: { updatedAt: "desc" },
    include: {
      skills: true,
      experiences: true
    }
  });

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const body = profileSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const targetRoles = splitLinesOrCommas(body.data.targetRoles);
  const skillNames = splitLinesOrCommas(body.data.skills);
  const truthConstraints = splitLinesOrCommas(body.data.truthConstraints);

  const existing = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  const baseProfileData = {
    name: body.data.name,
    email: emptyToNull(body.data.email),
    phone: emptyToNull(body.data.phone),
    location: emptyToNull(body.data.location),
    targetRoles,
    remotePreference: emptyToNull(body.data.remotePreference),
    salaryMin: numberOrNull(body.data.salaryMin),
    salaryMax: numberOrNull(body.data.salaryMax),
    truthConstraints
  };

  const profile = existing
    ? await prisma.profile.update({
        where: { id: existing.id },
        data: {
          ...baseProfileData,
          skills: {
            deleteMany: {},
            create: skillNames.map((name) => ({
              name,
              approved: true
            }))
          }
        },
        include: { skills: true, experiences: true }
      })
    : await prisma.profile.create({
        data: {
          ...baseProfileData,
          dealbreakers: [],
          skills: {
            create: skillNames.map((name) => ({
              name,
              approved: true
            }))
          }
        },
        include: { skills: true, experiences: true }
      });

  return NextResponse.json({ profile });
}

function splitLinesOrCommas(value?: string) {
  return (
    value
      ?.split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function emptyToNull(value?: string) {
  return value?.trim() || null;
}

function numberOrNull(value?: number | "") {
  return typeof value === "number" ? value : null;
}
