# DESIGN.md - PCM Piping Suite (Job No. 2428)

Design direction for the PCM Piping Suite dashboard. This file is the single
source of truth for visual decisions and the reason behind each one, as
required by rule R-31. Rule references are from the Antislop UI rule set
(R-01 to R-38).

## 1. Product and audience

An internal operations console for a piping construction job. Seven roles
(manager, engineer, material, construction, qaqc, testpackage, hse) use it
during a shift. It is a workbench, not a marketing site. Users are on desktop
in an office, or on a laptop and tablet on site.

## 2. Dials (R-37)

| Dial | Value | Reason |
| --- | --- | --- |
| ENERGY | 1 (calm) | Operators read dense status tables for hours. A loud interface spends attention that belongs to the data. |
| RHYTHM | 1 (uniform) | Every screen is a tool of equal weight. Predictable placement beats variety when the user is hunting a value, not browsing. |
| MOTION | 1 (hover states only) | Motion must never delay a reading. Only hover and focus feedback, plus a short fade on state changes. |

Uniform rhythm is a deliberate choice here, permitted by R-05 for RHYTHM 1.

## 3. Palette (R-29, R-01)

One brand accent, five neutral steps, three semantic status colours. Each
status colour stands for a real state, never for decoration.

| Token | Value | Role | Reason |
| --- | --- | --- | --- |
| `--pcm-primary` | `#1d4ed8` | Brand accent: actions, links, active state | Already the brand blue of the sidebar (`#1e40af`) and of the existing Tailwind config. No new colour invented. |
| `--pcm-primary-dark` | `#1e40af` | Hover and emphasis of the accent | Same hue, one step darker, so emphasis stays inside the brand. |
| `--pcm-navy` to `--pcm-navy-deep` | `#0d3b66` to `#001e3d` | Page header surface | The established identity band, already used by the Overview page. Same hue family, so it reads as one product (R-20). |
| neutrals | slate steps | Surfaces, text, borders | Neutral, so it does not count against the palette limit. |
| `--pcm-success` | `#15803d` | Real state: active / approved | Green is the domain convention for "accepted" in QC records. |
| `--pcm-warning` | `#b45309` | Real state: unassigned / pending | Amber is the domain convention for "needs attention" without failure. |
| `--pcm-danger` | `#b91c1c` | Real state: error / rejected | Reserved for failures and form errors only. |

