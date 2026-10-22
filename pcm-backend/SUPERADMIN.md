# SUPERADMIN — as built

Status: implemented and verified on 2026-10-20.
Replaces the earlier draft, whose §11 decisions were answered by the user:
role `manager` becomes **Project Manager**, permissions live in the database,
and **department genuinely restricts data**.

---

## 1. Position of the role

SUPERADMIN sits above the seven operational roles.

- `roles.level` is **sort order only**. It never grants permission.
- The only bypass is explicit: `Gate::before()` in `AppServiceProvider`
  returns `true` for `role === 'superadmin'`. Everything else is a row in
  `permission_role`.
- superadmin has **no department** (`users.department_id` NULL) and sees every
  department's data.

---

## 2. WBS 26-00-SPA-000..009 → one admin shell

| WBS | Item | Implementation |
|---|---|---|
| 000 | PROJECT (FRONTEND) | `AdminTab` → Project sub-tab |
| 001 | PROJECT (BACKEND) | `CrudController` on `projects` + `project.*` permissions |
| 002 | USERS (FRONTEND) | `AdminTab` → Users sub-tab |
| 003 | USERS (BACKEND) | `Admin\UserController` |
| 004 | USER ROLE (FRONTEND) | `AdminTab` → Role sub-tab + role select in the user dialog |
| 005 | USER ROLE (BACKEND) | `Admin\RoleController`, `PUT /admin/users/{user}/role` |
| 006 | HAK AKSES (FRONTEND) | `AdminTab` → Hak Akses matrix |
| 007 | HAK AKSES (BACKEND) | `permissions` + `permission_role` + `Admin\PermissionController` |
| 008 | DEPARTMENT (FRONTEND) | `AdminTab` → Department sub-tab |
| 009 | DEPARTMENT (BACKEND) | `Admin\DepartmentController` |

The WBS sheet reuses `26-00-SPA-007` for both Hak Akses and Department; 009 is
the correct code for DEPARTMENT (BACKEND).

Every WBS item is its own sidebar menu and its own screen: `#project`,
`#users`, `#roles`, `#access`, `#departments`. No tab strip inside the page,
so an admin function can never hide behind a sub-navigation.

Sidebar order for superadmin: **Global Dashboard**, then the *Administrasi*
group — **Project, Users, Roles, Hak Akses, Departments** — with the
`List Departement` picker directly under Departments, then the chosen
department's modules (see §6).

---

## 3. Data model

```
departments   id, code UNIQUE, name, sort, is_active, timestamps
roles         id, code UNIQUE, name, description, level, is_system, timestamps
permissions   id, code UNIQUE, group_name, label, sort
permission_role  role_id FK cascade, permission_id FK cascade, PK(role_id, permission_id)

users         + department_id FK nullOnDelete
              + is_active BOOLEAN default 1
              + last_login_at TIMESTAMP null
              role VARCHAR(64) FK -> roles.code  (ON UPDATE CASCADE, ON DELETE RESTRICT)

department_id added to: drawings, joints, stock_moves, inspections,
                        test_packages, hse_logs, scopes, daily_progress
```

`group_name` is used instead of `group` because `GROUP` is a MySQL reserved word.

`users.role` stays a string. It is now a foreign key to `roles.code`, so the
existing `AuthController`, `Sidebar`, `app.jsx` and `checkWrite()` contracts did
not have to change, while referential integrity is enforced by the database.

### Record ownership

Each operational row belongs to exactly one department:

| Table | Owner |
|---|---|
| `drawings` | ENG |
| `joints` | CONS |
| `stock_moves` | MAT |
| `inspections` | QAQC |
| `test_packages` | QAQC |
| `hse_logs` | HSE |
| `scopes` | PMO |
| `daily_progress` | PMO |

`projects` is deliberately **not** department-scoped: a job is job-wide.

---

## 4. Roles (8)

| code | name | level | department |
|---|---|---|---|
| `superadmin` | Super Admin | 100 | — (all) |
| `project_manager` | Project Manager | 80 | PMO |
| `engineer` | Engineer | 60 | ENG |
| `material` | Material Control | 50 | MAT |
| `construction` | Construction | 50 | CONS |
| `qaqc` | QA/QC | 50 | QAQC |
| `testpackage` | Test Package | 50 | QAQC |
| `hse` | HSE | 50 | HSE |

The role formerly called `manager` is now `project_manager`. The demo account
keeps the address `manager@pcm.local` so the documented login still works; its
display name is "Project Manager".

---

## 5. Permission matrix (38 codes)

