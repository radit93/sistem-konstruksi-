# KONTEKS PROYEK & MEMORI ARSITEKTUR: PCM PIPING DASHBOARD (JOB 2428)

Prompt ini merangkum seluruh riwayat, arsitektur sistem, aturan bisnis, data sumber, dan catatan teknis kritis dari **PCM Piping Dashboard**. Gunakan seluruh isi dokumen ini sebagai context bootstrap sekali jalan di Antigravity.

---

## 1. Sumber Data Asli & Berkas Referensi (Sources)

1. **Spreadsheet Sumber Bisnis & Data Lapangan**:
   - Path lokal: `/home/neixcyll/Downloads/PCM Piping.xlsx`
   - Job No: **2428**
   - Sheet Utama yang dianalisis:
     - `Piping Work`: Tahapan pekerjaan piping (Pra-Kualifikasi, Bidding, Project Execution per tim).
     - `Work Scope`: Panduan & lingkup divisi (Engineering, Material, Construction, QA-QC, Test Package, HSE).
     - `Report & Dasboard `: Format report/record input tiap PIC serta alur status inspeksi.
     - `BOQ Proposal` & `Contoh Unit Price`: Formula direct/indirect cost, unit price per dia-inch, manpower, equipment, consumables.
     - `Welding Traceability`: Data aktual 28 joint sambungan pipa drawing `2428-M-15-MPP-AB-SHT1` (Line MPP-AB).
     - `Progress Sch` & `Budget VS Progress`: Breakdown scope logam (CS, Alloy P11/P22/P91, SS), non-metal, dan schedule deviasi.
2. **Template UI Acorn**:
   - Path arsip: `/home/neixcyll/Downloads/acorn-html-ecommerce-platform.zip`
   - Ekstrak aset statis: `/home/neixcyll/pcm-dashboard/pcm-backend/public/acorn/` (CSS, font CS-Interface, icons, bootstrap).
3. **Dokumentasi Analisis Eksisting**:
   - `/home/neixcyll/pcm-dashboard/ANALISIS.txt` (Analisis komprehensif bagian A - I).
   - `/home/neixcyll/pcm-dashboard/KESIMPULAN_SIAP_EKSEKUSI.txt` (Keputusan teknis deployment dan modul).

---

## 2. Lokasi Repositori & Direktori Kerja

- **Root Proyek**: `/home/neixcyll/pcm-dashboard`
- **Backend (Laravel Monolit + React)**: `/home/neixcyll/pcm-dashboard/pcm-backend`
- **Data & Binari Database**:
  - Binary MariaDB: `/home/neixcyll/pcm-dashboard/mariadbd`
  - Config: `/home/neixcyll/pcm-dashboard/my.cnf`
  - Socket: `/home/neixcyll/pcm-dashboard/mysql.sock`
  - Data directory: `/home/neixcyll/pcm-dashboard/mysql-data`
  - Runner otomatis: `/home/neixcyll/pcm-dashboard/run_services.sh`
- **Backup Frontend Sebelumnya**: `/tmp/pcm-frontend-backup`

---

## 3. Tech Stack & Environment Runtime

- **Backend**: Laravel 11 dengan Laravel Sanctum (Token Auth). Berjalan di port `:8001`.
- **Database**: MariaDB internal port `:3307` (DB Name: `pcm_dashboard`, socket: `~/pcm-dashboard/mysql.sock`).
  - Catatan: Menghindari bentrok dengan mysqld sistem Ubuntu bawaan (port 3306).
- **Frontend**: React 19 di dalam `pcm-backend/resources/js/` (berjalan monolit di dalam view Blade Laravel, bukan Next.js terpisah).
  - Alasan Arsitektur Monolit: Memudahkan deployment ke shared hosting / cPanel (1 domain, 1 document root, tanpa CORS/reverse proxy).
- **Bundler Frontend**: `esbuild` via `npm run build` di folder `pcm-backend`.
  - Output bundle: `public/build/app.js` (~390 KB).
  - Command build:
    ```bash
    cd /home/neixcyll/pcm-dashboard/pcm-backend && npm run build
    ```

---

## 4. Akun Demo & 7 Role Operasional

Sistem diamankan dengan Laravel Sanctum. Tiap role memiliki hak akses input data khusus:

| Role | Email Demo | Password | Lingkup Tugas Utama |
|---|---|---|---|
| **Manager** | `manager@pcm.local` | `pcm123` | Overview KPI, S-Curve progres, deviasi budget vs actual, rekap total. |
| **Engineer** | `engineer@pcm.local` | `pcm123` | Folder Proyek Client, Isometric Drawing, Weld Mapping, revisi PDF. |
| **Material** | `material@pcm.local` | `pcm123` | Material Receiving Report, Storing, Issuing, stock MTC/Heat No. |
| **Construction** | `construction@pcm.local` | `pcm123` | Shop Spool Fabrication, Fit-Up lapangan, Welder assignment, Erection. |
| **QA/QC** | `qaqc@pcm.local` | `pcm123` | Inspeksi Visual pengelasan, NDT (PT/MT/RT/UT), status Pass / Repair. |
| **Test Package** | `testpackage@pcm.local` | `pcm123` | Hydrotest / Leak test package, blind flanges checklist, reinstatement. |
| **HSE** | `hse@pcm.local` | `pcm123` | Izin kerja (Permit to Work), safety inspection findings, safe man-hours. |

---

## 5. Alur Siklus Status Joint Pipa (Traceability Lifecycle)

Setiap sambungan pengelasan (joint) pada piping memiliki transisi status bertahap yang hanya boleh dimajukan oleh PIC divisi terkait:
```
RECEIVED -> ISSUED -> FITUP_OK -> WELDED -> VISUAL_OK -> NDT_OK -> TESTED -> REINSTATED
                                       \-> REPAIR (jika QA/QC temukan defect)
```

---

## 6. Seed Data & Pengujian (Contract Testing)

- **Seed**:
  - 28 Joints riil drawing `2428-M-15-MPP-AB-SHT1` (Line MPP-AB).
  - 18 Scopes kontrak pekerjaan (Shop Fab Carbon/Alloy/SS, Field Erection, Pipe Support, Bolting).
  - 7 User akun demo per role.
- **Unit & Contract Testing**:
  - File test: `pcm-backend/tests/Feature/PcmContractTest.php`
  - Status pengujian: **8/8 method lulus (43 assertions)**.

---

## 7. Catatan Kritis & Gotchas Wajib Ingat

1. **Isu Blank Putih Template Acorn**:
   - File template Blade: `pcm-backend/resources/views/app.blade.php`.
   - Tag `<html>` **WAJIB** memiliki atribut:
     ```html
     <html lang="id" data-footer="true" data-show="true">
     ```
   - **Penyebab**: Jika `data-show="true"` hilang, script/CSS bawaan template Acorn (`styles.css`) akan memaksakan selector `#root { opacity: 0; }` sehingga layar menjadi blank putih total.
2. **Format Response API**:
   - Controller CRUD Laravel mengembalikan JSON array langsung (tanpa nested wrapper kompleks berlebihan).
   - Alias endpoint penting: `/api/daily-progress`, scopes tercatat sebagai `construction`.
3. **Proses Background Mandiri**:
   - Selalu jalankan service dengan script `/home/neixcyll/pcm-dashboard/run_services.sh` yang menggunakan `setsid` agar daemon MariaDB dan Laravel tidak mati saat subshell/terminal terputus.
