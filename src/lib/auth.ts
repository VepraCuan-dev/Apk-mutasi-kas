import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { db } from "./db";

/**
 * Login sederhana: satu password untuk aplikasi ini. Yang disimpan hanya hash
 * (scrypt), bukan password aslinya. Ini BUKAN password internet banking.
 */

const KUKI = "sesi_mutasi";
const UMUR_SESI_HARI = 30;

function ambil(kunci: string): string | undefined {
  const r = db().prepare("SELECT nilai FROM pengaturan WHERE kunci = ?").get(kunci) as
    | { nilai: string }
    | undefined;
  return r?.nilai;
}

export function sudahAdaPassword(): boolean {
  return !!ambil("password_hash");
}

function hashPassword(password: string, garam: Buffer): Buffer {
  return crypto.scryptSync(password, garam, 64);
}

export function simpanPassword(password: string) {
  const garam = crypto.randomBytes(16);
  const nilai = garam.toString("hex") + ":" + hashPassword(password, garam).toString("hex");
  db()
    .prepare(
      "INSERT INTO pengaturan (kunci, nilai) VALUES ('password_hash', ?) ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai",
    )
    .run(nilai);
}

export function cekPassword(password: string): boolean {
  const tersimpan = ambil("password_hash");
  if (!tersimpan) return false;
  const [garamHex, hashHex] = tersimpan.split(":");
  const harapan = Buffer.from(hashHex, "hex");
  const hasil = hashPassword(password, Buffer.from(garamHex, "hex"));
  return crypto.timingSafeEqual(harapan, hasil);
}

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function buatSesi() {
  const token = crypto.randomBytes(32).toString("hex");
  const kedaluwarsa = Date.now() + UMUR_SESI_HARI * 86400_000;
  db().prepare("DELETE FROM sesi WHERE kedaluwarsa < ?").run(Date.now());
  db().prepare("INSERT INTO sesi (token_hash, kedaluwarsa) VALUES (?, ?)").run(sha(token), kedaluwarsa);
  (await cookies()).set(KUKI, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UMUR_SESI_HARI * 86400,
  });
}

export async function hapusSesi() {
  const jar = await cookies();
  const token = jar.get(KUKI)?.value;
  if (token) db().prepare("DELETE FROM sesi WHERE token_hash = ?").run(sha(token));
  jar.delete(KUKI);
}

export async function sudahMasuk(): Promise<boolean> {
  const token = (await cookies()).get(KUKI)?.value;
  if (!token) return false;
  const r = db().prepare("SELECT kedaluwarsa FROM sesi WHERE token_hash = ?").get(sha(token)) as
    | { kedaluwarsa: number }
    | undefined;
  return !!r && r.kedaluwarsa > Date.now();
}

/** Dipanggil di setiap halaman dan aksi yang menyentuh data. */
export async function wajibMasuk() {
  if (!(await sudahMasuk())) redirect("/masuk");
}

// Pembatas percobaan login: 5 kali salah -> tunggu 30 detik.
const gagal = { jumlah: 0, kunciSampai: 0 };
export function bolehCobaMasuk(): boolean {
  return Date.now() >= gagal.kunciSampai;
}
export function catatGagalMasuk() {
  gagal.jumlah += 1;
  if (gagal.jumlah >= 5) {
    gagal.jumlah = 0;
    gagal.kunciSampai = Date.now() + 30_000;
  }
}
export function catatBerhasilMasuk() {
  gagal.jumlah = 0;
}
