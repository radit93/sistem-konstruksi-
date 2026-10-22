# Project-Scoped Engineering Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an active-project context across the entire application sidebar, refactor Line Service into a project-owned master, streamline Isometric Drawing inputs with multi-item Fit-Up Specs, integrate auto-calculated DI for Welding Map (including reducer handling), and add Pipe Diameter/Thickness master data.

**Architecture:** 
- Centralized active project state in `app.jsx` synced with `localStorage`, filtering all operational engineering views when active.
- Database migration for `fitup_specs` on `drawings`, and master pipe standards (`pipe_diameters` / `pipe_standards`).
- Frontend updates across `EngineeringTab`, `LineServiceSection`, `WeldingMapSection`, and `MaterialStandardSection` with rigorous zero-light-blue and anti-slop guidelines.

**Tech Stack:** Laravel 11, React 18, SQLite/MariaDB, PHPUnit, Bootstrap 5 / Acorn tokens.

---

### Task 1: Active Project Context in Frontend App Shell & Sidebar

**Files:**
- Modify: `pcm-backend/resources/js/app.jsx`
- Modify: `pcm-backend/resources/js/components/Sidebar.jsx`
- Modify: `pcm-backend/resources/js/components/Header.jsx`

- [ ] **Step 1: Wire active project state in `app.jsx` with storage persistence**
- [ ] **Step 2: Add Active Project Indicator / Switcher in Sidebar & Header**
- [ ] **Step 3: Verify navigation preserves active project context across tabs**

---

### Task 2: Backend Migration & Models for Fit-Up Specs & Pipe Standards Master

**Files:**
- Create: `pcm-backend/database/migrations/2026_10_21_000001_add_fitup_specs_and_pipe_standards.php`
- Create: `pcm-backend/app/Models/PipeStandard.php`
- Modify: `pcm-backend/app/Models/Drawing.php`
- Modify: `pcm-backend/app/Http/Controllers/CrudController.php`
- Test: `pcm-backend/tests/Feature/PcmContractTest.php`

- [ ] **Step 1: Write test for pipe-standards API and drawings fitup_specs**
- [ ] **Step 2: Create migration and model for pipe standards and drawing fitup_specs**
- [ ] **Step 3: Register `pipe-standards` in CrudController and AccessCatalog**
- [ ] **Step 4: Run tests to verify pass**

---

### Task 3: Refactor Line Service Master & Form

**Files:**
- Modify: `pcm-backend/resources/js/components/engineering/LineServiceSection.jsx`

- [ ] **Step 1: Update form fields (Line Number, Service Name, Fluid, Piping Class, optional Design P/T, optional Operating P/T)**
- [ ] **Step 2: Ensure Line Service belongs to the active project**
- [ ] **Step 3: Style table with high contrast and dark blue `#1e40af`**

---

### Task 4: Redesign Isometric Drawing Input & Fit-Up Specs

**Files:**
- Modify: `pcm-backend/resources/js/components/EngineeringTab.jsx`

- [ ] **Step 1: Update drawing modal form (Line Service dropdown, auto Line No, Drawing No, Sheets X of Y)**
- [ ] **Step 2: Implement dynamic Fit-Up Specs sub-form (Size, Schedule, Material Spec - multiple entries)**
- [ ] **Step 3: Update Drawing Specification detail popup with Fit-Up Specs table**

---

### Task 5: Welding Map Reducer Logic & Auto-Calculated DI

**Files:**
- Modify: `pcm-backend/resources/js/components/engineering/WeldingMapSection.jsx`

- [ ] **Step 1: Wire drawing dropdown to populate Fit-Up specs into Material A and Material B**
- [ ] **Step 2: Implement automatic DI calculation (Same size -> direct inch; Reducer -> calculate based on weld end/reducer rule)**
- [ ] **Step 3: Format Welding Map table (Drawing -> Joint -> Spool -> Material A & B separation -> Auto DI)**

---

### Task 6: Master Pipe Standards UI in Material Standards Tab

**Files:**
- Modify: `pcm-backend/resources/js/components/engineering/MaterialStandardSection.jsx`

- [ ] **Step 1: Add Pipe Diameter, Thickness & Weight table/tab in Material Standards**
- [ ] **Step 2: Seed realistic standard pipe sizes (1/2" to 24", Sch 10 to Sch 160, weight kg/m)**

---

### Task 7: Build & Full Test Verification

- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Run `php artisan test`**
- [ ] **Step 3: Verify git status and clean diff**
