import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bukaDb } from "@/lib/db";
import { rupiah, uraiNominal } from "@/lib/format";
import { pratinjauImpor, simpanImpor } from "@/lib/impor";
import { bcaCsv } from "@/lib/parser/bca-csv";

const contoh = {
  nama: "bca-contoh.csv",
  isi: fs.readFileSync(path.join(__dirname, "..", "contoh", "bca-contoh.csv")),
};

describe("uraiNominal", () => {
  it.each([
    ["1500000.00", 150000000],
    ["1,500,000.00", 150000000],
    ["1.500.000,00", 150000000],
    ["1.500.000", 150000000],
    ["1.500", 150000],
    ["1500,5", 150050],
    ["Rp 25.000", 2500000],
    ["1234.56 CR", 123456],
    ["abc", null],
  ])("%s -> %s", (teks, sen) => expect(uraiNominal(teks)).toBe(sen));
  it("format rupiah", () => {
    expect(rupiah(150000000)).toBe("Rp 1.500.000");
    expect(rupiah(-123456)).toBe("-Rp 1.234,56");
  });
});

describe("parser BCA CSV", () => {
  const h = bcaCsv.urai(contoh);
  it("mengenali file", () => expect(bcaCsv.deteksi(contoh)).toBe(true));
  it("membaca semua baris dan metadata", () => {
    expect(h.transaksi).toHaveLength(14);
    expect(h.nomorRekening).toBe("1234567890");
    expect(h.periode).toEqual({ dari: "2026-10-01", sampai: "2026-10-31" });
    expect(h.saldoAwal).toBe(500000000);
    expect(h.saldoAkhir).toBe(646348765);
    expect(h.peringatan).toEqual([]);
    expect(h.transaksi[0]).toMatchObject({ tanggal: "2026-10-01", arah: "masuk", nominal: 150000000 });
    expect(h.transaksi[1]).toMatchObject({ tanggal: "2026-10-02", arah: "keluar", nominal: 75000000 });
  });
  it("saldo awal + mutasi = saldo akhir", () => {
    const akhir = h.transaksi.reduce((s, t) => s + (t.arah === "masuk" ? t.nominal : -t.nominal), h.saldoAwal!);
    expect(akhir).toBe(h.saldoAkhir);
  });
  it("menangani jumlah dengan ribuan dan DB menempel, PEND, serta pergantian tahun", () => {
    const teks = [
      "Periode,=,20/12/2025 - 05/01/2026",
      "Tanggal Transaksi,Keterangan,Cabang,Jumlah,Saldo",
      `'28/12,BELI A,'0000,"50,000.00 DB","950,000.00"`,
      `'02/01,JUAL B,'0000,"75,000.00 CR","1,025,000.00"`,
      `'PEND,JUAL C,'0000,"10,000.00 CR","1,035,000.00"`,
    ].join("\r\n");
    const r = bcaCsv.urai({ nama: "x.csv", isi: Buffer.from(teks) });
    expect(r.transaksi.map((t) => [t.tanggal, t.arah, t.nominal, t.saldoSetelah])).toEqual([
      ["2025-12-28", "keluar", 5000000, 95000000],
      ["2026-01-02", "masuk", 7500000, 102500000],
    ]);
    expect(r.peringatan).toHaveLength(1);
  });
  it("menolak file yang bukan mutasi BCA", () => {
    expect(() => bcaCsv.urai({ nama: "x.csv", isi: Buffer.from("a,b\n1,2") })).toThrow();
  });
});

describe("impor dan pencegahan transaksi ganda", () => {
  const d = bukaDb(":memory:");
  const akun = Number(
    d.prepare("INSERT INTO akun (nama, jenis, nomor) VALUES ('BCA', 'bank', '123-456-7890')").run().lastInsertRowid,
  );
  const jumlah = () => (d.prepare("SELECT COUNT(*) n FROM transaksi").get() as { n: number }).n;

  it("impor pertama menyimpan semua, termasuk dua transaksi kembar di hari yang sama", () => {
    const p = pratinjauImpor(d, akun, contoh);
    expect(p).toMatchObject({ jumlahBaru: 14, jumlahGanda: 0, akunKosong: true, nomorCocok: true });
    expect(simpanImpor(d, akun, contoh, { pakaiSaldoAwal: true })).toEqual({ jumlahBaru: 14, jumlahGanda: 0 });
    expect(jumlah()).toBe(14);
    const s = d.prepare("SELECT saldo_awal FROM akun WHERE id = ?").get(akun) as { saldo_awal: number };
    expect(s.saldo_awal).toBe(500000000);
  });
  it("impor file yang sama lagi tidak menambah apa pun", () => {
    const p = pratinjauImpor(d, akun, contoh);
    expect(p.jumlahBaru).toBe(0);
    expect(p.filePernahDiimpor).not.toBeNull();
    expect(simpanImpor(d, akun, contoh)).toEqual({ jumlahBaru: 0, jumlahGanda: 14 });
    expect(jumlah()).toBe(14);
  });
  it("file dengan periode tumpang tindih hanya menambah yang baru", () => {
    const teks = [
      "Periode,=,25/10/2026 - 02/11/2026",
      "Tanggal Transaksi,Keterangan,Cabang,Jumlah,,Saldo",
      "'25/10,TRSF E-BANKING CR 2510/FTSCY/WS95051 980000.00 PEMBELI TIGA,'0000,980000.00,CR,6462500.00",
      "'31/10,BUNGA,'0000,1234.56,CR,6463734.56",
      "'31/10,PAJAK BUNGA,'0000,246.91,DB,6463487.65",
      "'02/11,KR OTOMATIS QRIS 00123 TOKO CONTOH,'0000,125000.00,CR,6588487.65",
    ].join("\n");
    const berkas = { nama: "tumpang.csv", isi: Buffer.from(teks) };
    expect(simpanImpor(d, akun, berkas)).toEqual({ jumlahBaru: 1, jumlahGanda: 3 });
    expect(jumlah()).toBe(15);
  });
});
