import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.string().optional(),
  targetRoles: z.string().optional(),
  remotePreference: z.string().optional(),
  salaryMin: z.coerce.number().int().positive().optional().or(z.literal("")),
  salaryMax: z.coerce.number().int().positive().optional().or(z.literal("")),
  preferences: z.string().optional(),
  dealbreakers: z.string().optional(),
  commonAnswers: z.string().optional(),
  skills: z.string().optional(),
  experiences: z.string().optional(),
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
  const skills = parseSkills(body.data.skills);
  const experiences = parseExperiences(body.data.experiences);
  const dealbreakers = splitLinesOrCommas(body.data.dealbreakers);
  const truthConstraints = splitLinesOrCommas(body.data.truthConstraints);

  const existing = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  const baseProfileData = {
    name: body.data.name,
    email: emptyToNull(body.data.email),
    phone: emptyToNull(body.data.phone),
    location: emptyToNull(body.data.location),
    links: parseKeyValueJson(body.data.links),
    targetRoles,
    remotePreference: emptyToNull(body.data.remotePreference),
    salaryMin: numberOrNull(body.data.salaryMin),
    salaryMax: numberOrNull(body.data.salaryMax),
    preferences: parseKeyValueJson(body.data.preferences),
    dealbreakers,
    commonAnswers: parseKeyValueJson(body.data.commonAnswers),
    truthConstraints
  };

  const profile = existing
    ? await prisma.profile.update({
        where: { id: existing.id },
        data: {
          ...baseProfileData,
          experiences: {
            deleteMany: {},
            create: experiences
          },
          skills: {
            deleteMany: {},
            create: skills
          }
        },
        include: { skills: true, experiences: true }
      })
    : await prisma.profile.create({
        data: {
          ...baseProfileData,
          experiences: {
            create: experiences
          },
          skills: {
            create: skills
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

function parseSkills(value?: string) {
  return splitLinesOrCommas(value).map((item) => {
    const [name, category, proficiency, years] = item.split("|").map((part) => part.trim());

    return {
      name,
      category: category || null,
      proficiency: proficiency || null,
      years: years ? Number(years) : null,
      approved: true
    };
  });
}

function parseExperiences(value?: string) {
  return (
    value
      ?.split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const [title = "Role", company = "Company", dates = ""] = (lines.shift() ?? "").split("|").map((part) => part.trim());
        const [startDate, endDate] = dates.split("-").map((part) => parseDate(part));
        const bullets = lines.filter((line) => !line.toLowerCase().startsWith("facts:"));
        const approvedFacts = lines
          .filter((line) => line.toLowerCase().startsWith("facts:"))
          .flatMap((line) => splitLinesOrCommas(line.replace(/^facts:/i, "")));

        return {
          title,
          company,
          startDate,
          endDate,
          bullets,
          approvedFacts: approvedFacts.length > 0 ? approvedFacts : bullets,
          technologies: []
        };
      }) ?? []
  );
}

function parseDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || /present|current/i.test(trimmed)) return null;

  const parsed = new Date(trimmed.length === 4 ? `${trimmed}-01-01` : trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseKeyValueJson(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as Record<string, string>;
    } catch {
      return { notes: trimmed };
    }
  }

  return Object.fromEntries(
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...rest] = line.split(":");
        return [key.trim(), rest.join(":").trim()];
      })
      .filter(([key, value]) => key && value)
  );
}
