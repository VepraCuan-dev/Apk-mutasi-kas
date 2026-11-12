import Link from "next/link";
import { FormImpor } from "@/components/FormImpor";
import { daftarAkun } from "@/lib/data";
import { db } from "@/lib/db";
import { daftarParser } from "@/lib/parser";

type Riwayat = { id: number; nama_file: string; akun: string; jumlah_baru: number; jumlah_ganda: number; waktu: string };

export default function HalamanImpor() {
  const akun = daftarAkun();
  const riwayat = db()
    .prepare(
      `SELECT i.id, i.nama_file, a.nama AS akun, i.jumlah_baru, i.jumlah_ganda, i.waktu
       FROM impor i JOIN akun a ON a.id = i.akun_id ORDER BY i.id DESC LIMIT 20`,
    )
    .all() as Riwayat[];
  return (
    <>
      <h1>Impor mutasi</h1>
      <p className="redup">
        Unduh file mutasi dari bank, lalu pilih di sini. Format yang didukung saat ini:{" "}
        {daftarParser.map((p) => p.nama).join(", ")}. Aplikasi tidak pernah meminta username atau password internet banking.
      </p>
      {akun.length ? (
        <FormImpor akun={akun} />
      ) : (
        <p className="pesan info">Belum ada akun. <Link href="/akun">Tambah akun dulu</Link>.</p>
      )}

      {riwayat.length > 0 && (
        <section className="bagian">
          <h2>Riwayat impor</h2>
          <div className="gulir">
            <table className="polos">
              <thead>
                <tr><th>Waktu</th><th>File</th><th>Akun</th><th className="kanan">Baru</th><th className="kanan">Dilewati</th></tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.waktu.replace(" ", "T") + "Z").toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}</td>
                    <td>{r.nama_file}</td>
                    <td>{r.akun}</td>
                    <td className="kanan">{r.jumlah_baru}</td>
                    <td className="kanan">{r.jumlah_ganda}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