Removed from the Engineering screen: `sky` (a second blue doing the brand
blue's job), `rose` and `emerald` as decoration. Gradients are limited to the
header band, which separates the page identity from the work area. There is no
blue-to-purple, no neon, and no glow.

## 4. Typography (R-06)

| Role | Family | Reason |
| --- | --- | --- |
| Body | `--font` = Nunito Sans | Already loaded and used across the app. Legible at 12-13px, which is the working size of the dense tables. |
| Headings and figures | `--font-heading` = Montserrat | Stronger figures for KPI numbers and page titles, already the app convention. |
| Identifiers | `--pcm-mono` (system mono stack) | Drawing numbers, line numbers, and job numbers are identifiers where digit and letter shapes must be unambiguous (0/O, 1/l). Mono is a functional choice here, not a terminal aesthetic. |

No uppercase-with-wide-tracking labels beyond small functional section
headings at 0.02em to 0.03em tracking.

## 5. Radius (R-11)

Three steps, no pills:

| Token | Value | Use |
| --- | --- | --- |
| `--pcm-radius-chip` | `6px` | Chips, badges, table action buttons |
| `--pcm-radius-control` | `8px` | Inputs, selects, buttons, small panels |
| `--pcm-radius-card` | `12px` | Cards, bands, modals |

Icon containers in the Engineering module are rounded rectangles, not circles,
so the radius scale stays at three steps.

## 6. Elevation (R-12)

Two levels only, because shadow is an elevation marker, not a default skin:

| Token | Value | Use |
| --- | --- | --- |
| `--pcm-elev-1` | `0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.07)` | Surfaces sitting on the page canvas: cards, toolbars, stat tiles |
| `--pcm-elev-2` | `0 16px 40px -12px rgba(15,23,42,.28)` | Elements lifted above the page: modals only |

Hover on an interactive card changes the border colour, not the shadow, so the
elevation scale keeps meaning only two things.

## 7. Spacing and layout

- Page shell: `container-fluid px-4 py-4`, matching every other tab.
- Grid steps come from Bootstrap's `row g-3` so gutters match the rest of the app.
- Whitespace separates groups. Sections are separated by `mb-4`, items inside a
  section by `g-3`.
- One focal point per screen: the header band. Everything below defers to it.

### Scale

Sizes are set once, at the root, so menus and layout grow together instead of
drifting apart:

- `html { font-size: 17px }` in `main.css`. Acorn and Bootstrap express nearly
  everything in `rem`, so this one value lifts menus, gutters, cards, forms and
  tables in proportion. It is the only global size lever in the project.
- The Acorn layout variables are re-declared next to it (`--nav-size: 19rem`,
  `--nav-size-slim: 4.75rem`, `--main-spacing-horizontal: 2.75rem`,
  `--main-spacing-vertical: 2.25rem`, `--input-height: 2.5rem`,
  `--title-spacing: 1.5rem`) **including their responsive steps**. `main.css`
  loads after `styles.css`, so without re-declaring the breakpoints the desktop
  values would win on every screen size.
- Fixed pixel values that cannot scale with `rem` are bumped by hand and kept in
  one place: `.btn-sm` is 42px, table row actions 32px, mobile tap targets 48px,
  the sidebar logo 120px.
- Measured effect: sidebar 288px -> 323px, menu text 13.6px -> 17px, menu rows
  ~40px -> 54px, body text 14px -> 14.875px, header actions 36px -> 42px.

## 8. Icons (R-04)

One set: Heroicons outline paths, single stroke weight, 24x24 grid, drawn inline
so there is no icon-font dependency and no mixed icon systems. No emoji
anywhere in the interface. Icons are chosen for what they represent: folder for
a project folder, building for a client, document for a drawing file.

## 9. States (R-27)

Every data view provides three states:

- Loading: a spinner with a status message while the API responds.
- Empty: a plain explanation plus the action that resolves it (for example,
  "create the first project folder").
- Error: a Bootstrap alert carrying the message returned by the API, never a
  guessed one.

Modals are closable three ways: the close control, Escape, and a backdrop
click. Every interactive element is reachable by Tab and shows a visible focus
ring (R-32).

## 10. Copy (R-02, R-16, R-17, R-36)

- Indonesian, plain and specific: "Buat Folder Proyek Baru", not "Mulai".
- No em dashes. Commas, colons and parentheses instead.
- No invented statistics. Every number on the Engineering screen is computed
  from API data, and an unloaded value renders as a dash, never as a fake zero.
- No claims the system cannot back.

## 11. Per-module notes

### Engineering (folder explorer and drawing register)

- Structure follows the work: first the folder directory, then the drawing
  register inside a folder. Two views, one level of drill-down, matching how an
  engineer looks up an isometric.
- The four tiles above the directory are peer counts of one dataset, so they
  share one treatment on purpose. Uniform size here reflects equal importance,
  rather than the identical template cards that R-14 forbids for feature lists.
- Folder cards are real buttons, so opening a folder works with keyboard and
  with a tap target on mobile.
- The register shows eight columns, not twelve. Pairs that are always read
  together share a cell: material spec over size range, total DI over joint
  count. Sheet and area sit as sub-lines under the drawing number and the line
  number, so nothing is dropped, it is grouped. This is what keeps the AKSI
  column on screen at 1440px instead of scrolled off the right edge.

### Global Dashboard (executive summary, all roles)

- Every figure on this screen is computed from the API. A value with no source
  renders as a dash, never as a guessed number (R-16). That replaced three
  fabricated figures: a contract value (`Rp 194.0 M`) read from a table with no
  value column, "safe man-hours" (`12.450 Jam`) read from a table with no hours
  column, and a hard-coded baseline (`Target 151.018 DI`) that contradicted the
  scope register. The contract baseline shown is the scope register itself,
  `187.316,56 DI` over 18 scopes.
- Colour carries exactly two meanings here, and only in the lifecycle funnel:
  brand accent means the joint reached that stage or passed beyond it, neutral
  means it did not. Measured contrast is 6.7:1 on the accent cards and 4.76:1 on
  the neutral ones, both above the 4.5:1 WCAG AA asks for body text. The eight
  arbitrary badge colours it replaced said nothing: two of them were the same
  blue, and most surfaces were a washed-out `bg-opacity-10` tint.
- The funnel counts cumulatively, so it is monotonic and shows where work
  actually stops. Eight isolated per-status counts hid the fact that six of the
  eight stages were still empty.
- The register rows are the only place where a missing value is normal, so the
  dash is a first-class citizen here: drawing 1 genuinely has no sheet, material
  spec, size range or diameter-inch.
- Project selection is data-driven. The API returns projects newest first, so
  `projects[0]` was an empty demo folder; the header now names the project the
  drawing register actually belongs to and states how many other projects are
  registered.
- The contract weight model is kept because `ANALISIS.txt` defines it, but its
  first milestone is derived from the register instead of a hard-coded `100`.
  It is labelled as a weighted figure so it is not read as physical completion;
  the funnel carries the physical position.
- The registry folds size range under material spec, and keeps both row actions
  in one AKSI cell. That is what removes the last 31px of horizontal scroll and
  lets the table sit on the canvas at 1440px.
- The drawing detail modal closes three ways (control, Escape, backdrop), moves
  focus to its close control on open, and carries `role="dialog"` with
  `aria-modal="true"` (section 9).
- Copy is deliberately thin. The stage names already say what each stage is, so
  the eight per-stage descriptions went, along with the header lede and the
  nav-card descriptions. Everything left on this screen is a value, a unit, a
  status, or one line that stops the funnel from being misread ("Angka adalah
  joint yang sudah mencapai tahap ini atau lebih jauh").
- `.pcm-kpi__foot` sets `display: block` on purpose. As an inline span its
  `padding-top` dragged the `border-top` up over the figure above it, which read
  as a strike-through on every KPI value.
- The dashboard is department-scoped for every role except superadmin. The header
  states the scope (`Semua departemen` or `Dept. CONS`) so an empty cross-module
  KPI reads as "not your department", not as "the project has no data". The
  module nav is filtered by the same permissions as the sidebar, otherwise a
  card would send the user to a tab the guard immediately bounces back.

### Login (threshold page)

- A plain credential form: email, password, submit. The previous role-picker
  grid was removed because `POST /api/login` authenticates on the credential
  pair alone, so choosing a card only pre-filled two fields the user then had to
  confirm. The page is simpler because the API is simpler.
- It renders instead of the dashboard shell, so it carries its own canvas and
  centring. The panel is a `div` with `role="main"`, not a `<main>`, because the
  theme pads every `main` element by the sidebar width this page does not have.
- Bad credentials return HTTP 401, and `api.request` read every 401 as an
  expired session. `api.login` now passes `skipAuthRedirect` so the server's own
  "Email atau password salah" reaches the form instead of "Sesi berakhir".

### App shell (who owns the sidebar menu)

- The sidebar is React's (`Sidebar.jsx` inside `#root`), but the Acorn template
  boots its own `Nav` from `/js/scripts.js` roughly 100ms after
  `DOMContentLoaded` — after React has already painted the menu.
- Acorn's `Nav._addVerticalMenu()` deletes `<ul id="menu">` and re-inserts a
  static copy of the markup it captured at construction. React then keeps
  patching a node that is no longer in the document: the page content changes
  but the highlighted menu item stays frozen on whatever was active at first
  paint.
- `public/js/base/pcm-menu.js` is loaded immediately after `nav.js`, before
  `scripts.js` constructs `Nav`, and replaces `_addVerticalMenu` with a version
  that keeps the live element and runs only `_initVerticalMenu()` (menu
  listeners, menu-container scrollbar, dropdowns) and `_initIcons()`.
- `_matchUrl()` is deliberately not called. It matches
  `window.location.pathname`, which is always `/` in this single-module app, so
  it can only ever add a wrong `active`; React stays the single owner of the
  highlight.
- Both `Nav` and `AcornIcons` are declared as top level `class` in their own
  scripts, so they exist as lexical globals and never as `window` properties.
  Code in the bundle that tests `window.Nav` or `window.AcornIcons` silently
  does nothing, so the Acorn boot sequence has to be intercepted by a plain
  script placed ahead of `scripts.js` rather than from React.

### Sidebar shape and the superadmin department picker

- One menu = one screen. Administration is five separate menus (Project,
  Users, Roles, Hak Akses, Departments), not one menu with a tab strip.
- Superadmin sees a focused sidebar: **Global Dashboard**, the *Administrasi*
  group, the `List Departement` select under the Departments row, then the
  chosen department's modules under a `Departemen: X` label. No department
  selected means no operational modules, so the default view is administration.
- The select is styled as a menu row (same height, same hover, `active` marker)
  so it reads as part of the list instead of a floating form control.
- Long lists scroll inside `os-viewport`, with a 22px bottom fade so a clipped
  row does not look like a bug, and the active row is scrolled into view on tab
  and department change.
- `Operasional` / `Departemen: X` / `Administrasi` group labels are hairline
  uppercase captions, 0.625rem, 60% white. They only render for superadmin,
  because other roles have a single group.

## 12. Open items

- `SUPERADMIN` is built. Role `manager` is now `project_manager`, permissions
  live in `permissions` / `permission_role`, and department scopes operational
  data. The as-built record, matrix and guard rails are in `SUPERADMIN.md`.
- Contract baseline (333.497 vs 151.018 DI) is unresolved. The dashboard shows
  the scope register itself (`187.316,56 DI`) until the contract value is
  confirmed.
- The Global Dashboard lock modal is dead state: `showGlobalLockedModal` is never
  set to true.
- `RoleMiddleware` (the `role:` alias) is no longer used; `permission:` replaced
  it. Only superadmin has an explicit bypass, via `Gate::before`.
- Admin writes are not recorded in an audit log yet.
- Operational tables still use plain Bootstrap `.table` while the five admin
  screens use `.pcm-table`; the two should converge on the design system.
- Row actions in the operational modules are text links (`Update`), while
  admin rows use `pcm-btn` buttons.
- Tailwind is still loaded from a CDN. `LoginModal`, `EngineeringTab` and
  `OverviewTab` no longer need it; the only remaining consumer is `Navbar.jsx`,
  and that file is never imported. The CDN can be dropped once `Navbar.jsx` is
  deleted or converted.
- Light theme only. There is no theme toggle, so R-34 does not apply yet. If a
  dark mode is added later it must be verified in both modes.