| Role | Permissions |
|---|---|
| superadmin | all (bypass, column locked in the UI) |
| project_manager | `dashboard.view` `scope.view` `scope.write` `progress.write` `report.view` `project.view` `user.view` `role.view` `access.view` |
| engineer | `dashboard.view` `drawing.view` `drawing.write` |
| material | `dashboard.view` `stock.view` `stock.write` |
| construction | `dashboard.view` `joint.view` `joint.write` |
| qaqc | `dashboard.view` `joint.write` `joint.cross` `inspection.view` `inspection.write` |
| testpackage | `dashboard.view` `testpackage.view` `testpackage.write` |
| hse | `dashboard.view` `hse.view` `hse.write` |

Notes on three deliberate asymmetries:

- **`joint.cross`** lets QA/QC act on joints owned by Construction. Without it
  QA/QC could not sign off a joint, because the department filter would hide it.
  This is the only cross-department grant.
- **engineer has `project.create`/`project.update` but not `project.view`.**
  `project.view` is the *admin screen* grant; the Engineering tab reads
  `/api/projects` through the open read endpoint. Giving engineer
  `project.view` would put "Administrasi Sistem" in their sidebar.
- **construction no longer writes BOQ/progress.** `scopes` and `daily_progress`
  belong to PMO; `progress.write` and `scope.write` are Project Manager rights.
  This changed the old contract test, which is updated to lock the new model.

Reads are open to any authenticated user, as before; only writes and the admin
routes are gated. Menu visibility uses the `*.view` permission of the module.

---

## 6. Department scoping

`CrudController::scope()` applies to `index`, `show`, `store`, `update`,
`destroy`, and to every aggregate in `/api/overview`:

1. superadmin → filter by `X-Department-Id` when the sidebar picker is set,
   otherwise no filter.
2. User holds the resource's cross permission (`joint.cross`) → no filter.
3. Resource is not department-scoped (`projects`) → no filter.
4. User has no department → `WHERE 1 = 0`. **Fails closed**, never open.
5. Otherwise → `WHERE department_id = user.department_id`.

`store` sets `department_id` from the authenticated user and ignores any value
sent by the client. `update` strips `department_id` for non-superadmin.

### Superadmin department picker

The `List Departement` select under the Departments row narrows the app to one
department. With no department selected the sidebar is admin-only; picking one
appends that department's modules and scopes its data. The choice is stored in
`localStorage` and sent on every request as `X-Department-Id`; `scope()`
applies it to every department-scoped resource, `/api/overview` included.
`projects` stays job-wide. The header badge and the dashboard chip show the
active scope (`Super Admin · CONS`).

The module mapping: PMO → Project Manager + Laporan, ENG → Engineer, MAT →
Material, CONS → Construction Shop + Field Erection, QAQC → QA-QC + Test
Package, HSE → HSE. The 5 admin menus always stay. Switching to a department
that does not own the open module moves the user to that department's first
module. `store()` writes the selected department; with no filter it falls back
to the module's owner, so a new row is never orphaned.

Consequences that are visible in the UI, by design:

- A Construction user's Global Dashboard shows Construction rows only; the
  header carries a `Dept. CONS` chip. superadmin sees `Semua departemen`.
- "Navigasi Modul" and the sidebar only list modules the role may open, so a
  card never bounces the user through the tab guard.
- Empty cross-department KPIs render as `-`, per the honest-data rule.

---

## 7. API

```
POST   /api/login                      public, blocks is_active = 0, sets last_login_at
GET    /api/me                         identity + role + department + permissions[]
POST   /api/logout

GET    /api/admin/departments          department.view
POST   /api/admin/departments          department.create
PUT    /api/admin/departments/{id}     department.update
DELETE /api/admin/departments/{id}     department.delete

GET    /api/admin/roles                role.view      (includes permission_codes + users_count)
POST   /api/admin/roles                role.create
PUT    /api/admin/roles/{id}           role.update
DELETE /api/admin/roles/{id}           role.delete

GET    /api/admin/users                user.view      (?q= &role= &department_id= &is_active=)
POST   /api/admin/users                user.create
PUT    /api/admin/users/{id}           user.update
DELETE /api/admin/users/{id}           user.delete
POST   /api/admin/users/{id}/password  user.reset-password
PUT    /api/admin/users/{id}/role      role.assign

GET    /api/admin/permissions          access.view
GET    /api/admin/roles/{id}/permissions   access.view
PUT    /api/admin/roles/{id}/permissions   access.update
```

Admin routes are declared before the `/{res}` catch-all.

`/api/me` returns:

```json
{ "id": 1, "name": "...", "email": "...", "role": "qaqc",
  "role_name": "QA/QC", "is_superadmin": false,
  "department": { "id": 5, "code": "QAQC", "name": "Quality Control" },
  "permissions": ["dashboard.view", "joint.write", "..."] }
```

The frontend refreshes `/api/me` on every session load, so a change in the
Hak Akses matrix takes effect without a rebuild or redeploy.

---

## 8. Guard rails

