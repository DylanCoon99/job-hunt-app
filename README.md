# Job Hunt App Build Plan

## Summary

Build `/Users/Dylan/Documents/job-hunt-app` as a local-first Next.js + PostgreSQL app for personal job hunting.

The app will support two automation levels:

- **LinkedIn:** low-risk intake only via pasted job URLs and LinkedIn job-alert emails. No LinkedIn auto-apply, no continuous browser scraping, no account actions.
- **Other job boards:** assisted application workflow for Greenhouse, Lever, Ashby, Workable, company career pages, and similar boards, with human approval before submission.

The implementation should create a downloadable repo-native plan at:

`/Users/Dylan/Documents/job-hunt-app/README.md`

## Implementation Changes

- Scaffold a Next.js app with TypeScript, App Router, Tailwind, PostgreSQL, Prisma, and a small background worker.
- Use PostgreSQL as the source of truth for profile data, imported jobs, generated resumes, application drafts, and application status.
- Add these core app areas:
  - **Profile:** master resume, skills, work history, preferences, dealbreakers, common answers, truth constraints.
  - **Job Inbox:** manually pasted URLs, LinkedIn email imports, and future board imports.
  - **Job Detail:** parsed description, fit score, requirements, concerns, and apply link.
  - **Resume Tailoring:** tailored resume draft, change explanation, export to Markdown/PDF/DOCX later.
  - **Application Queue:** draft, approve, submit/mark submitted, reject, archive.
- Use LinkedIn v1 intake through:
  - manual job URL paste
  - pasted/imported LinkedIn job-alert email content
  - optional later Gmail connector/email parsing only after the base flow works
- Use other board automation through source-specific adapters:
  - Greenhouse
  - Lever
  - Ashby
  - Workable
  - generic company careers page parser
- Keep every application human-in-the-loop:
  - no submission without explicit approval
  - no fabricated resume content
  - no automatic LinkedIn activity beyond importing user-provided content

## Core Data Model

Create Prisma models for:

- `Profile`
  - name, contact info, location, links, target roles, salary range, remote preference
- `Experience`
  - company, title, dates, bullets, technologies, approved facts
- `Skill`
  - name, category, proficiency, years, approved
- `Job`
  - source, sourceUrl, title, company, location, remoteType, salaryText, description, applyUrl, status, createdAt
- `JobScore`
  - jobId, overallScore, skillScore, seniorityScore, compensationScore, locationScore, explanation, risks
- `ResumeDraft`
  - jobId, profileId, contentMarkdown, tailoringNotes, truthCheckStatus, exportPath, createdAt
- `ApplicationDraft`
  - jobId, resumeDraftId, answersJson, status, approvalRequired, submittedAt
- `SourceImport`
  - source, rawContent, parsedStatus, errorMessage, createdAt

Use these statuses:

`new`, `interesting`, `tailoring`, `needs_review`, `ready_to_apply`, `approved`, `submitted`, `rejected`, `archived`

## API And Workflows

Add local API routes/server actions for:

- `POST /api/jobs/import-url`
  - accepts `{ sourceUrl }`
  - fetches/parses non-LinkedIn pages when possible
  - stores LinkedIn URLs safely without automated login scraping
- `POST /api/jobs/import-email`
  - accepts pasted email body
  - extracts job links, company, title, and description snippets
- `POST /api/jobs/:id/score`
  - scores job against profile and stores `JobScore`
- `POST /api/jobs/:id/tailor-resume`
  - generates a tailored Markdown resume draft using approved profile facts
- `POST /api/applications/:id/approve`
  - marks an application ready for user-reviewed submission
- `POST /api/applications/:id/mark-submitted`
  - records that the user or automation submitted it

Add an LLM service wrapper with:

- job requirement extraction
- fit scoring
- resume tailoring
- truth constraint validation
- concise explanations for why each change was made

Use environment variables:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN` optional for later
- `APP_BASE_URL=http://localhost:3000`

## Build Milestones

1. **Project scaffold**
   - Next.js, TypeScript, Tailwind, Prisma, PostgreSQL config, README plan.
2. **Profile foundation**
   - local forms for profile, skills, experience, preferences, and truth constraints.
3. **Manual job import**
   - paste job URL or email content, store parsed job records.
4. **Job scoring**
   - score jobs against profile and show explanations.
5. **Resume tailoring**
   - generate Markdown resume drafts with truth validation and visible tailoring notes.
6. **Dashboard**
   - job inbox, job detail, resume preview, application queue.
7. **Other-board assisted apply**
   - begin with Greenhouse and Lever adapters.
   - prefill drafts where possible, but pause before submit.
8. **Exports and notifications**
   - PDF/DOCX resume export.
   - Telegram notifications for high-match jobs and ready-to-review drafts.

## Test Plan

- Unit test job parsing for pasted LinkedIn alert emails, Greenhouse URLs, Lever URLs, and generic job pages.
- Unit test scoring with representative strong, weak, remote-only, and compensation-mismatch jobs.
- Unit test resume tailoring to verify:
  - no unapproved facts are introduced
  - required keywords are included only when supported by the profile
  - generated content stays within length limits
- Integration test the full MVP flow:
  - create profile
  - import job
  - score job
  - generate resume draft
  - approve application
  - mark submitted
- Manual acceptance test:
  - paste a LinkedIn job URL and confirm the app does not automate LinkedIn login or submission.
  - import a Greenhouse/Lever job and confirm the app can produce a ready-to-review application draft.

## Assumptions And Defaults

- The app is personal-use only and runs locally.
- The v1 stack is **Next.js + PostgreSQL + Prisma**.
- The downloadable implementation plan will be **Markdown at `README.md`** inside `job-hunt-app`.
- LinkedIn v1 intake is **manual URLs + job-alert emails only**.
- Resume generation starts with Markdown; PDF/DOCX export comes after the tailoring flow is working.
- Telegram is phase two, after the dashboard and resume flow are usable.
- OpenAI is the default LLM provider, accessed through a provider wrapper so it can be swapped later.
