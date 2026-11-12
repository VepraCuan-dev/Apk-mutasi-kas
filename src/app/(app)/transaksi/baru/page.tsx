import Link from "next/link";
import { FormTransaksi } from "@/components/FormTransaksi";
import { daftarAkun, daftarKategori } from "@/lib/data";
import { hariIni } from "@/lib/format";

export default function TransaksiBaru() {
  const akun = daftarAkun();
  return (
    <>
      <p><Link href="/transaksi">‹ Kembali ke transaksi</Link></p>
      <h1>Tambah transaksi manual</h1>
      {akun.length ? (
        <FormTransaksi akun={akun} kategori={daftarKategori()} hariIni={hariIni()} />
      ) : (
        <p className="pesan info">Belum ada akun. <Link href="/akun">Tambah akun dulu</Link>.</p>
      )}
    </>
  );
}