Implemented in `Admin\UserController` and `Admin\RoleController`:

- cannot delete your own account;
- cannot demote, deactivate, or delete the last active superadmin;
- cannot demote or deactivate yourself;
- system roles (`is_system = 1`) cannot be deleted and cannot change `code`
  (they can still have permissions edited);
- a role still assigned to users cannot be deleted (422 with the count);
- a department still assigned to users cannot be deleted (422 with the count);
- password reset requires 8+ chars, never returns the hash, and revokes every
  existing token for that user;
- the superadmin column of the matrix is locked; `PUT` on it returns 422;
- every admin write is validated (`exists:roles,code`, `exists:departments,id`,
  unique email, unique code);
- deactivated accounts are refused at login with 403.

Not implemented in v1 (deliberate): per-user permission overrides, multiple
roles per user, audit table for admin writes (`activity_log` was dropped from
scope to keep this change reviewable).

---

## 9. Frontend

- `AdminTab.jsx` — one component, one `section` prop (`project`, `users`,
  `roles`, `access`, `departments`). Each section is a separate sidebar menu
  and fetches only its own data. The action column only renders when the role
  actually has an action in it. Dialogs close on Escape.
- `Sidebar.jsx` — `ROLE_SIDEBAR_MENUS` entries carry `perm` (or `anyOf`),
  so visibility follows the database, not the role name. For superadmin the
  list is rebuilt as Global Dashboard + the *Administrasi* group + the
  `List Departement` picker + the selected department's modules, with
  `Administrasi` / `Departemen: X` group labels. Long lists scroll inside
  their own box (with a bottom fade) and the active row is scrolled into view.
- `app.jsx` — holds `permissions` and `departmentFilter`, refreshes `/me` on
  token change, reloads after 30 s or a department change, and redirects a
  forbidden hash tab to the first menu the role can open.
- `auth.js` — `can(user, code)`: superadmin always true, everyone else reads
  `permissions[]`. Every module uses it for its edit buttons, replacing the
  old `role === 'manager'` string checks (which never matched).
- `Header.jsx` — session badge shows `role_name · scope` (`Semua` for an
  unfiltered superadmin); the breadcrumb uses the open menu's description.
- `OverviewTab.jsx` — scope chip in the header; module nav filtered by
  permission.
- `main.css` — admin block: `pcm-menu-dept-select`, `pcm-menu-group`, `pcm-btn`,
  `pcm-table-wrap`, `pcm-alert`, `pcm-form-grid`, `pcm-matrix`.
- `app.blade.php` — `/build/app.js?v=<filemtime>` so a deploy never serves a
  stale bundle.

---

## 10. Rollout on cPanel

The catalog is installed by the migration itself (`AccessCatalog::install()`),
so `php artisan migrate` alone produces a working access model — important on
shared hosting where running a second command is awkward.

1. Upload, `composer install --no-dev`.
2. `php artisan migrate --force`.
3. `php artisan db:seed --class=RolePermissionSeeder --force` (only to restore
   the shipped matrix after manual edits; the migration already did this).
4. `php artisan config:cache && php artisan view:cache`.
5. Log in as `superadmin@pcm.local` and **change the password immediately**
   (the demo password is `pcm123`).

`AccessCatalog` is idempotent: every entry is an `updateOrInsert`, and each
role's `permission_role` rows are replaced, not appended.

---

## 11. Verification

| Suite | Result |
|---|---|
| `php artisan test` | 15 passed, 71 assertions |
| API read + scoping (`/tmp/opencode/apitest.py`) | 45/45 |
| API write + guards (`/tmp/opencode/writetest.py`) | 30/30 |
| Browser per-role menus + admin screens (`/tmp/opencode/admin.mjs`) | 86/86 |

Covered explicitly: menu shape for all 8 roles, 5 separate admin menus for
superadmin / 4 for Project Manager, `#users` unreachable for operational
roles, action columns hidden for read-only roles, no password hash on screen,
matrix 38 × 8 with the superadmin column locked, the matrix Save button only
enabled when a role's ticks actually differ, dialog role/department options,
Escape closes dialogs, department picker shape and position, admin-only
default sidebar, module list appending per department with its group label,
automatic tab move on department change, scope label on the dashboard, self-delete blocked, last-superadmin guard, role-in-use and
department-in-use blocked, inactive login refused, permission change effective
without restart, department-scoped joint reads (CONS 28 / MAT 0 / QAQC 28 /
superadmin 28), and zero horizontal overflow.

---

## 12. Open items

- Contract baseline (333.497 vs 151.018 DI) is still undecided.
- The Global Dashboard "locked" modal is dead state (`showGlobalLockedModal` is
  never set true).
- `RoleMiddleware` (`role:` alias) is now unused; only `permission:` is used.
- Admin writes are not yet recorded in an audit log.
