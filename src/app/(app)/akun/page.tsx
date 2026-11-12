import { aksiHapusAkun } from "@/app/actions";
import { FormAkun } from "@/components/FormAkun";
import { daftarAkun } from "@/lib/data";
import { rupiah } from "@/lib/format";

const JENIS = { bank: "Bank", ewallet: "E-wallet", tunai: "Tunai" };

export default function HalamanAkun() {
  const akun = daftarAkun();
  return (
    <>
      <h1>Akun</h1>
      {akun.length === 0 && <p className="redup">Belum ada akun. Tambahkan rekening bank, e-wallet, atau kas tunai Anda.</p>}

      <div style={{ display: "grid", gap: ".75rem" }}>
        {akun.map((a) => (
          <div key={a.id} className="kartu">
            <div className="baris-judul" style={{ marginBottom: 0 }}>
              <div>
                <strong>{a.nama}</strong> <span className="lencana">{JENIS[a.jenis]}</span>{" "}
                <span className="lencana">{a.milik === "bisnis" ? "Bisnis" : "Pribadi"}</span>
                <div className="redup kecil">
                  {[a.lembaga, a.nomor].filter(Boolean).join(" · ")}
                  {(a.lembaga || a.nomor) && " · "}
                  {a.jumlah_transaksi.toLocaleString("id-ID")} transaksi
                </div>
              </div>
              <div className="nilai">{rupiah(a.saldo)}</div>
            </div>
            <details>
              <summary>Ubah</summary>
              <FormAkun akun={a} />
              {a.jumlah_transaksi === 0 && (
                <form action={aksiHapusAkun} style={{ marginTop: ".5rem" }}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="tombol polos">Hapus akun ini</button>
                </form>
              )}
            </details>
          </div>
        ))}
      </div>

      <section className="bagian">
        <h2>Tambah akun</h2>
        <div className="kartu"><FormAkun /></div>
      </section>
    </>
  );
}
