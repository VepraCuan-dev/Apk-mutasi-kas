import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Semua data disimpan di satu file SQLite di komputer ini (bawaan: data/mutasi.db).
 * Semua nominal uang disimpan sebagai bilangan bulat dalam SEN (Rp 1 = 100),
 * supaya tidak ada selisih pembulatan.
 */

const SKEMA = `
CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesi (
  token_hash TEXT PRIMARY KEY,
  kedaluwarsa INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS akun (
  id INTEGER PRIMARY KEY,
  nama TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('bank','ewallet','tunai')),
  lembaga TEXT NOT NULL DEFAULT '',
  nomor TEXT NOT NULL DEFAULT '',
  milik TEXT NOT NULL DEFAULT 'bisnis' CHECK (milik IN ('bisnis','pribadi')),
  saldo_awal INTEGER NOT NULL DEFAULT 0,
  dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kategori (
  id INTEGER PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  jenis TEXT NOT NULL CHECK (jenis IN ('pemasukan','pengeluaran','transfer'))
);

CREATE TABLE IF NOT EXISTS impor (
  id INTEGER PRIMARY KEY,
  akun_id INTEGER NOT NULL REFERENCES akun(id),
  nama_file TEXT NOT NULL,
  hash_file TEXT NOT NULL,
  parser TEXT NOT NULL,
  jumlah_baris INTEGER NOT NULL,
  jumlah_baru INTEGER NOT NULL,
  jumlah_ganda INTEGER NOT NULL,
  waktu TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transaksi (
  id INTEGER PRIMARY KEY,
  akun_id INTEGER NOT NULL REFERENCES akun(id),
  tanggal TEXT NOT NULL,                 -- YYYY-MM-DD
  deskripsi TEXT NOT NULL,
  nominal INTEGER NOT NULL CHECK (nominal >= 0),  -- sen, selalu positif
  arah TEXT NOT NULL CHECK (arah IN ('masuk','keluar')),
  saldo_setelah INTEGER,                 -- saldo menurut file bank, jika ada
  kategori_id INTEGER REFERENCES kategori(id),
  milik TEXT CHECK (milik IN ('bisnis','pribadi')), -- kosong = ikut akun
  sumber TEXT NOT NULL CHECK (sumber IN ('impor','manual')),
  impor_id INTEGER REFERENCES impor(id),
  sidik_jari TEXT NOT NULL,              -- untuk mencegah transaksi ganda
  catatan TEXT NOT NULL DEFAULT '',
  dibuat TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (akun_id, sidik_jari)
);

CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi (tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_akun ON transaksi (akun_id, tanggal);
`;

const KATEGORI_AWAL: [string, string][] = [
  ["Penjualan", "pemasukan"],
  ["Pemasukan lain", "pemasukan"],
  ["Bahan baku", "pengeluaran"],
  ["Iklan", "pengeluaran"],
  ["Gaji", "pengeluaran"],
  ["Operasional", "pengeluaran"],
  ["Biaya admin & transfer", "pengeluaran"],
  ["Pengeluaran lain", "pengeluaran"],
  ["Transfer antar akun sendiri", "transfer"],
];

const g = globalThis as unknown as { __dbMutasi?: Database.Database };

export function bukaDb(lokasi: string): Database.Database {
  if (lokasi !== ":memory:") fs.mkdirSync(path.dirname(lokasi), { recursive: true });
  const d = new Database(lokasi);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SKEMA);
  const tambah = d.prepare("INSERT OR IGNORE INTO kategori (nama, jenis) VALUES (?, ?)");
  for (const [nama, jenis] of KATEGORI_AWAL) tambah.run(nama, jenis);
  return d;
}

export function db(): Database.Database {
  if (!g.__dbMutasi) {
    g.__dbMutasi = bukaDb(process.env.DB_PATH ?? path.join(process.cwd(), "data", "mutasi.db"));
  }
  return g.__dbMutasi;
}
