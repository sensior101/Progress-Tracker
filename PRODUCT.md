# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers who installed the public `progress-tracker` Claude Code skill. They work inside a code project, ask the skill to analyze the codebase, get `docs/progress.json`, and import it into the shared site to follow and check off the work while they build.

## Product Purpose

Turn an AI analysis of a real codebase into a phase-by-phase task list the developer can actually work through: check tasks, read each task's details (purpose, steps, completion criteria), schedule tasks on a calendar, and see what is next. Success is the developer finishing the project's tasks and coming back to re-import as the code changes.

## Positioning

The task list is not typed by the user. It is derived by the skill from the project's own code, docs and tests, with stable task IDs so re-importing updates definitions while keeping check state, dates and rewards. No generic to-do app starts from the codebase.

## Operating Context

- Skill run in a terminal/agent, then JSON import on the site (GitHub login, Cloudflare Pages + D1).
- Used beside the code editor, across PCs with the same account.
- Korean UI and copy.

## Capabilities and Constraints

- Phases with tasks (`text`, `note`, `details`, `done`, `date`), filters, next task, task detail dialog.
- Calendar date registration; completion auto-dates in KST.
- 10P on first completion of each task, no duplicate rewards.
- Shop: site themes (free default + paid), trophy designs, showcase themes, sticker packs; completion trophies and celebration.
- The site does not verify that code was really implemented; it is a personal checklist.
- Single-file UI in `server/app.html`, built to `server/public/index.html`.

## Brand Commitments

- Name: Progress Tracker.
- Paid site themes (retro desktop, blueprint lab, color themes) and the completion celebration are existing purchased/loved assets and must be preserved as they are.

## Evidence on Hand

- Real sample project JSON: `server/.wrangler/project-before-details.json` (Desk Pet 백엔드).
- No testimonials, user counts or metrics exist; do not invent them.

## Product Principles

1. The codebase-derived task list is the hero; everything else serves getting the next task done.
2. Re-import must feel safe: state, dates and rewards survive.
3. Rewards are a side pleasure, never in the way of the work.
4. Write like a calm, precise Korean colleague.
