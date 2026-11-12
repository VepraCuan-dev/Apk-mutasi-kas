"use client";

import { useActionState } from "react";
import { aksiTambahAkun, aksiUbahAkun } from "@/app/actions";
import type { Akun } from "@/lib/data";

export function FormAkun({ akun }: { akun?: Akun }) {
  const [pesan, aksi, tunggu] = useActionState(akun ? aksiUbahAkun : aksiTambahAkun, null);
  return (
    <form action={aksi} className="borang">
      {akun && <input type="hidden" name="id" value={akun.id} />}
      <div className="dua">
        <label>
          Nama akun
          <input name="nama" defaultValue={akun?.nama} placeholder="contoh: BCA Bisnis" required />
        </label>
        <label>
          Jenis
          <select name="jenis" defaultValue={akun?.jenis ?? "bank"}>
            <option value="bank">Bank</option>
            <option value="ewallet">E-wallet</option>
            <option value="tunai">Tunai</option>
          </select>
        </label>
      </div>
      <div className="dua">
        <label>
          Nama bank atau e-wallet
          <input name="lembaga" defaultValue={akun?.lembaga} placeholder="contoh: BCA, GoPay" />
        </label>
        <label>
          Nomor rekening atau HP (opsional)
          <input name="nomor" defaultValue={akun?.nomor} inputMode="numeric" />
        </label>
      </div>
      <div className="dua">
        <label>
          Untuk
          <select name="milik" defaultValue={akun?.milik ?? "bisnis"}>
            <option value="bisnis">Bisnis</option>
            <option value="pribadi">Pribadi</option>
          </select>
        </label>
        <label>
          Saldo awal (Rp)
          <input name="saldo_awal" inputMode="decimal" defaultValue={akun ? String(akun.saldo_awal / 100).replace(".", ",") : ""} placeholder="0" />
        </label>
      </div>
      <p className="redup kecil" style={{ margin: 0 }}>
        Saldo awal adalah saldo sebelum transaksi pertama yang tercatat di aplikasi. Saat impor pertama, saldo ini bisa diisi otomatis dari file.
      </p>
      {pesan?.galat && <p className="pesan galat" role="alert">{pesan.galat}</p>}
      {pesan?.sukses && <p className="pesan sukses" role="status">{pesan.sukses}</p>}
      <div><button className="tombol" disabled={tunggu}>{akun ? "Simpan perubahan" : "Tambah akun"}</button></div>
    </form>
  );
}
