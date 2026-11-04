# Alert-to-Inline-Error Refactor Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti semua 14 penggunaan `window.alert()` di komponen React dengan inline error state yang ditampilkan di UI — konsisten dengan pola `formError`/`setFormError` yang sudah ada.

**Architecture:**
- Setiap komponen yang punya `alert()` di delete/action handler ditambahkan state `deleteError`/`actionError` lokal, dan rendered sebagai `<div className="alert alert-danger">` di bawah tabel/list.
- Dua `alert()` di `MaterialStoringSection` untuk "buka dokumen" (placeholder) diganti dengan `<a href>` atau disabled button bermakna, bukan modal.
- Pattern: `catch (err) { setDeleteError(err.message || '…') }` — error hilang saat user klik hapus lain atau navigasi.

**Tech Stack:** React 18, Bootstrap 5 / Acorn tokens, Laravel 11.

**Spec:** Commit `cd24d1f` — semua file sudah punya `import { confirmDelete }` tapi masih pakai `alert()` di error path.

## Global Constraints

- Jangan ubah logika bisnis, hanya error display.
- Pertahankan pola `onToast` untuk success (sudah benar).
- Semua `alert()` error harus hilang; `alert()` placeholder dokumen harus diubah bermakna.
- Setelah setiap task: `npm run build` harus pass tanpa error baru.
- Tidak ada `console.error` baru yang ditambahkan.
- Commit per task dengan pesan feat/refactor singkat.

## Review Focus

- Jika `deleteError` tidak direset sebelum operasi berikutnya, error lama tetap tampil — tiap handler harus `setDeleteError('')` di awal.
- Alert rendered di luar modal harus punya `role="alert"` untuk aksesibilitas.
- `MaterialStoringSection` punya dua pola berbeda: error hapus (state) dan placeholder dokumen (link disabled) — jangan campur.
- Error dari `MilestoneSection.handleToggle` (bukan delete) butuh state sendiri: `toggleError`.
- Setelah build, pastikan tidak ada `alert` literal di bundle: `grep -c "window.alert\|alert(" public/build/app.js` harus turun signifikan.

---

### Task 1: Refactor BomSection, BoqSection, DocumentControlSection

**Files:**
- Modify: `pcm-backend/resources/js/components/engineering/BomSection.jsx`
- Modify: `pcm-backend/resources/js/components/engineering/BoqSection.jsx`
- Modify: `pcm-backend/resources/js/components/engineering/DocumentControlSection.jsx`

**Interfaces:**
- Consumes: `onToast` prop (sudah ada) untuk success
- Produces: state `deleteError` lokal; rendered `<div role="alert" className="alert alert-danger ...">` di bawah toolbar

- [ ] **Step 1: Tambah state `deleteError` di BomSection**

  Di `BomSection.jsx`, tepat setelah deklarasi state lain tambah:
  ```js
  const [deleteError, setDeleteError] = useState('');
  ```
  Di `handleDelete`, ganti `alert(...)` dengan:
  ```js
  setDeleteError(err.message || 'Gagal menghapus data.');
  ```
  Tambah `setDeleteError('')` di awal `handleDelete` (reset).
  Render error di atas/bawah tabel:
  ```jsx
  {deleteError && (
    <div role="alert" className="alert alert-danger py-2 small mb-3">{deleteError}</div>
  )}
  ```

- [ ] **Step 2: Tambah state `deleteError` di BoqSection — pola identik**

- [ ] **Step 3: Tambah state `deleteError` di DocumentControlSection — pola identik**

- [ ] **Step 4: Build dan verifikasi**

  ```bash
  cd pcm-backend && npm run build 2>&1 | tail -5
  grep -c "alert(" public/build/app.js
  ```
  Expected: build pass, jumlah `alert(` berkurang 3.

