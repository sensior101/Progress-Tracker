---
name: Progress Tracker
description: "Free default theme 원고지 (manuscript sheet): every task is one ruled cell, and a finished task fills its cell."
colors:
  manuscript-paper: "#fcfcfa"
  blue-black-ink: "#1d2230"
  graphite-muted: "#5f6470"
  pencil-line: "#e6e2dd"
  vermilion-rule: "#e0573a"
  soft-ruling: "#f1cbbf"
  vermilion-wash: "#fbefea"
  vermilion-text: "#b23d1d"
  night-desk: "#17181d"
  night-paper: "#1d1f25"
  night-ink: "#ecebe7"
  night-muted: "#a9abb3"
  night-line: "#33353d"
  night-rule: "#ef6f50"
  night-soft-ruling: "#5a3a31"
  night-wash: "#2e221f"
  night-vermilion-text: "#f39a82"
typography:
  headline:
    fontFamily: "Pretendard, Malgun Gothic, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.3vw, 62px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Pretendard, Malgun Gothic, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Pretendard, Malgun Gothic, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  task:
    fontFamily: "Pretendard, Malgun Gothic, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.65
  label:
    fontFamily: "Pretendard, Malgun Gothic, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.6
  caption:
    fontFamily: "Pretendard, Malgun Gothic, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: "0px"
spacing:
  cell-group: "8px"
  cell-row: "6px"
  phase-x: "20px"
  board-gap: "22px"
  overview-gutter: "26px"
  overview-after: "34px"
  page-x: "48px"
  page-x-tablet: "24px"
  page-x-phone: "20px"
components:
  manuscript-cell:
    backgroundColor: "transparent"
    size: "22px"
    rounded: "{rounded.none}"
  manuscript-cell-phase:
    size: "14px"
    rounded: "{rounded.none}"
  manuscript-cell-filled:
    backgroundColor: "{colors.vermilion-rule}"
    textColor: "{colors.manuscript-paper}"
    size: "22px"
  button-outline:
    backgroundColor: "{colors.manuscript-paper}"
    textColor: "{colors.blue-black-ink}"
    rounded: "{rounded.none}"
  button-outline-hover:
    backgroundColor: "{colors.vermilion-wash}"
    textColor: "{colors.blue-black-ink}"
  button-solid:
    backgroundColor: "{colors.blue-black-ink}"
    textColor: "{colors.manuscript-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "7px 12px"
  filter-active:
    backgroundColor: "{colors.blue-black-ink}"
    textColor: "{colors.manuscript-paper}"
    typography: "{typography.label}"
    padding: "7px 15px"
  phase-card:
    backgroundColor: "{colors.manuscript-paper}"
    textColor: "{colors.blue-black-ink}"
    rounded: "{rounded.none}"
    padding: "18px 20px 16px"
  phase-heading-hover:
    backgroundColor: "{colors.vermilion-wash}"
    textColor: "{colors.blue-black-ink}"
  task-checkbox-checked:
    backgroundColor: "{colors.vermilion-rule}"
    textColor: "{colors.manuscript-paper}"
    size: "20px"
  date-chip-scheduled:
    backgroundColor: "{colors.vermilion-wash}"
    textColor: "{colors.vermilion-text}"
    typography: "{typography.caption}"
    padding: "2px 7px"
  calendar-day-selected:
    backgroundColor: "{colors.vermilion-wash}"
    textColor: "{colors.blue-black-ink}"
---

# Design System: Progress Tracker

## Overview

**Creative North Star: "The Manuscript Sheet (원고지)"**

The free default theme treats the project as a Korean manuscript sheet. Each task is one ruled square; finishing the task fills its square in vermilion. Progress is read by counting filled cells, not by a percentage or a large number. Cells are grouped by phase, so the strip of squares in the overview and the smaller strip under each phase heading show the same thing at two scales.

The page is quiet, near-white paper with blue-black ink. Vermilion is the ruling colour of the sheet. It draws structure (the double rule under the top bar, section rules, cell borders) and the done state, and nothing else. Hierarchy comes from weight (700 against 400) and position, not from size. Structure is made of 1px rules and whitespace. There are no shadows, no background textures and no rounded corners.

The theme lives under the appearance key `lime`, a legacy slug kept for stored user preferences. The paid themes (retro desktop, blueprint, receipt, chalkboard) and the completion celebration dialog are separately owned skins. This system does not cover them, and they stay unchanged.

