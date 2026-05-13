import type { Job, Profile, Skill } from "@prisma/client";

type ProfileWithSkills = Profile & {
  skills: Skill[];
};

export function scoreJobHeuristically(job: Job, profile: ProfileWithSkills) {
  const haystack = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const approvedSkills = profile.skills.filter((skill) => skill.approved);
  const matchedSkills = approvedSkills.filter((skill) => haystack.includes(skill.name.toLowerCase()));

  const skillScore =
    approvedSkills.length === 0 ? 50 : Math.round((matchedSkills.length / approvedSkills.length) * 100);
  const locationScore = scoreLocation(job, profile);
  const compensationScore = scoreCompensation(job, profile);
  const seniorityScore = scoreSeniority(job.title, profile.targetRoles);
  const overallScore = Math.round(
    skillScore * 0.45 + seniorityScore * 0.2 + compensationScore * 0.2 + locationScore * 0.15
  );

  const risks = [
    matchedSkills.length === 0 ? "No approved profile skills were found in the job text." : undefined,
    locationScore < 60 ? "Location or remote expectations may not match preferences." : undefined,
    compensationScore < 60 ? "Compensation is missing or may not meet the target range." : undefined
  ].filter(Boolean) as string[];

  return {
    overallScore,
    skillScore,
    seniorityScore,
    compensationScore,
    locationScore,
    explanation: `Matched ${matchedSkills.length} approved skills. ${job.remoteType ? `Remote type: ${job.remoteType}.` : "Remote type unknown."}`,
    risks
  };
}

function scoreLocation(job: Job, profile: ProfileWithSkills) {
  if (profile.remotePreference?.toLowerCase().includes("remote")) {
    return job.remoteType === "remote" ? 100 : job.remoteType === "hybrid" ? 65 : 45;
  }

  if (!profile.location || !job.location) return 70;

  return job.location.toLowerCase().includes(profile.location.toLowerCase()) ? 100 : 60;
}

function scoreCompensation(job: Job, profile: ProfileWithSkills) {
  if (!profile.salaryMin || !job.salaryText) return 70;

  const amounts = Array.from(job.salaryText.matchAll(/\$?([\d,]+)/g)).map((match) =>
    Number(match[1].replace(/,/g, ""))
  );
  const highest = Math.max(...amounts);

  if (!Number.isFinite(highest)) return 70;
  return highest >= profile.salaryMin ? 100 : 45;
}

function scoreSeniority(title: string, targetRoles: string[]) {
  if (targetRoles.length === 0) return 70;
  const normalizedTitle = title.toLowerCase();
  return targetRoles.some((role) => normalizedTitle.includes(role.toLowerCase())) ? 100 : 65;
}
