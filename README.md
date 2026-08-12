# Taskflow — Kelola Pekerjaan

Aplikasi manajemen pekerjaan ala Notion: tugas utama & side project, deadline, Gantt chart, dan pengingat harian via Web Push (PWA), Telegram, dan Discord.

## Fitur

- **Multi-user** — daftar & masuk dengan email/password.
- **Tugas** — judul, deskripsi, prioritas, tag, status, tanggal mulai & deadline.
  - **Pekerjaan utama** → wajib tahu **sumber kerja / pemberi tugas** (klien).
  - **Side job / proyekan** → masuk ke proyek dengan warna masing-masing.
- **Tugas berulang 🔁** — satu template yang menghasilkan tugas otomatis:
  - **Harian** (jam tertentu) atau **Mingguan** (pilih hari Sen–Min);
  - **Cron custom** (mis. `0 8 * * *`) dengan pratinjau tanggal berikutnya;
  - atur **mulai & selesai pengulangan** (tanpa selesai = berulang selamanya);
  - instance dibuat otomatis (scheduler tiap 15 menit + segera saat dibuat), bisa dicentang selesai per hari, muncul di Gantt & pengingat harian; template bisa dijeda/aktifkan.
- **Gantt chart** — timeline visual (1 minggu / 2 minggu / 1 bulan / 3 bulan), garis "hari ini", zoom & scroll otomatis ke hari ini.
- **Dashboard** — ringkasan hari ini, terlambat, 7 hari ke depan, proyek aktif.
- **Pengingat harian** — setiap hari di jam & zona waktu pilihan:
  - tugas hari ini + yang belum selesai kemarin;
  - kalau semua beres → ingatkan tugas besok;
  - dikirim ke channel yang aktif (Web Push / Telegram / Discord).
- **PWA** — bisa dipasang di HP (installable, offline shell, push notification).
- **CRUD lengkap** — tugas, sumber kerja, proyek, pengaturan.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL 18 · NextAuth v5 (credentials) · web-push · node-cron · Luxon

## Menjalankan

### Docker Compose (produksi lokal)

```bash
cp .env.example .env   # isi AUTH_SECRET, VAPID keys, dll
docker compose up -d --build
```

- App: `http://localhost:3004`
- PostgreSQL: `localhost:5434` (user/pass/db `taskflow`/`taskflow_secret`/`taskflow`)
- `migrate` service menjalankan migrasi DB otomatis sekali.

### Development

```bash
npm install
# butuh PostgreSQL berjalan; set DATABASE_URL di .env
npm run db:migrate
npm run dev
```

## Environment

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL |
| `AUTH_SECRET` | Secret NextAuth (`openssl rand -base64 32`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Kunci web push (server) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Sama dengan `VAPID_PUBLIC_KEY` (build arg) |
| `NEXT_PUBLIC_APP_URL` | URL publik (build arg) |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram (opsional, shared untuk semua user) |
| `VAPID_SUBJECT` | Email kontak untuk push (`mailto:...`) |
| `SCHEDULER_ENABLED` | Aktifkan pengingat harian (`true`/`false`) |

Generate kunci VAPID:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

## Pengingat Harian

Scheduler (`src/lib/scheduler.ts`) jalan di dalam proses app (cek tiap menit). Untuk tiap user yang mengaktifkan pengingat:
1. jam lokal user == `remind_time` → bangun pesan ringkasan;
2. kirim ke channel aktif (push/telegram/discord);
3. catat di `reminder_logs` (anti dobel kirim per hari).

## Deploy ke Coolify

1. Push repo ke GitHub.
2. Coolify → **New Application** → pilih repo → **Dockerfile** build pack.
3. Tambah resource **PostgreSQL**, ambil koneksinya sebagai `DATABASE_URL` (atau pakai compose dengan service db sendiri, sesuaikan).
4. Isi env & build args (lihat tabel di atas), pastikan `AUTH_TRUST_HOST=true`.
5. Deploy — migrasi dijalankan dengan perintah `node migrate.mjs` di service `migrate` (atau manual sekali via terminal container).

## Struktur

```
src/
  app/          # halaman & API routes
  components/   # UI client (TaskForm, GanttChart, Settings, dll)
  lib/          # db, auth, schema, push, channels, reminders, scheduler
  types/        # deklarasi tipe next-auth
scripts/        # generator icon
drizzle/        # migrasi SQL (drizzle-kit)
```
