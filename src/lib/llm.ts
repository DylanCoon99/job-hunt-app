import OpenAI from "openai";
import type { Experience, Job, Profile, Skill } from "@prisma/client";
import { scoreJobHeuristically } from "./scoring";

type ProfileContext = Profile & {
  skills: Skill[];
  experiences: Experience[];
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : undefined;

export async function scoreJob(job: Job, profile: ProfileContext) {
  if (!openai) {
    return scoreJobHeuristically(job, profile);
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Score a job against a candidate profile. Return JSON with overallScore, skillScore, seniorityScore, compensationScore, locationScore, explanation, and risks array. Scores are 0-100."
      },
      {
        role: "user",
        content: JSON.stringify({ job, profile: publicProfile(profile) })
      }
    ]
  });

  const parsed = JSON.parse(completion.choices[0]?.message.content ?? "{}");

  return {
    overallScore: clampScore(parsed.overallScore),
    skillScore: clampScore(parsed.skillScore),
    seniorityScore: clampScore(parsed.seniorityScore),
    compensationScore: clampScore(parsed.compensationScore),
    locationScore: clampScore(parsed.locationScore),
    explanation: String(parsed.explanation ?? "Scored against approved profile facts."),
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : []
  };
}

export async function tailorResume(job: Job, profile: ProfileContext) {
  if (!openai) {
    return tailorResumeHeuristically(job, profile);
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Create a truthful Markdown resume draft using only approved facts from the profile. Return JSON with contentMarkdown, tailoringNotes array, and truthCheckStatus."
      },
      {
        role: "user",
        content: JSON.stringify({ job, profile: publicProfile(profile) })
      }
    ]
  });

  const parsed = JSON.parse(completion.choices[0]?.message.content ?? "{}");

  return {
    contentMarkdown: String(parsed.contentMarkdown ?? ""),
    tailoringNotes: Array.isArray(parsed.tailoringNotes) ? parsed.tailoringNotes.map(String) : [],
    truthCheckStatus: parsed.truthCheckStatus === "passed" ? "passed" : "needs_review"
  } as const;
}

function tailorResumeHeuristically(job: Job, profile: ProfileContext) {
  const approvedSkills = profile.skills.filter((skill) => skill.approved).map((skill) => skill.name);
  const experienceSections = profile.experiences
    .map((experience) => {
      const bullets = [...experience.approvedFacts, ...experience.bullets]
        .filter(Boolean)
        .slice(0, 5)
        .map((bullet) => `- ${bullet}`)
        .join("\n");

      return `### ${experience.title}, ${experience.company}\n${bullets}`;
    })
    .join("\n\n");

  return {
    contentMarkdown: `# ${profile.name}\n\n${profile.location ?? ""}\n\n## Target Role\n${job.title}${job.company ? ` at ${job.company}` : ""}\n\n## Skills\n${approvedSkills.join(", ") || "Add approved skills in the profile first."}\n\n## Experience\n${experienceSections || "Add approved experience facts in the profile first."}`,
    tailoringNotes: [
      "Generated from approved profile facts only.",
      "Highlighted skills that are already marked approved.",
      "Kept the draft in Markdown for manual review before export."
    ],
    truthCheckStatus: "needs_review"
  } as const;
}

function publicProfile(profile: ProfileContext) {
  return {
    ...profile,
    skills: profile.skills.filter((skill) => skill.approved),
    experiences: profile.experiences.map((experience) => ({
      ...experience,
      bullets: experience.bullets,
      approvedFacts: experience.approvedFacts
    }))
  };
}

function clampScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
