/** Rp dari nilai sen. Sen hanya ditampilkan kalau tidak nol. */
export function rupiah(sen: number): string {
  const negatif = sen < 0;
  const abs = Math.abs(sen);
  const bulat = Math.floor(abs / 100);
  const sisa = abs % 100;
  let s = "Rp " + bulat.toLocaleString("id-ID");
  if (sisa) s += "," + String(sisa).padStart(2, "0");
  return negatif ? "-" + s : s;
}

/** Rp ringkas untuk sumbu grafik: 1,5 jt, 250 rb. */
export function rupiahRingkas(sen: number): string {
  const n = sen / 100;
  const a = Math.abs(n);
  const f = (x: number) => x.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (a >= 1e9) return f(n / 1e9) + " M";
  if (a >= 1e6) return f(n / 1e6) + " jt";
  if (a >= 1e3) return f(n / 1e3) + " rb";
  return f(n);
}

/**
 * Membaca nominal dari teks menjadi sen. Menerima gaya Indonesia (1.500.000,50),
 * gaya Inggris (1,500,000.50), dan angka polos (1500000 atau 1500000.50).
 * Mengembalikan null kalau bukan angka.
 */
export function uraiNominal(teks: string): number | null {
  let s = teks.replace(/[^\d.,-]/g, "");
  const negatif = s.startsWith("-");
  s = s.replace(/-/g, "");
  if (!/\d/.test(s)) return null;
  const titik = s.lastIndexOf(".");
  const koma = s.lastIndexOf(",");
  let desimal = -1;
  if (titik >= 0 && koma >= 0) {
    desimal = Math.max(titik, koma);
  } else if (titik >= 0 || koma >= 0) {
    const pos = Math.max(titik, koma);
    const tanda = s[pos];
    const sekali = s.indexOf(tanda) === pos;
    const digitSesudah = s.length - pos - 1;
    // Satu pemisah diikuti 1-2 angka = desimal; diikuti 3 angka = ribuan.
    if (sekali && digitSesudah <= 2) desimal = pos;
  }
  const bulat = (desimal >= 0 ? s.slice(0, desimal) : s).replace(/[.,]/g, "");
  const pecahan = desimal >= 0 ? s.slice(desimal + 1).replace(/[.,]/g, "") : "";
  const sen = Number(bulat || "0") * 100 + Number((pecahan + "00").slice(0, 2));
  if (!Number.isSafeInteger(sen)) return null;
  return negatif ? -sen : sen;
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** 2026-10-05 -> 5 Okt 2026 */
export function tanggalPendek(iso: string): string {
  const [t, b, h] = iso.split("-").map(Number);
  return `${h} ${BULAN[b - 1]} ${t}`;
}

/** 2026-10 -> Oktober 2026 */
export function namaBulan(ym: string, pendek = false): string {
  const [t, b] = ym.split("-").map(Number);
  return pendek ? `${BULAN[b - 1]} ${String(t).slice(2)}` : `${BULAN_PANJANG[b - 1]} ${t}`;
}

/** Tanggal hari ini (YYYY-MM-DD) menurut waktu Indonesia Barat. */
export function hariIni(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

/** Geser bulan: ("2026-01", -1) -> "2025-12" */
export function geserBulan(ym: string, n: number): string {
  const [t, b] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(t, b - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function tanggalSah(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}