**Key Characteristics:**
- One task = one square cell; a finished task's cell is filled vermilion with a paper-coloured check.
- Vermilion is reserved for ruling and completion.
- Weight-led hierarchy on a single Korean system sans; no display numbers.
- Hairline rules, a double rule as the sheet's header line, square corners everywhere.
- A full dark counterpart: same roles, re-tuned values.

## Colors

The palette is paper, ink and one vermilion ruling colour, used at three intensities.

### Primary
- **Vermilion Rule** (vermilion-rule): the manuscript ruling. It is used for the double rule under the top bar, overview top and bottom rules, phase-heading underline, calendar frame and weekday rule, footer rule, cell borders, filled cells, checked checkboxes, and the date-picker accent. Dark mode uses night-rule.
- **Vermilion Text** (vermilion-text): the legible text form of the rule colour. It is used only for text on the wash, such as a scheduled task's date chip and calendar day counts.

### Secondary
- **Soft Ruling** (soft-ruling): secondary dividers. It draws phase card borders, overview column dividers, the calendar's internal day grid, shop and trophy card borders, the cloud panel border, text selection and the scrollbar thumb.
- **Vermilion Wash** (vermilion-wash): the single hover and selection tint. It is used on button hover, phase-heading hover and focus-within, the selected calendar day, and scheduled date chips.

### Neutral
- **Manuscript Paper** (manuscript-paper): page and surface are the same paper. Cards are not lifted off the page.
- **Blue-Black Ink** (blue-black-ink): text, button and filter outlines, solid buttons, the active filter, the focus outline, and unchecked checkbox borders.
- **Graphite Muted** (graphite-muted): metric titles, descriptions, notes and status badges.
- **Pencil Line** (pencil-line): the faintest line, used for task dividers, form field borders and unscheduled date chips.

### Named Rules
**The Ruling Colour Rule.** Vermilion means the sheet's ruling or "done". It never marks a warning, a promotion or a decorative accent.

**The One Wash Rule.** Every hover, selected and scheduled state uses the same vermilion wash with ink text. Never invert to solid ink on hover.

## Typography

**Body Font:** Pretendard when installed, otherwise Malgun Gothic (with system-ui, sans-serif). No web font is shipped.
**Label/Mono Font:** none. Former monospace elements (counts, day numbers, wallet pill) inherit the body family with tabular numerals.

**Character:** One Korean workhorse sans throughout. Rank comes from Bold against Regular and from placement, the way a timetable ranks its entries.

### Hierarchy
- **Headline** (700, clamp(34px, 4.3vw, 62px), 1.2, -0.03em): the project title, once per page.
- **Title** (700, 18px, -0.02em): phase names, the next task, and the dialog and calendar headings.
- **Task** (700, 14px, 1.65): task names in the phase list.
- **Body** (400, 15px, 1.6): running text and the subtitle. Tabular numerals are used page-wide.
- **Label** (700, 13px): metric titles in muted ink, filters, and solid buttons. The completion sentence ("N / M개 작업 완료") is 14px 700 in ink.
- **Caption** (400, 12px): notes, date chips, phase footers, the save note and the footer. Badges are the same size at 700.

### Named Rules
**The Weight Not Size Rule.** Only two weights exist: 400 and 700. Do not add a size step to show importance. Make the text Bold or move it.

**The No Display Number Rule.** Quantities appear as the cell strip plus one sentence or as 15px Bold inline counts. Never set a big KPI figure. The percentage figure is hidden in this theme, and the visual bar is replaced by an accessible visually-hidden progressbar.

## Layout

The page is a centred column (max 1320px) with 48px side padding, 24px at 800px and below, and 20px at 520px and below. The first viewport goes: top bar over a 5px double vermilion rule, project title, then the overview band. The overview is three columns ruled top and bottom in vermilion and divided by soft ruling, with 26px gutters and 34px below it. At 800px and below the columns restack with soft-ruling top borders. At 520px and below they become a single column. The phase board is an auto-fit grid of columns at least 290px wide with a 22px gap. The calendar is a two-pane grid (month plus side agenda) that stacks at 800px and below, where a vermilion top rule replaces the side rule.

The cell strip is the layout's armature. Cells are 22px in the overview and 14px under phase headings. Adjacent cells share a 1px border, groups (one per phase) sit 8px apart, and wrapped rows are 6px apart.

