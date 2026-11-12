"use client";

import { useActionState } from "react";
import { aksiTambahTransaksi } from "@/app/actions";
import type { Akun, Kategori } from "@/lib/data";

export function FormTransaksi({ akun, kategori, hariIni }: { akun: Akun[]; kategori: Kategori[]; hariIni: string }) {
  const [pesan, aksi, tunggu] = useActionState(aksiTambahTransaksi, null);
  return (
    <form action={aksi} className="borang" style={{ maxWidth: 560 }}>
      <div className="dua">
        <label>
          Akun
          <select name="akun" required>
            {akun.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
          </select>
        </label>
        <label>
          Tanggal
          <input type="date" name="tanggal" defaultValue={hariIni} required />
        </label>
      </div>
      <div className="dua">
        <label>
          Arah
          <select name="arah" required>
            <option value="keluar">Uang keluar</option>
            <option value="masuk">Uang masuk</option>
          </select>
        </label>
        <label>
          Nominal (Rp)
          <input name="nominal" inputMode="decimal" placeholder="contoh: 150.000" required />
        </label>
      </div>
      <label>
        Keterangan
        <input name="deskripsi" required />
      </label>
      <label>
        Kategori
        <select name="kategori">
          <option value="">Belum dikategorikan</option>
          {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </label>
      <label>
        Catatan (opsional)
        <input name="catatan" />
      </label>
      {pesan?.galat && <p className="pesan galat" role="alert">{pesan.galat}</p>}
      {pesan?.sukses && <p className="pesan sukses" role="status">{pesan.sukses}</p>}
      <button className="tombol" disabled={tunggu}>Simpan transaksi</button>
    </form>
  );
}
