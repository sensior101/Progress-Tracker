---
version: 1
slug: "server-app-html"
primary_target: "server/app.html"
related_targets: []
---

# Surface: Progress Tracker app (server/app.html), default theme

Mode: Operate. Audience: developers using the progress-tracker skill; job: work through the codebase-derived task list, check the next task, schedule, collect rewards. Scope of this round: visual language of the free default theme only. Layout, behavior, copy, paid themes (retro/blueprint/receipt/chalkboard) and the celebration dialog stay untouched.

## Direction contract

THESIS: Every task is one cell of a Korean manuscript sheet (원고지); finishing a task fills its cell. Refuses the neo-brutalist template (hard offset shadows, acid lime, Courier English kickers, giant KPI numbers).

OWN-WORLD: Near-white paper #fcfcfa, blue-black ink #1d2230, vermilion manuscript ruling #e0573a for structure and the "done" state only, soft ruling #f3c9bd for secondary dividers. One Korean system workhorse stack (Pretendard when installed, otherwise Malgun Gothic; no web font is shipped under the CSP) with tabular numerals; rank by 700 against 400 weight, not size; no display numbers. 1px rules and whitespace only: no shadows, no grid textures, square corners.

STORY: The developer sees at once how many cells are filled, what is next, and checks it.

FIRST VIEWPORT: Double vermilion rule under the top bar; project title; overview row where the progress is a strip of square cells (one per task, grouped by phase) beside "N개 중 M개 완료" and the next task; phase board below, each phase heading carrying its own cell strip.

FORM: 원고지 (manuscript sheet), position 6 of 7 on the grounded list. seed:246c3c01335a31ad. Raises: weight-not-size hierarchy (timetable), hairline-only structure (design annual plate), grid as real armature with shared cell token for tasks and calendar days (Crouwel).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
