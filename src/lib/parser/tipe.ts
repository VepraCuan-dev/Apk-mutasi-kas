/**
 * Kontrak parser. Setiap bank/e-wallet = satu file yang mengekspor satu Parser,
 * lalu didaftarkan di index.ts. Sumber data lain (misalnya agregator berizin
 * di tahap 2) cukup menghasilkan HasilUrai yang sama.
 */

export type Berkas = { nama: string; isi: Buffer };

export type TransaksiUrai = {
  tanggal: string; // YYYY-MM-DD
  deskripsi: string;
  nominal: number; // sen, selalu positif
  arah: "masuk" | "keluar";
  saldoSetelah?: number | null; // sen
};

export type HasilUrai = {
  transaksi: TransaksiUrai[];
  nomorRekening?: string;
  periode?: { dari: string; sampai: string };
  saldoAwal?: number;
  saldoAkhir?: number;
  peringatan: string[];
};

export interface Parser {
  id: string;
  nama: string;
  /** Benar jika file ini tampaknya berformat parser ini. */
  deteksi(berkas: Berkas): boolean;
  /** Melempar Error berbahasa Indonesia kalau file tidak bisa dibaca. */
  urai(berkas: Berkas): HasilUrai;
}
