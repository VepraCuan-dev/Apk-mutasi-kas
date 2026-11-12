import { db } from "./db";
import { geserBulan } from "./format";

export type Akun = {
  id: number; nama: string; jenis: "bank" | "ewallet" | "tunai"; lembaga: string; nomor: string;
  milik: "bisnis" | "pribadi"; saldo_awal: number; saldo: number; jumlah_transaksi: number;
};
export type Kategori = { id: number; nama: string; jenis: "pemasukan" | "pengeluaran" | "transfer" };
export type Transaksi = {
  id: number; akun_id: number; akun_nama: string; tanggal: string; deskripsi: string; nominal: number;
  arah: "masuk" | "keluar"; kategori_id: number | null; sumber: "impor" | "manual"; catatan: string;
};

export function daftarAkun(): Akun[] {
  return db()
    .prepare(
      `SELECT a.*, COUNT(t.id) AS jumlah_transaksi,
              a.saldo_awal + COALESCE(SUM(CASE t.arah WHEN 'masuk' THEN t.nominal ELSE -t.nominal END), 0) AS saldo
       FROM akun a LEFT JOIN transaksi t ON t.akun_id = a.id
       GROUP BY a.id ORDER BY a.nama`,
    )
    .all() as Akun[];
}

export function daftarKategori(): Kategori[] {
  return db()
    .prepare("SELECT * FROM kategori ORDER BY CASE jenis WHEN 'pemasukan' THEN 0 WHEN 'pengeluaran' THEN 1 ELSE 2 END, id")
    .all() as Kategori[];
}

export type Saring = {
  akun?: number; kategori?: number | "kosong"; dari?: string; sampai?: string; q?: string; arah?: "masuk" | "keluar";
};

function syarat(s: Saring): { sql: string; nilai: (string | number)[] } {
  const w: string[] = [];
  const v: (string | number)[] = [];
  if (s.akun) { w.push("t.akun_id = ?"); v.push(s.akun); }
  if (s.kategori === "kosong") w.push("t.kategori_id IS NULL");
  else if (s.kategori) { w.push("t.kategori_id = ?"); v.push(s.kategori); }
  if (s.dari) { w.push("t.tanggal >= ?"); v.push(s.dari); }
  if (s.sampai) { w.push("t.tanggal <= ?"); v.push(s.sampai); }
  if (s.arah) { w.push("t.arah = ?"); v.push(s.arah); }
  if (s.q) {
    w.push("(t.deskripsi LIKE ? ESCAPE '\\' OR t.catatan LIKE ? ESCAPE '\\')");
    const pola = "%" + s.q.replace(/[\\%_]/g, "\\$&") + "%";
    v.push(pola, pola);
  }
  return { sql: w.length ? "WHERE " + w.join(" AND ") : "", nilai: v };
}

// Transfer antar akun sendiri tidak dihitung sebagai pemasukan/pengeluaran.
const BUKAN_TRANSFER = "(k.jenis IS NULL OR k.jenis <> 'transfer')";

export function cariTransaksi(s: Saring, halaman: number, perHalaman = 50) {
  const { sql, nilai } = syarat(s);
  const dari = "FROM transaksi t JOIN akun a ON a.id = t.akun_id LEFT JOIN kategori k ON k.id = t.kategori_id";
  const ringkas = db()
    .prepare(
      `SELECT COUNT(*) AS jumlah,
              COALESCE(SUM(CASE WHEN t.arah = 'masuk' AND ${BUKAN_TRANSFER} THEN t.nominal END), 0) AS masuk,
              COALESCE(SUM(CASE WHEN t.arah = 'keluar' AND ${BUKAN_TRANSFER} THEN t.nominal END), 0) AS keluar
       ${dari} ${sql}`,
    )
    .get(...nilai) as { jumlah: number; masuk: number; keluar: number };
  const baris = db()
    .prepare(
      `SELECT t.id, t.akun_id, a.nama AS akun_nama, t.tanggal, t.deskripsi, t.nominal, t.arah, t.kategori_id, t.sumber, t.catatan
       ${dari} ${sql} ORDER BY t.tanggal DESC, t.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...nilai, perHalaman, (halaman - 1) * perHalaman) as Transaksi[];
  return { ...ringkas, baris, jumlahHalaman: Math.max(1, Math.ceil(ringkas.jumlah / perHalaman)) };
}

export type ArusBulan = { bulan: string; masuk: number; keluar: number };

/** Pemasukan dan pengeluaran per bulan untuk n bulan yang berakhir di `sampai` (YYYY-MM). */
export function arusKasBulanan(sampai: string, n = 6): ArusBulan[] {
  const mulai = geserBulan(sampai, -(n - 1));
  const baris = db()
    .prepare(
      `SELECT substr(t.tanggal, 1, 7) AS bulan,
              COALESCE(SUM(CASE WHEN t.arah = 'masuk' THEN t.nominal END), 0) AS masuk,
              COALESCE(SUM(CASE WHEN t.arah = 'keluar' THEN t.nominal END), 0) AS keluar
       FROM transaksi t LEFT JOIN kategori k ON k.id = t.kategori_id
       WHERE ${BUKAN_TRANSFER} AND substr(t.tanggal, 1, 7) BETWEEN ? AND ?
       GROUP BY 1`,
    )
    .all(mulai, sampai) as ArusBulan[];
  const peta = new Map(baris.map((b) => [b.bulan, b]));
  return Array.from({ length: n }, (_, i) => {
    const bulan = geserBulan(mulai, i);
    return peta.get(bulan) ?? { bulan, masuk: 0, keluar: 0 };
  });
}

export function bulanTerakhirBerdata(): string | null {
  const r = db().prepare("SELECT MAX(substr(tanggal, 1, 7)) AS b FROM transaksi").get() as { b: string | null };
  return r.b;
}
