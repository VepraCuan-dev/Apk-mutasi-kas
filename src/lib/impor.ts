import type Database from "better-sqlite3";
import crypto from "node:crypto";
import { cariParser } from "./parser";
import type { Berkas, HasilUrai, TransaksiUrai } from "./parser/tipe";

const sha = (s: string | Buffer) => crypto.createHash("sha256").update(s).digest("hex");

/**
 * Sidik jari tiap transaksi = tanggal + arah + nominal + deskripsi + urutan ke-n
 * di antara transaksi yang persis sama pada hari itu. Dengan begitu:
 * - file yang sama (atau file dengan periode tumpang tindih) tidak menggandakan data;
 * - dua transaksi yang memang kembar di hari yang sama tetap tercatat dua-duanya.
 */
export function sidikJari(transaksi: TransaksiUrai[]): string[] {
  const hitung = new Map<string, number>();
  return transaksi.map((t) => {
    const dasar = [t.tanggal, t.arah, t.nominal, t.deskripsi.toLowerCase().replace(/\s+/g, " ").trim()].join("|");
    const n = hitung.get(dasar) ?? 0;
    hitung.set(dasar, n + 1);
    return sha(dasar + "|" + n);
  });
}

export type Pratinjau = {
  parser: { id: string; nama: string };
  hasil: HasilUrai;
  ganda: boolean[]; // sejajar dengan hasil.transaksi
  jumlahBaru: number;
  jumlahGanda: number;
  filePernahDiimpor: string | null; // waktu impor sebelumnya
  akunKosong: boolean;
  nomorCocok: boolean | null; // null = tidak bisa dibandingkan
};

export function pratinjauImpor(d: Database.Database, akunId: number, berkas: Berkas): Pratinjau {
  const akun = d.prepare("SELECT nomor FROM akun WHERE id = ?").get(akunId) as { nomor: string } | undefined;
  if (!akun) throw new Error("Akun tidak ditemukan.");
  const parser = cariParser(berkas);
  if (!parser) {
    throw new Error("Format file ini belum dikenali. Saat ini yang didukung: CSV mutasi BCA dari KlikBCA.");
  }
  const hasil = parser.urai(berkas);
  const jari = sidikJari(hasil.transaksi);
  const ada = d.prepare("SELECT 1 FROM transaksi WHERE akun_id = ? AND sidik_jari = ?");
  const ganda = jari.map((j) => !!ada.get(akunId, j));
  const jumlahGanda = ganda.filter(Boolean).length;
  const lama = d
    .prepare("SELECT waktu FROM impor WHERE akun_id = ? AND hash_file = ? ORDER BY id DESC")
    .get(akunId, sha(berkas.isi)) as { waktu: string } | undefined;
  const { n } = d.prepare("SELECT COUNT(*) n FROM transaksi WHERE akun_id = ?").get(akunId) as { n: number };
  const digit = akun.nomor.replace(/\D/g, "");
  return {
    parser: { id: parser.id, nama: parser.nama },
    hasil,
    ganda,
    jumlahBaru: ganda.length - jumlahGanda,
    jumlahGanda,
    filePernahDiimpor: lama?.waktu ?? null,
    akunKosong: n === 0,
    nomorCocok: digit && hasil.nomorRekening ? digit === hasil.nomorRekening : null,
  };
}

export function simpanImpor(
  d: Database.Database,
  akunId: number,
  berkas: Berkas,
  opsi: { pakaiSaldoAwal?: boolean } = {},
): { jumlahBaru: number; jumlahGanda: number } {
  const p = pratinjauImpor(d, akunId, berkas);
  const jari = sidikJari(p.hasil.transaksi);
  return d.transaction(() => {
    const impor = d
      .prepare(
        "INSERT INTO impor (akun_id, nama_file, hash_file, parser, jumlah_baris, jumlah_baru, jumlah_ganda) VALUES (?, ?, ?, ?, ?, 0, 0)",
      )
      .run(akunId, berkas.nama, sha(berkas.isi), p.parser.id, p.hasil.transaksi.length);
    const tambah = d.prepare(
      `INSERT OR IGNORE INTO transaksi (akun_id, tanggal, deskripsi, nominal, arah, saldo_setelah, sumber, impor_id, sidik_jari)
       VALUES (?, ?, ?, ?, ?, ?, 'impor', ?, ?)`,
    );
    let baru = 0;
    p.hasil.transaksi.forEach((t, i) => {
      baru += tambah.run(
        akunId, t.tanggal, t.deskripsi, t.nominal, t.arah, t.saldoSetelah ?? null, impor.lastInsertRowid, jari[i],
      ).changes;
    });
    const gandaN = p.hasil.transaksi.length - baru;
    d.prepare("UPDATE impor SET jumlah_baru = ?, jumlah_ganda = ? WHERE id = ?").run(baru, gandaN, impor.lastInsertRowid);
    if (opsi.pakaiSaldoAwal && p.akunKosong && p.hasil.saldoAwal !== undefined) {
      d.prepare("UPDATE akun SET saldo_awal = ? WHERE id = ?").run(p.hasil.saldoAwal, akunId);
    }
    return { jumlahBaru: baru, jumlahGanda: gandaN };
  })();
}
