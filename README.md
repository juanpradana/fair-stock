# Fair Stock

Kalkulator harga wajar saham berbasis _Adimology_ yang berjalan 100% di sisi klien (static site + PWA). Aplikasi ini membantu menghitung power, fraksi harga, dan target harga berdasarkan data _order book_ harian.

## Fitur

- **Input order harian**  
  Tanggal, emiten, broker summary, dan ringkasan _order book_ (bid, offer, total bid/offer).
- **Perhitungan otomatis**  
  Menghitung:
  - Total Bid + Offer (L)
  - Avg Bid Offer (S)
  - Power (T)
  - Total Fraksi (R) beserta komponen M, N, O, P, Q
  - Target harga (Target 5%, Realistis Low, Realistis High)
- **Riwayat lokal**  
  Tiap _submit_ akan disimpan ke `localStorage` dan bisa dihapus kapan saja.
- **Tema gelap & terang**  
  Tema modern _blue–purple crypto-glass_. Default tema mengikuti jam lokal (malam → dark, siang → light) dan bisa di-toggle manual.
- **PWA (Progressive Web App)**  
  - `manifest.webmanifest`
  - `service-worker.js` dengan cache sederhana untuk offline basic
  - Ikon 192px & 512px untuk _installable app_
- **Static site**  
  Hanya membutuhkan HTTP server biasa (nginx, Apache, atau `http-server`) tanpa backend.

## Struktur Proyek

```text
fair-stock/
├─ index.html            # UI utama + styling inline
├─ main.js               # Logika perhitungan, riwayat, tema, PWA
├─ manifest.webmanifest  # PWA manifest
├─ service-worker.js     # Service worker untuk cache
└─ icons/
   ├─ icon-192.png
   └─ icon-512.png
```

## Teknologi

- HTML, CSS (custom, tanpa framework)
- JavaScript murni (tanpa bundler, tanpa framework)
- `localStorage` untuk riwayat
- PWA (Web App Manifest + Service Worker)

## Menjalankan Secara Lokal

1. **Klon repo**
   ```bash
   git clone https://github.com/USERNAME/fair-stock.git
   cd fair-stock
   ```

2. **Jalankan dengan static server** (disarankan, supaya PWA & service worker berfungsi):

   - Menggunakan `npx serve`:
     ```bash
     npx serve .
     ```

   - Atau `http-server`:
     ```bash
     npx http-server .
     ```

3. Buka di browser:
   - Biasanya `http://localhost:3000` atau `http://localhost:8080` tergantung tool.

> Catatan: Buka lewat `file://` (double click `index.html`) **tidak** direkomendasikan karena service worker tidak aktif di _file protocol_.

## Deploy sebagai Static Site

Karena ini murni static site, bisa dideploy ke mana saja yang bisa menyajikan file HTML/JS/CSS:

- VPS dengan nginx / Apache
- GitHub Pages / Netlify / Vercel (mode static)

Contoh konsep deploy (umum):

1. **Build**: Tidak ada proses build, cukup upload seluruh isi folder (`index.html`, `main.js`, `manifest.webmanifest`, `service-worker.js`, `icons/`).
2. **Konfigurasi server**: Pastikan dokumen root diarahkan ke folder ini dan `index.html` jadi default.
3. **MIME type**: Pastikan server menyajikan:
   - `index.html` sebagai `text/html`
   - `main.js` sebagai `application/javascript`
   - `manifest.webmanifest` sebagai `application/manifest+json` atau `application/json`
4. **HTTPS** (disarankan): PWA memerlukan _secure context_ (HTTPS) di produksi.

Pada lingkungan produksi penulis, proyek ini dijalankan sebagai static site di VPS Ubuntu dengan nginx di subdomain `fair-stock.farzani.space`.

## PWA & Cache

- Service worker menyimpan aset dasar (`/`, `index.html`, `main.js`, `manifest.webmanifest`) ke cache.
- Jika ada perubahan besar pada aset, disarankan mengubah `CACHE_NAME` di `service-worker.js` agar cache lama tidak dipakai.

## Lisensi

Tambahkan informasi lisensi di sini (misalnya MIT) sesuai kebutuhan Anda.