- [ ] **Step 5: Commit**

  ```bash
  git add resources/js/components/engineering/BomSection.jsx \
          resources/js/components/engineering/BoqSection.jsx \
          resources/js/components/engineering/DocumentControlSection.jsx \
          public/build/app.js
  git commit -m "refactor: ganti alert() error hapus dengan inline deleteError di BOM/BOQ/DocControl"
  ```

---

### Task 2: Refactor LineServiceSection, MaterialStandardSection

**Files:**
- Modify: `pcm-backend/resources/js/components/engineering/LineServiceSection.jsx`
- Modify: `pcm-backend/resources/js/components/engineering/MaterialStandardSection.jsx`

**Interfaces:**
- Consumes: `onToast` prop (sudah ada)
- Produces: state `deleteError` lokal; rendered di bawah toolbar masing-masing section

- [ ] **Step 1: Refactor LineServiceSection**

  Tambah `const [deleteError, setDeleteError] = useState('');`
  Di `handleDelete` (baris ~211), ganti `alert(...)` dengan `setDeleteError(...)`.
  Reset di awal handler.
  Render `<div role="alert" ...>` sebelum tabel.

- [ ] **Step 2: Refactor MaterialStandardSection (dua handler hapus)**

  Ada dua `alert()` — satu untuk material standards, satu untuk pipe standards.
  Tambah dua state: `deleteStdError` dan `deletePipeError` (atau satu `deleteError` plus konteks pesan).
  Rekomendasi: satu `deleteError` state, tiap handler reset dan set pesan.
  Render satu `<div role="alert">` di level section.

- [ ] **Step 3: Build dan verifikasi**

  ```bash
  cd pcm-backend && npm run build 2>&1 | tail -5
  ```
  Expected: pass, 3 `alert()` berkurang.

- [ ] **Step 4: Commit**

  ```bash
  git add resources/js/components/engineering/LineServiceSection.jsx \
          resources/js/components/engineering/MaterialStandardSection.jsx \
          public/build/app.js
  git commit -m "refactor: ganti alert() error dengan inline deleteError di LineService/MaterialStandard"
  ```

---

### Task 3: Refactor WeldingMapSection dan EngineeringTab

**Files:**
- Modify: `pcm-backend/resources/js/components/engineering/WeldingMapSection.jsx`
- Modify: `pcm-backend/resources/js/components/EngineeringTab.jsx`

**Interfaces:**
- Consumes: `onToast` (sudah ada di keduanya)
- Produces: state `deleteError` lokal di masing-masing komponen

- [ ] **Step 1: Refactor WeldingMapSection (baris ~618)**

  Tambah `const [deleteError, setDeleteError] = useState('');` di dekat state lain (baris ~175).
  Di `handleDelete`, reset dan set error.
  Render di area yang tepat (sebelum tabel welding map, setelah stats bar).

- [ ] **Step 2: Refactor EngineeringTab (baris ~400)**

  Tambah `deleteError` state.
  Render di bawah drawing table header.

- [ ] **Step 3: Build dan verifikasi**

  ```bash
  cd pcm-backend && npm run build 2>&1 | tail -5
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add resources/js/components/engineering/WeldingMapSection.jsx \
          resources/js/components/EngineeringTab.jsx \
          public/build/app.js
  git commit -m "refactor: ganti alert() error hapus dengan inline deleteError di WeldingMap/EngineeringTab"
  ```

---

### Task 4: Refactor Material Tab (4 komponen)

**Files:**
- Modify: `pcm-backend/resources/js/components/material/MaterialInspectionSection.jsx`
- Modify: `pcm-backend/resources/js/components/material/MaterialIssuingSection.jsx`
- Modify: `pcm-backend/resources/js/components/material/MaterialReceivingSection.jsx`
- Modify: `pcm-backend/resources/js/components/material/MaterialStoringSection.jsx`

**Interfaces:**
- Produces: state `deleteError` di masing-masing; `MaterialStoringSection` juga ganti dua `alert()` dokumen placeholder dengan link `href="#"` disabled + tooltip "Segera hadir"