## Elevation & Depth

The system is flat. Every drop shadow is cancelled (the shadow variable is transparent), and dialogs and cards carry no shadow. Depth comes from rule weight. A double rule marks the top of the sheet (5px under the top bar, 3px under dialog headers). Vermilion 1px rules mark primary structure, soft-ruling 1px rules mark secondary structure, and pencil lines mark the finest separation. The selected calendar day uses a 1px inset vermilion outline. This is a drawn rule, not elevation.

### Named Rules
**The Ruled Not Raised Rule.** Nothing floats. If an element needs separation, give it a rule of the right weight and colour, never a shadow or a tinted elevation layer.

## Shapes

All corners are square (0 radius). Boxes are drawn with 1px borders. The task checkbox is a 20px square with a 1.5px ink border that fills vermilion when checked. The brand mark is itself a 30px manuscript cell: a vermilion-bordered square quartered by 1px rules, with its top-left quarter filled. Icons are 16px inline SVG masks with a 1.75 stroke and square caps, coloured by the current colour (close, previous and next month, theme toggle, phase expand and collapse).

## Components

### Manuscript Cell Strip (signature)
- **Cell:** a square with a 1px vermilion border, 22px in the overview and 14px in phase headings, sharing borders with its neighbours.
- **Filled:** a solid vermilion fill with a paper-coloured check stroke (2px, or 1.5px at 14px). The fill fades in over 250ms with cubic-bezier(.16,1,.3,1). Transitions are disabled under reduced motion.
- **Grouping:** one group per phase, 8px apart. The strip is aria-hidden. A sentence beside it carries the quantity.

### Buttons
- **Shape:** square, with a 1px ink border.
- **Outline (default):** paper background with ink text. Used for nav buttons, the shop button, calendar navigation, shop actions and the close buttons.
- **Solid:** an ink fill with paper text, for the single committing action in a panel (schedule submit, cloud import).
- **Hover:** vermilion wash with ink text and border, and no movement.
- **Focus:** a 2px ink outline offset 3px, on buttons, inputs, selects and links.

### Chips
- **Status badge:** borderless muted 12px Bold text with no glyph, set at the phase heading's top right.
- **Date chip:** a 12px chip with a pencil-line border when unscheduled. When scheduled it turns vermilion-wash with vermilion text and a soft-ruling border.

### Cards / Containers
- **Corner Style:** square.
- **Background:** paper, the same as the page.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px soft ruling for phase, shop, trophy and cloud panels. 1px vermilion for the calendar frame. 1px ink for dialogs.
- **Internal Padding:** 18px 20px 16px for phase headings, 18px around tasks, and 22px vertical for overview columns.

### Inputs / Fields
- **Style:** a 1px pencil-line border on paper, 13px text, square.
- **Focus:** a 2px ink outline offset 3px.
- **Checkbox:** described under Shapes. The agenda checkboxes and the date picker use a vermilion accent colour.

### Navigation
- **Filters:** a segmented control in a 1px ink frame with 13px labels. The active segment is solid ink with paper text.
- **Top bar:** brand cell mark plus the 16px Bold wordmark on the left and outline buttons on the right, closed by the double vermilion rule.

## Do's and Don'ts

### Do:
- **Do** represent each task as exactly one ruled cell, and fill it only when the task is done.
- **Do** keep vermilion for rules and the done state, and render vermilion text as vermilion-text on the wash.
- **Do** rank with 700 against 400 on the one system stack, with tabular numerals.
- **Do** separate with 1px rules (vermilion, then soft ruling, then pencil line) and a double rule at sheet headers.
- **Do** use the vermilion wash with ink text for every hover and selected state.
- **Do** draw icons as 16px inline SVG with square caps in the current colour.

### Don't:
- **Don't** add drop shadows, hard offset shadows, or background grid textures behind cards. The cell strip and calendar grid are the only grids.
- **Don't** round corners.
- **Don't** set display-size numbers, percentages as heroes, or progress bars in this theme.
- **Don't** add English monospace kickers or eyebrow labels above Korean headings.
- **Don't** use text glyphs (arrows, check marks, plus and minus) as icons.
- **Don't** use acid lime or any second accent hue. The legacy `lime` key is only a storage slug.
- **Don't** restyle the paid themes or the completion celebration from this system. They are separately owned skins.
