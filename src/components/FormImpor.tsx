"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { aksiPratinjauImpor, aksiSimpanImpor } from "@/app/actions";
import type { Akun } from "@/lib/data";
import { rupiah, tanggalPendek } from "@/lib/format";
import type { Pratinjau } from "@/lib/impor";

export function FormImpor({ akun }: { akun: Akun[] }) {
  const borang = useRef<HTMLFormElement>(null);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [galat, setGalat] = useState("");
  const [selesai, setSelesai] = useState<{ jumlahBaru: number; jumlahGanda: number } | null>(null);
  const [pakaiSaldo, setPakaiSaldo] = useState(true);
  const [tunggu, mulai] = useTransition();

  const ulang = () => { setPratinjau(null); setGalat(""); setSelesai(null); };

  const periksa = () =>
    mulai(async () => {
      ulang();
      const r = await aksiPratinjauImpor(new FormData(borang.current!));
      if ("galat" in r) setGalat(r.galat);
      else setPratinjau(r.pratinjau);
    });

  const simpan = () =>
    mulai(async () => {
      const f = new FormData(borang.current!);
      if (pakaiSaldo) f.set("pakai_saldo_awal", "ya");
      const r = await aksiSimpanImpor(f);
      if ("galat" in r) setGalat(r.galat);
      else { setSelesai(r); setPratinjau(null); }
    });

  const h = pratinjau?.hasil;
  return (
    <>
      <form ref={borang} className="borang kartu" onSubmit={(e) => { e.preventDefault(); periksa(); }}>
        <div className="dua">
          <label>
            Akun tujuan
            <select name="akun" required onChange={ulang}>
              {akun.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
            </select>
          </label>
          <label>
            File mutasi
            <input type="file" name="file" accept=".csv,.txt" required onChange={ulang} />
          </label>
        </div>
        <button className="tombol" disabled={tunggu}>{tunggu && !pratinjau ? "Membaca file…" : "Periksa file"}</button>
      </form>

      {galat && <p className="pesan galat" role="alert" style={{ marginTop: "1rem" }}>{galat}</p>}

      {selesai && (
        <div className="pesan sukses" role="status" style={{ marginTop: "1rem" }}>
          Impor selesai: {selesai.jumlahBaru} transaksi baru disimpan
          {selesai.jumlahGanda > 0 && `, ${selesai.jumlahGanda} dilewati karena sudah ada`}.{" "}
          <Link href="/transaksi">Lihat transaksi</Link>
        </div>
      )}

      {pratinjau && h && (
        <section className="bagian">
          <h2>Hasil pemeriksaan</h2>
          <p>
            Format: <strong>{pratinjau.parser.nama}</strong>
            {h.nomorRekening && <> · No. rekening {h.nomorRekening}</>}
            {h.periode && <> · {tanggalPendek(h.periode.dari)} sampai {tanggalPendek(h.periode.sampai)}</>}
          </p>
          <div className="kisi">
            <div className="kartu"><div className="label">Transaksi baru</div><div className="nilai">{pratinjau.jumlahBaru}</div></div>
            <div className="kartu"><div className="label">Sudah ada (dilewati)</div><div className="nilai">{pratinjau.jumlahGanda}</div></div>
            {h.saldoAkhir !== undefined && (
              <div className="kartu"><div className="label">Saldo akhir menurut file</div><div className="nilai">{rupiah(h.saldoAkhir)}</div></div>
            )}
          </div>

          <div style={{ display: "grid", gap: ".5rem", marginTop: ".75rem" }}>
            {pratinjau.filePernahDiimpor && (
              <p className="pesan info">File yang sama sudah pernah diimpor ke akun ini. Transaksi yang sudah ada tidak akan disimpan dua kali.</p>
            )}
            {pratinjau.nomorCocok === false && (
              <p className="pesan galat">Nomor rekening di file ({h.nomorRekening}) berbeda dengan nomor akun yang dipilih. Pastikan akunnya benar.</p>
            )}
            {h.peringatan.map((p) => <p key={p} className="pesan info">{p}</p>)}
          </div>

          {pratinjau.akunKosong && h.saldoAwal !== undefined && (
            <label className="centang" style={{ marginTop: ".75rem" }}>
              <input type="checkbox" checked={pakaiSaldo} onChange={(e) => setPakaiSaldo(e.target.checked)} />
              Pakai saldo awal dari file ({rupiah(h.saldoAwal)}) sebagai saldo awal akun ini
            </label>
          )}

          <div style={{ display: "flex", gap: ".5rem", margin: "1rem 0", flexWrap: "wrap" }}>
            <button className="tombol" onClick={simpan} disabled={tunggu || pratinjau.jumlahBaru === 0}>
              {pratinjau.jumlahBaru === 0 ? "Tidak ada yang baru" : `Simpan ${pratinjau.jumlahBaru} transaksi`}
            </button>
            <button className="tombol sekunder" onClick={ulang} disabled={tunggu}>Batal</button>
          </div>

          <ul className="daftar">
            {h.transaksi.map((t, i) => (
              <li key={i} style={pratinjau.ganda[i] ? { opacity: 0.55 } : undefined}>
                <div className="ket">{t.deskripsi}</div>
                <div className={`jumlah angka ${t.arah}`}>{t.arah === "masuk" ? "+" : "−"}{rupiah(t.nominal)}</div>
                <div className="bawah">
                  <span className="redup kecil">{tanggalPendek(t.tanggal)}</span>
                  {pratinjau.ganda[i] && <span className="lencana">Sudah ada</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
