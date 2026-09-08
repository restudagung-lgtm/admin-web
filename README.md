# Lapak Alun-Alun — 3 Web Terpisah, 1 Data

Sekarang ada 3 folder berdiri sendiri:

- **`pembeli/`** — web untuk pelanggan scan QR, pilih toko, pilih menu, bayar, lihat struk & status.
- **`penjual/`** — web dashboard untuk pedagang: login, kelola menu, kelola pesanan, cetak QR.
- **`admin/`** — panel untuk pemilik/pengelola alun-alun: memantau semua toko & pesanan
  lintas penjual, mengatur jumlah meja, dan bisa menghapus toko bermasalah.

Ketiganya **tetap terhubung lewat Firebase** yang sama (bukan lewat kode di frontend),
jadi begitu penjual tambah menu di web-nya, langsung muncul di web pembeli dan kelihatan
di panel admin.

## Alur pemesanan (sesuai yang kamu mau)

1. Pembeli **scan QR** di meja.
2. QR membuka **web pembeli** dengan nomor meja otomatis terisi (`?table=5`).
3. Muncul **daftar nama toko**, terurut dari yang paling dekat ke meja itu.
4. Pembeli **pilih satu toko**.
5. Muncul **daftar menu** dari toko yang dipilih → pilih item & jumlah → bayar → struk.

## Langkah setup (urutannya penting)

### 1. Setup Firebase (sekali saja, dipakai ketiga web)
Sama seperti sebelumnya — buat project Firebase, aktifkan Firestore, ambil config.
Tempel config yang sama persis ke **ketiga** file:
- `pembeli/firebase-config.js`
- `penjual/firebase-config.js`
- `admin/firebase-config.js`

### 2. Deploy web pembeli dulu
1. Upload isi folder `pembeli/` ke hosting pilihanmu (GitHub Pages/Vercel/Netlify),
   sebagai repo/project terpisah dari `penjual/` dan `admin/`.
2. Setelah dapat alamatnya, misal: `https://lapak-pembeli.vercel.app/`
   — catat alamat ini, dipakai di langkah 5.

### 3. Deploy web penjual
1. Upload isi folder `penjual/` ke hosting (repo/project terpisah lagi).
2. Setelah dapat alamatnya, misal: `https://lapak-penjual.vercel.app/`
   — catat alamat ini juga.

### 4. Deploy web admin
1. Upload isi folder `admin/` ke hosting (repo/project terpisah lagi).
   Sebaiknya jangan disebar alamatnya ke publik/penjual, cukup untuk kamu sendiri.
2. Buka web admin pertama kali → akan diminta **buat password admin** (sekali saja).
   Simpan baik-baik password ini, karena hanya pemilik alun-alun yang boleh tahu.

### 5. Hubungkan ketiganya lewat site-config.js
1. Buka `penjual/site-config.js`, ganti `BUYER_SITE_URL` dengan alamat web pembeli
   dari langkah 2. Deploy ulang web penjual.
2. Buka `pembeli/site-config.js`, ganti `SELLER_SITE_URL` dengan alamat web penjual
   dari langkah 3. Deploy ulang web pembeli.
3. Buka `admin/site-config.js`, isi `BUYER_SITE_URL` dan `SELLER_SITE_URL` dengan
   alamat keduanya (dipakai untuk tombol tautan cepat di panel admin). Deploy ulang web admin.
4. Login di web penjual → tab **Toko & QR** → klik **Buat QR**.
   QR yang dihasilkan otomatis mengarah ke alamat web pembeli yang benar.

## Kalau pindah hosting lagi nanti

- Data tetap aman di Firebase, tidak peduli file di-hosting di mana.
- Yang perlu diulang cuma: update `site-config.js` di kedua sisi kalau salah satu
  alamatnya berubah, lalu generate ulang QR di web penjual.

## Catatan keamanan

Sama seperti sebelumnya: password penjual dan password admin masih tersimpan polos
di Firestore. Ini cukup untuk uji coba, tapi sebelum dipakai publik sungguhan,
pertimbangkan pindah ke Firebase Authentication dan kunci Firestore Rules —
terutama untuk web **admin**, karena akun ini punya akses paling besar (bisa
menghapus toko mana pun). Jangan sebarkan alamat web admin secara terbuka,
dan jangan gunakan password yang sama dengan akun penjual mana pun.
