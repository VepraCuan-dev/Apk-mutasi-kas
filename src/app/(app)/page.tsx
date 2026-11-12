import Link from "next/link";
import { GrafikArusKas } from "@/components/GrafikArusKas";
import { arusKasBulanan, bulanTerakhirBerdata, daftarAkun } from "@/lib/data";
import { geserBulan, hariIni, namaBulan, rupiah } from "@/lib/format";

const JENIS = { bank: "Bank", ewallet: "E-wallet", tunai: "Tunai" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const sp = await searchParams;
  const bulanIni = hariIni().slice(0, 7);
  const bulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan ?? "") ? sp.bulan! : bulanIni;
  const akun = daftarAkun();

  if (!akun.length) {
    return (
      <>
        <h1>Selamat datang</h1>
        <p>Mulai dengan menambahkan rekening atau e-wallet Anda, lalu impor file mutasinya.</p>
        <Link className="tombol" href="/akun">Tambah akun pertama</Link>
      </>
    );
  }

  const arus = arusKasBulanan(bulan, 6);
  const ini = arus[arus.length - 1];
  const total = akun.reduce((s, a) => s + a.saldo, 0);
  const terakhir = bulanTerakhirBerdata();
  const kosong = ini.masuk === 0 && ini.keluar === 0;

  return (
    <>
      <h1>Dashboard</h1>

      <div className="kartu">
        <div className="label">Total saldo semua akun</div>
        <div className="nilai besar">{rupiah(total)}</div>
      </div>

      <section className="bagian">
        <div className="baris-judul">
          <h2 style={{ margin: 0 }}>{namaBulan(bulan)}</h2>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <Link className="tombol sekunder" href={`/?bulan=${geserBulan(bulan, -1)}`}>‹ Bulan lalu</Link>
            {bulan < bulanIni && (
              <Link className="tombol sekunder" href={`/?bulan=${geserBulan(bulan, 1)}`}>Bulan berikut ›</Link>
            )}
          </div>
        </div>
        <div className="kisi">
          <div className="kartu">
            <div className="label">Pemasukan</div>
            <div className="nilai masuk">{rupiah(ini.masuk)}</div>
          </div>
          <div className="kartu">
            <div className="label">Pengeluaran</div>
            <div className="nilai keluar">{rupiah(ini.keluar)}</div>
          </div>
          <div className="kartu">
            <div className="label">Selisih</div>
            <div className="nilai">{rupiah(ini.masuk - ini.keluar)}</div>
          </div>
        </div>
        {kosong && terakhir && terakhir !== bulan && (
          <p className="pesan info" style={{ marginTop: ".75rem" }}>
            Belum ada transaksi di bulan ini. Data terakhir ada di{" "}
            <Link href={`/?bulan=${terakhir}`}>{namaBulan(terakhir)}</Link>.
          </p>
        )}
        <p className="redup kecil" style={{ marginTop: ".5rem" }}>
          Transfer antar akun sendiri tidak dihitung sebagai pemasukan atau pengeluaran.
        </p>
      </section>

      <section className="bagian">
        <h2>Arus kas 6 bulan terakhir</h2>
        <GrafikArusKas key={bulan} data={arus} />
      </section>

      <section className="bagian">
        <h2>Saldo per akun</h2>
        <div className="kisi">
          {akun.map((a) => (
            <Link key={a.id} href={`/transaksi?akun=${a.id}`} className="kartu" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="label">
                {a.nama} <span className="lencana">{JENIS[a.jenis]}</span>{" "}
                {a.milik === "pribadi" && <span className="lencana">Pribadi</span>}
              </div>
              <div className="nilai">{rupiah(a.saldo)}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