- [ ] **Step 1: Refactor MaterialInspectionSection (baris ~164)**

  Tambah `deleteError` state, ganti `alert()`, render error.

- [ ] **Step 2: Refactor MaterialIssuingSection (baris ~171)**

  Pola identik.

- [ ] **Step 3: Refactor MaterialReceivingSection (baris ~165)**

  Pola identik.

- [ ] **Step 4: Refactor MaterialStoringSection**

  a. Error hapus (baris ~166): ganti `alert()` → `setDeleteError(...)`.
  b. Dua `alert()` di onClick button dokumen (baris ~255, ~262): ganti dengan:
  ```jsx
  <button type="button" className="btn btn-outline-secondary btn-sm" disabled title="Dokumen akan tersedia setelah upload">
    Lihat Peta Lokasi
  </button>
  ```
  (Atau `href` ke path PDF yang sesuai bila sudah ada.)

- [ ] **Step 5: Build dan verifikasi**

  ```bash
  cd pcm-backend && npm run build 2>&1 | tail -5
  grep -c 'alert(' public/build/app.js
  ```
  Expected: jumlah `alert(` turun 6 dari Task ini.

- [ ] **Step 6: Commit**

  ```bash
  git add resources/js/components/material/ public/build/app.js
  git commit -m "refactor: ganti alert() error/placeholder di Material tab (Inspection/Issuing/Receiving/Storing)"
  ```

---

### Task 5: Refactor MilestoneSection (action error)

**Files:**
- Modify: `pcm-backend/resources/js/components/pm/MilestoneSection.jsx`

**Interfaces:**
- Menggunakan `onToast` hanya untuk success
- Produces: state `toggleError` untuk error update status milestone (bukan hapus)

- [ ] **Step 1: Tambah `toggleError` state**

  ```js
  const [toggleError, setToggleError] = useState('');
  ```
  Di `handleToggle` (atau handler yang pakai `alert` di baris ~144), ganti:
  ```js
  setToggleError(err.message || 'Gagal mengubah status milestone.');
  ```
  Reset `setToggleError('')` di awal handler.

- [ ] **Step 2: Render error di UI**

  Di bawah milestone list/tabel, tambahkan:
  ```jsx
  {toggleError && (
    <div role="alert" className="alert alert-danger py-2 small mt-3">{toggleError}</div>
  )}
  ```

- [ ] **Step 3: Build dan verifikasi**

  ```bash
  cd pcm-backend && npm run build 2>&1 | tail -5
  # Verifikasi zero alert() tersisa di engineering/material/pm:
  grep -rn "alert(" resources/js/components/engineering/ resources/js/components/material/ resources/js/components/pm/
  ```
  Expected: zero matches (kecuali string literal di komentar).

- [ ] **Step 4: Run full test suite**

  ```bash
  php artisan test --compact
  ```
  Expected: semua 19 test pass.

- [ ] **Step 5: Commit**

  ```bash
  git add resources/js/components/pm/MilestoneSection.jsx public/build/app.js
  git commit -m "refactor: ganti alert() error toggle milestone dengan inline toggleError state"
  ```

---

### Task 6: Final Verification

- [ ] **Step 1: Verifikasi zero `alert()` tersisa**

  ```bash
  grep -rn "alert(" pcm-backend/resources/js/components/
  ```
  Expected: zero hasil.

- [ ] **Step 2: Build production**

  ```bash
  cd pcm-backend && npm run build 2>&1 | tail -10
  ```
  Expected: no errors, no warnings baru.

- [ ] **Step 3: Run full test suite**

  ```bash
  php artisan test
  ```
  Expected: 19/19 pass.

- [ ] **Step 4: Git log ringkas**

  ```bash
  git log --oneline -6
  ```
  Tampilkan 5 commit refactor + 1 commit original.

- [ ] **Step 5: Final commit jika ada perubahan**

  ```bash
  git status
  # Jika ada untracked: git add . && git commit -m "chore: build artifacts after alert refactor"
  ```
