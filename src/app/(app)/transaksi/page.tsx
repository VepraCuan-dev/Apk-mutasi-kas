import Link from "next/link";
import { aksiHapusTransaksi } from "@/app/actions";
import { PilihKategori } from "@/components/PilihKategori";
import { cariTransaksi, daftarAkun, daftarKategori, type Saring } from "@/lib/data";
import { rupiah, tanggalPendek, tanggalSah } from "@/lib/format";

type SP = { akun?: string; kategori?: string; dari?: string; sampai?: string; q?: string; arah?: string; hal?: string };

export default async function HalamanTransaksi({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const saring: Saring = {
    akun: Number(sp.akun) || undefined,
    kategori: sp.kategori === "kosong" ? "kosong" : Number(sp.kategori) || undefined,
    dari: sp.dari && tanggalSah(sp.dari) ? sp.dari : undefined,
    sampai: sp.sampai && tanggalSah(sp.sampai) ? sp.sampai : undefined,
    q: sp.q?.trim() || undefined,
    arah: sp.arah === "masuk" || sp.arah === "keluar" ? sp.arah : undefined,
  };
  const hal = Math.max(1, Number(sp.hal) || 1);
  const akun = daftarAkun();
  const kategori = daftarKategori();
  const hasil = cariTransaksi(saring, hal);
  const adaSaring = Object.values(saring).some(Boolean);
  const saringLain = !!(saring.akun || saring.kategori || saring.arah || saring.dari || saring.sampai);
  const taut = (h: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "hal") p.set(k, v);
    if (h > 1) p.set("hal", String(h));
    return "/transaksi?" + p.toString();
  };

  return (
    <>
      <div className="baris-judul">
        <h1>Transaksi</h1>
        <Link className="tombol" href="/transaksi/baru">+ Tambah manual</Link>
      </div>

      <form className="saring kartu" method="get">
        <div className="saring-cari">
          <label>
            Cari
            <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Kata kunci" />
          </label>
          <button className="tombol">Terapkan</button>
        </div>
        <details open={saringLain}>
          <summary>Saring per akun, kategori, tanggal</summary>
          <div className="saring-lain">
            <label>
              Akun
              <select name="akun" defaultValue={sp.akun ?? ""}>
                <option value="">Semua akun</option>
                {akun.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
              </select>
            </label>
            <label>
              Kategori
              <select name="kategori" defaultValue={sp.kategori ?? ""}>
                <option value="">Semua kategori</option>
                <option value="kosong">Belum dikategorikan</option>
                {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </label>
            <label>
              Arah
              <select name="arah" defaultValue={sp.arah ?? ""}>
                <option value="">Masuk dan keluar</option>
                <option value="masuk">Uang masuk</option>
                <option value="keluar">Uang keluar</option>
              </select>
            </label>
            <label>
              Dari tanggal
              <input type="date" name="dari" defaultValue={sp.dari ?? ""} />
            </label>
            <label>
              Sampai tanggal
              <input type="date" name="sampai" defaultValue={sp.sampai ?? ""} />
            </label>
          </div>
        </details>
        {adaSaring && <div><Link className="tombol sekunder" href="/transaksi">Hapus saringan</Link></div>}
      </form>

      <p style={{ marginTop: "1rem" }}>
        <strong>{hasil.jumlah.toLocaleString("id-ID")} transaksi</strong>
        {hasil.jumlah > 0 && (
          <>
            {" · "}masuk <span className="angka masuk">{rupiah(hasil.masuk)}</span>
            {" · "}keluar <span className="angka keluar">{rupiah(hasil.keluar)}</span>
          </>
        )}
      </p>

      {hasil.jumlah === 0 ? (
        <p className="pesan info">
          {adaSaring ? "Tidak ada transaksi yang cocok dengan saringan ini." : "Belum ada transaksi. Impor file mutasi atau tambah secara manual."}
        </p>
      ) : (
        <ul className="daftar">
          {hasil.baris.map((t) => (
            <li key={t.id}>
              <div className="ket">{t.deskripsi}</div>
              <div className={`jumlah angka ${t.arah}`}>
                {t.arah === "masuk" ? "+" : "−"}{rupiah(t.nominal)}
              </div>
              <div className="bawah">
                <span className="redup kecil">{tanggalPendek(t.tanggal)} · {t.akun_nama}</span>
                <PilihKategori id={t.id} nilai={t.kategori_id} kategori={kategori} />
                {t.sumber === "manual" && (
                  <form action={aksiHapusTransaksi}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="tombol polos kecil">Hapus</button>
                  </form>
                )}
              </div>
              {t.catatan && <div className="bawah redup kecil">{t.catatan}</div>}
            </li>
          ))}
        </ul>
      )}

      {hasil.jumlahHalaman > 1 && (
        <div className="halaman">
          {hal > 1 && <Link className="tombol sekunder" href={taut(hal - 1)}>‹ Sebelumnya</Link>}
          <span>Halaman {hal} dari {hasil.jumlahHalaman}</span>
          {hal < hasil.jumlahHalaman && <Link className="tombol sekunder" href={taut(hal + 1)}>Berikutnya ›</Link>}
        </div>
      )}
    </>
  );
}
