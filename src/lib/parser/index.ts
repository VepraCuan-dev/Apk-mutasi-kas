import { bcaCsv } from "./bca-csv";
import type { Berkas, Parser } from "./tipe";

/** Untuk menambah bank baru: buat file parser, lalu tambahkan di daftar ini. */
export const daftarParser: Parser[] = [bcaCsv];

export function cariParser(berkas: Berkas, id?: string): Parser | undefined {
  if (id) return daftarParser.find((p) => p.id === id);
  return daftarParser.find((p) => p.deteksi(berkas));
}
