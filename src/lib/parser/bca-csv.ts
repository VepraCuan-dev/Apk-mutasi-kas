import { uraiNominal } from "../format";
import { bacaCsv } from "./csv";
import type { Berkas, HasilUrai, Parser, TransaksiUrai } from "./tipe";

/**
 * Mutasi rekening BCA berformat CSV (unduhan KlikBCA). Bentuk umumnya:
 *
 *   No. rekening,=,'1234567890
 *   Periode,=,01/10/2026 - 31/10/2026
 *   Tanggal Transaksi,Keterangan,Cabang,Jumlah,,Saldo
 *   '01/10,TRSF E-BANKING CR ...,'0000,1500000.00,CR,6500000.00
 *   Saldo Awal,=,5000000.00
 *   Saldo Akhir,=,6500000.00
 *
 * Tanggal tidak memuat tahun, jadi tahun diambil dari baris Periode.
 * Parser ini sengaja longgar: DB/CR boleh di kolom sendiri atau menempel
 * di belakang jumlah, dan angka boleh memakai pemisah ribuan.
 */

const bersih = (s: string) => s.replace(/^'+/, "").trim();
const iso = (t: number, b: number, h: number) =>
  `${t}-${String(b).padStart(2, "0")}-${String(h).padStart(2, "0")}`;

function nilaiMeta(baris: string[]): string {
  const isi = baris.slice(1).map(bersih).filter((s) => s && s !== "=" && s !== ":");
  return isi.join(" ");
}

function urai(berkas: Berkas): HasilUrai {
  const teks = berkas.isi.toString("utf8");
  const pemisah = (teks.match(/;/g)?.length ?? 0) > (teks.match(/,/g)?.length ?? 0) ? ";" : ",";
  const baris = bacaCsv(teks, pemisah);
  const hasil: HasilUrai = { transaksi: [], peringatan: [] };

  const iHeader = baris.findIndex(
    (b) => b.some((s) => /tanggal/i.test(s)) && b.some((s) => /keterangan/i.test(s)),
  );
  if (iHeader < 0) {
    throw new Error(
      "Baris judul kolom (Tanggal Transaksi, Keterangan, ...) tidak ditemukan. Pastikan ini file CSV mutasi dari KlikBCA.",
    );
  }

  let totalDebet: number | undefined;
  let totalKredit: number | undefined;
  for (const b of baris) {
    const kunci = (b[0] ?? "").toLowerCase();
    if (/^no\.?\s*rek/.test(kunci)) hasil.nomorRekening = nilaiMeta(b).replace(/\D/g, "");
    else if (kunci.startsWith("periode")) {
      const m = [...nilaiMeta(b).matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
      if (m.length >= 2) {
        hasil.periode = {
          dari: iso(+m[0][3], +m[0][2], +m[0][1]),
          sampai: iso(+m[1][3], +m[1][2], +m[1][1]),
        };
      }
    } else if (kunci.startsWith("saldo awal")) hasil.saldoAwal = uraiNominal(nilaiMeta(b)) ?? undefined;
    else if (kunci.startsWith("saldo akhir")) hasil.saldoAkhir = uraiNominal(nilaiMeta(b)) ?? undefined;
    else if (kunci.startsWith("mutasi deb")) totalDebet = uraiNominal(nilaiMeta(b)) ?? undefined;
    else if (kunci.startsWith("mutasi kre")) totalKredit = uraiNominal(nilaiMeta(b)) ?? undefined;
  }

  const header = baris[iHeader].map((s) => s.toLowerCase());
  const kTanggal = header.findIndex((s) => s.includes("tanggal"));
  const kKet = header.findIndex((s) => s.includes("keterangan"));
  const kJumlah = header.findIndex((s) => s.includes("jumlah"));
  const kSaldo = header.findIndex((s) => s.includes("saldo"));
  if (kJumlah < 0) throw new Error("Kolom Jumlah tidak ditemukan di file ini.");

  let tertunda = 0;
  for (let i = iHeader + 1; i < baris.length; i++) {
    const b = baris[i];
    const tgl = bersih(b[kTanggal] ?? "");
    if (!tgl) continue;
    if (/^pend/i.test(tgl)) { tertunda++; continue; }
    const m = tgl.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) continue; // baris ringkasan (Saldo Awal, dst.) atau baris lain

    const hari = +m[1];
    const bulan = +m[2];
    let tahun: number;
    if (m[3]) tahun = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    else if (hasil.periode) {
      // Periode bisa melewati pergantian tahun (Des - Jan).
      const tDari = +hasil.periode.dari.slice(0, 4);
      const tSampai = +hasil.periode.sampai.slice(0, 4);
      tahun = tDari;
      if (tDari !== tSampai && iso(tDari, bulan, hari) < hasil.periode.dari) tahun = tSampai;
    } else {
      throw new Error(
        "Tanggal di file tidak memuat tahun dan baris Periode tidak ditemukan, jadi tahun transaksi tidak bisa ditentukan.",
      );
    }

    const selJumlah = b[kJumlah] ?? "";
    const tanda = (selJumlah + " " + (b[kJumlah + 1] ?? "")).match(/\b(DB|CR)\b/i)?.[1]?.toUpperCase();
    const nominal = uraiNominal(selJumlah);
    if (nominal === null || !tanda) {
      hasil.peringatan.push(`Baris ${i + 1} dilewati karena jumlah atau tanda DB/CR tidak terbaca.`);
      continue;
    }
    const t: TransaksiUrai = {
      tanggal: iso(tahun, bulan, hari),
      deskripsi: (b[kKet] ?? "").replace(/\s+/g, " ").trim(),
      nominal: Math.abs(nominal),
      arah: tanda === "CR" ? "masuk" : "keluar",
      saldoSetelah: kSaldo >= 0 ? uraiNominal(b[kSaldo] ?? "") : null,
    };
    hasil.transaksi.push(t);
  }

  if (tertunda) {
    hasil.peringatan.push(
      `${tertunda} transaksi berstatus PEND (belum dibukukan bank) dilewati. Impor ulang nanti setelah tanggalnya muncul.`,
    );
  }
  const jumlah = (arah: string) =>
    hasil.transaksi.filter((t) => t.arah === arah).reduce((a, t) => a + t.nominal, 0);
  if (!tertunda) {
    if (totalDebet !== undefined && totalDebet !== jumlah("keluar"))
      hasil.peringatan.push("Total debet yang terbaca tidak sama dengan Mutasi Debet di file. Periksa hasilnya.");
    if (totalKredit !== undefined && totalKredit !== jumlah("masuk"))
      hasil.peringatan.push("Total kredit yang terbaca tidak sama dengan Mutasi Kredit di file. Periksa hasilnya.");
  }
  if (!hasil.transaksi.length) throw new Error("Tidak ada transaksi yang terbaca dari file ini.");
  return hasil;
}

export const bcaCsv: Parser = {
  id: "bca-csv",
  nama: "BCA (CSV KlikBCA)",
  deteksi(berkas) {
    if (!/\.(csv|txt)$/i.test(berkas.nama)) return false;
    const awal = berkas.isi.subarray(0, 4000).toString("utf8");
    return /tanggal transaksi/i.test(awal) && /keterangan/i.test(awal) && /cabang/i.test(awal);
  },
  urai,
};
