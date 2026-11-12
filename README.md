# Rekap Mutasi Kas

Aplikasi web pribadi untuk menggabungkan mutasi semua rekening bank dan e-wallet bisnis dalam satu dashboard. Data disimpan di komputer Anda sendiri (file `data/mutasi.db`), bukan di server pihak ketiga. Aplikasi tidak pernah meminta username atau password internet banking.

## Cara menjalankan

Perlu [Node.js](https://nodejs.org) versi 20 atau lebih baru.

```bash
npm install        # sekali saja
npm run build      # setiap kali kode berubah
npm start
```

Buka http://localhost:3000. Pada pembukaan pertama Anda diminta membuat password aplikasi.

Untuk membuka dari HP: sambungkan HP ke Wi-Fi yang sama dengan laptop, lalu buka `http://ALAMAT-IP-LAPTOP:3000`.

Saat mengubah kode, pakai `npm run dev`. Tes otomatis: `npm test`.

## Yang sudah ada (langkah 1-3)

- Login dengan satu password (yang disimpan hanya hash-nya).
- Akun: bank, e-wallet, atau tunai, dengan tanda bisnis/pribadi dan saldo awal.
- Impor CSV mutasi BCA (KlikBCA) dengan pratinjau sebelum disimpan. Contoh file: `contoh/bca-contoh.csv`.
- Pencegahan transaksi ganda: file yang sama atau file dengan periode tumpang tindih tidak menggandakan data.
- Input transaksi manual.
- Daftar transaksi gabungan dengan pencarian dan saringan akun, kategori, arah, dan tanggal.
- Dashboard: total saldo, saldo per akun, pemasukan dan pengeluaran per bulan, grafik arus kas 6 bulan.
- Transaksi berkategori "Transfer antar akun sendiri" tidak dihitung sebagai pemasukan atau pengeluaran.

## Struktur database

| Tabel | Isi |
|---|---|
| `akun` | Rekening/e-wallet/tunai, tanda bisnis atau pribadi, saldo awal |
| `transaksi` | Tanggal, keterangan, nominal, arah, akun, kategori, sumber (impor/manual), sidik jari anti-ganda |
| `impor` | Riwayat file yang diimpor |
| `kategori` | Kategori pemasukan, pengeluaran, dan transfer |
| `pengaturan`, `sesi` | Hash password dan sesi login |

Semua nominal disimpan sebagai bilangan bulat dalam sen (Rp 1 = 100) supaya tidak ada selisih pembulatan.

## Menambah parser bank baru

1. Buat file di `src/lib/parser/` yang mengekspor objek `Parser` (lihat `tipe.ts` dan `bca-csv.ts`).
2. Daftarkan di `src/lib/parser/index.ts`.

Sumber data lain, misalnya agregator berizin di tahap 2, cukup menghasilkan `HasilUrai` yang sama lalu memakai `simpanImpor`.

## Cadangan data

Seluruh data ada di folder `data/`. Salin folder itu untuk membuat cadangan.
