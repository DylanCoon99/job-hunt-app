export type SupportedSource =
  | "linkedin"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "company"
  | "email"
  | "manual";

export type ParsedJob = {
  source: SupportedSource;
  sourceUrl: string;
  title: string;
  company?: string;
  location?: string;
  remoteType?: string;
  salaryText?: string;
  description?: string;
  applyUrl?: string;
};

const jobUrlPattern = /https?:\/\/[^\s"'<>)]*/gi;

export function detectSource(sourceUrl: string): SupportedSource {
  const host = safeHost(sourceUrl);

  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("greenhouse.io") || host.includes("greenhouse.com")) return "greenhouse";
  if (host.includes("lever.co")) return "lever";
  if (host.includes("ashbyhq.com")) return "ashby";
  if (host.includes("workable.com")) return "workable";

  return "company";
}

export async function parseJobUrl(sourceUrl: string): Promise<ParsedJob> {
  const source = detectSource(sourceUrl);

  if (source === "linkedin") {
    return {
      source,
      sourceUrl,
      title: "LinkedIn job",
      description:
        "LinkedIn URL saved for manual review. The app does not log in, scrape LinkedIn, or apply automatically.",
      applyUrl: sourceUrl
    };
  }

  const html = await fetchJobPage(sourceUrl);
  const metadata = extractMetadata(html);

  return {
    source,
    sourceUrl,
    title: metadata.title ?? titleFromUrl(sourceUrl),
    company: metadata.company,
    location: metadata.location,
    remoteType: inferRemoteType(`${metadata.title ?? ""} ${metadata.description ?? ""}`),
    salaryText: extractSalaryText(metadata.description ?? html),
    description: metadata.description ?? extractVisibleText(html)?.slice(0, 6000),
    applyUrl: metadata.applyUrl ?? sourceUrl
  };
}

export function parseLinkedInAlertEmail(rawContent: string): ParsedJob[] {
  const urls = Array.from(rawContent.matchAll(jobUrlPattern))
    .map(([url]) => cleanUrl(url))
    .filter((url, index, all) => all.indexOf(url) === index)
    .filter((url) => detectSource(url) === "linkedin" || looksLikeJobUrl(url));

  if (urls.length === 0) {
    return [];
  }

  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return urls.map((sourceUrl, index) => {
    const nearby = lines.slice(Math.max(0, index - 2), index + 4).join(" ");
    const title = extractTitleCandidate(nearby) ?? "Imported job";

    return {
      source: detectSource(sourceUrl) === "linkedin" ? "linkedin" : "email",
      sourceUrl,
      title,
      company: extractCompanyCandidate(nearby),
      description: nearby || "Imported from pasted job-alert email content.",
      applyUrl: sourceUrl
    };
  });
}

async function fetchJobPage(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "job-hunt-app/0.1 personal-use parser"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`);
  }

  return response.text();
}

function extractMetadata(html: string) {
  const title =
    metaContent(html, "og:title") ??
    metaContent(html, "twitter:title") ??
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description =
    metaContent(html, "description") ??
    metaContent(html, "og:description") ??
    metaContent(html, "twitter:description");

  return {
    title: normalizeText(title),
    company: normalizeText(metaContent(html, "company") ?? metaContent(html, "og:site_name")),
    location: normalizeText(metaContent(html, "job-location") ?? metaContent(html, "location")),
    description: normalizeText(description),
    applyUrl: normalizeText(metaContent(html, "og:url"))
  };
}

function metaContent(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
}

function extractVisibleText(html: string) {
  return normalizeText(
    decodeHtml(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function extractSalaryText(text: string) {
  return text.match(/\$[\d,]+(?:\s?-\s?\$?[\d,]+)?(?:\s?(?:a year|per year|\/year|hourly|\/hr))?/i)?.[0];
}

function inferRemoteType(text: string) {
  if (/hybrid/i.test(text)) return "hybrid";
  if (/remote/i.test(text)) return "remote";
  if (/on[-\s]?site/i.test(text)) return "onsite";
}

function looksLikeJobUrl(url: string) {
  return /job|career|greenhouse|lever|ashby|workable/i.test(url);
}

function extractTitleCandidate(text: string) {
  const cleaned = normalizeText(text);
  return cleaned?.split(/\s(?:at|@)\s/i)[0]?.slice(0, 120);
}

function extractCompanyCandidate(text: string) {
  return normalizeText(text.match(/\s(?:at|@)\s([^.,|]+)/i)?.[1])?.slice(0, 80);
}

function titleFromUrl(sourceUrl: string) {
  const pathname = new URL(sourceUrl).pathname;
  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "Imported job";
  return lastSegment.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanUrl(url: string) {
  return url.replace(/[.,;:]+$/, "");
}

function safeHost(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeText(value?: string) {
  return value?.replace(/\s+/g, " ").trim() || undefined;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
