"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import {
  bolehCobaMasuk, buatSesi, catatBerhasilMasuk, catatGagalMasuk, cekPassword, hapusSesi,
  simpanPassword, sudahAdaPassword, wajibMasuk,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { tanggalSah, uraiNominal } from "@/lib/format";
import { pratinjauImpor, simpanImpor, type Pratinjau } from "@/lib/impor";

export type Pesan = { galat?: string; sukses?: string } | null;

const teks = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ---------- Login ----------

export async function aksiMasuk(_: Pesan, f: FormData): Promise<Pesan> {
  const password = String(f.get("password") ?? "");
  if (!sudahAdaPassword()) {
    if (password.length < 8) return { galat: "Password minimal 8 karakter." };
    if (password !== String(f.get("ulangi") ?? "")) return { galat: "Kedua password tidak sama." };
    simpanPassword(password);
  } else {
    if (!bolehCobaMasuk()) return { galat: "Terlalu banyak percobaan. Tunggu 30 detik lalu coba lagi." };
    if (!cekPassword(password)) {
      catatGagalMasuk();
      return { galat: "Password salah." };
    }
    catatBerhasilMasuk();
  }
  await buatSesi();
  redirect("/");
}

export async function aksiKeluar() {
  await hapusSesi();
  redirect("/masuk");
}

// ---------- Akun ----------

function bacaAkun(f: FormData) {
  const nama = teks(f, "nama");
  const jenis = teks(f, "jenis");
  const milik = teks(f, "milik");
  const saldoAwal = teks(f, "saldo_awal") ? uraiNominal(teks(f, "saldo_awal")) : 0;
  if (!nama) return { galat: "Nama akun wajib diisi." };
  if (!["bank", "ewallet", "tunai"].includes(jenis)) return { galat: "Jenis akun tidak sah." };
  if (!["bisnis", "pribadi"].includes(milik)) return { galat: "Pilih bisnis atau pribadi." };
  if (saldoAwal === null) return { galat: "Saldo awal harus berupa angka." };
  return { nilai: [nama, jenis, teks(f, "lembaga"), teks(f, "nomor"), milik, saldoAwal] as const };
}

export async function aksiTambahAkun(_: Pesan, f: FormData): Promise<Pesan> {
  await wajibMasuk();
  const a = bacaAkun(f);
  if (a.galat) return { galat: a.galat };
  db()
    .prepare("INSERT INTO akun (nama, jenis, lembaga, nomor, milik, saldo_awal) VALUES (?, ?, ?, ?, ?, ?)")
    .run(...a.nilai!);
  revalidatePath("/", "layout");
  return { sukses: `Akun "${a.nilai![0]}" ditambahkan.` };
}

export async function aksiUbahAkun(_: Pesan, f: FormData): Promise<Pesan> {
  await wajibMasuk();
  const a = bacaAkun(f);
  if (a.galat) return { galat: a.galat };
  db()
    .prepare("UPDATE akun SET nama = ?, jenis = ?, lembaga = ?, nomor = ?, milik = ?, saldo_awal = ? WHERE id = ?")
    .run(...a.nilai!, Number(f.get("id")));
  revalidatePath("/", "layout");
  return { sukses: "Perubahan disimpan." };
}

export async function aksiHapusAkun(f: FormData) {
  await wajibMasuk();
  const id = Number(f.get("id"));
  const { n } = db().prepare("SELECT COUNT(*) n FROM transaksi WHERE akun_id = ?").get(id) as { n: number };
  if (n === 0) {
    db().prepare("DELETE FROM impor WHERE akun_id = ?").run(id);
    db().prepare("DELETE FROM akun WHERE id = ?").run(id);
  }
  revalidatePath("/", "layout");
}

// ---------- Transaksi ----------

export async function aksiTambahTransaksi(_: Pesan, f: FormData): Promise<Pesan> {
  await wajibMasuk();
  const akun = Number(f.get("akun"));
  const tanggal = teks(f, "tanggal");
  const arah = teks(f, "arah");
  const nominal = uraiNominal(teks(f, "nominal"));
  const deskripsi = teks(f, "deskripsi");
  const kategori = Number(f.get("kategori")) || null;
  if (!akun) return { galat: "Pilih akun." };
  if (!tanggalSah(tanggal)) return { galat: "Tanggal tidak sah." };
  if (arah !== "masuk" && arah !== "keluar") return { galat: "Pilih uang masuk atau uang keluar." };
  if (nominal === null || nominal <= 0) return { galat: "Nominal harus angka lebih dari nol." };
  if (!deskripsi) return { galat: "Keterangan wajib diisi." };
  db()
    .prepare(
      `INSERT INTO transaksi (akun_id, tanggal, deskripsi, nominal, arah, kategori_id, sumber, sidik_jari, catatan)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
    )
    .run(akun, tanggal, deskripsi, nominal, arah, kategori, "manual:" + crypto.randomUUID(), teks(f, "catatan"));
  revalidatePath("/", "layout");
  return { sukses: "Transaksi disimpan. Anda bisa langsung menambah transaksi berikutnya." };
}

export async function aksiUbahKategori(id: number, kategori: number | null) {
  await wajibMasuk();
  db().prepare("UPDATE transaksi SET kategori_id = ? WHERE id = ?").run(kategori, id);
  revalidatePath("/", "layout");
}

export async function aksiHapusTransaksi(f: FormData) {
  await wajibMasuk();
  db().prepare("DELETE FROM transaksi WHERE id = ?").run(Number(f.get("id")));
  revalidatePath("/", "layout");
}

// ---------- Impor ----------

async function bacaBerkas(f: FormData) {
  const file = f.get("file");
  const akun = Number(f.get("akun"));
  if (!akun) throw new Error("Pilih akun tujuan dulu.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Pilih file mutasi dulu.");
  return { akun, berkas: { nama: file.name, isi: Buffer.from(await file.arrayBuffer()) } };
}

export async function aksiPratinjauImpor(f: FormData): Promise<{ galat: string } | { pratinjau: Pratinjau }> {
  await wajibMasuk();
  try {
    const { akun, berkas } = await bacaBerkas(f);
    return { pratinjau: pratinjauImpor(db(), akun, berkas) };
  } catch (e) {
    return { galat: e instanceof Error ? e.message : "File tidak bisa dibaca." };
  }
}

export async function aksiSimpanImpor(
  f: FormData,
): Promise<{ galat: string } | { jumlahBaru: number; jumlahGanda: number }> {
  await wajibMasuk();
  try {
    const { akun, berkas } = await bacaBerkas(f);
    const hasil = simpanImpor(db(), akun, berkas, { pakaiSaldoAwal: f.get("pakai_saldo_awal") === "ya" });
    revalidatePath("/", "layout");
    return hasil;
  } catch (e) {
    return { galat: e instanceof Error ? e.message : "Impor gagal." };
  }
}
