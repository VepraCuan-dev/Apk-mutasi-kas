"use client";

import { useState } from "react";
import type { ArusBulan } from "@/lib/data";
import { namaBulan, rupiah, rupiahRingkas } from "@/lib/format";

/** Batas atas dan jarak garis bantu yang "bulat" (1, 2, 5 x 10^n). */
function skala(maks: number) {
  if (maks <= 0) return { atas: 1, langkah: 1 };
  const kasar = maks / 4;
  const pangkat = 10 ** Math.floor(Math.log10(kasar));
  const langkah = [1, 2, 5, 10].map((k) => k * pangkat).find((l) => l >= kasar)!;
  return { atas: Math.ceil(maks / langkah) * langkah, langkah };
}

export function GrafikArusKas({ data }: { data: ArusBulan[] }) {
  const [pilih, setPilih] = useState(data.length - 1);
  const { atas, langkah } = skala(Math.max(...data.map((d) => Math.max(d.masuk, d.keluar))));
  const garis = Array.from({ length: Math.round(atas / langkah) + 1 }, (_, i) => i * langkah);
  const d = data[pilih];
  const selisih = d.masuk - d.keluar;
  return (
    <div>
      <div className="grafik-legenda">
        <span><i style={{ background: "var(--grafik-masuk)" }} />Pemasukan</span>
        <span><i style={{ background: "var(--grafik-keluar)" }} />Pengeluaran</span>
      </div>
      <div className="grafik">
        <div className="grafik-sumbu" aria-hidden>
          {garis.map((g) => (
            <span key={g} style={{ bottom: `${(g / atas) * 100}%` }}>{rupiahRingkas(g)}</span>
          ))}
        </div>
        <div className="grafik-bidang">
          {garis.slice(1).map((g) => (
            <div key={g} className="grafik-garis" style={{ bottom: `${(g / atas) * 100}%` }} />
          ))}
          {data.map((b, i) => (
            <button
              key={b.bulan}
              type="button"
              className="grafik-kolom"
              aria-pressed={i === pilih}
              aria-label={`${namaBulan(b.bulan)}: pemasukan ${rupiah(b.masuk)}, pengeluaran ${rupiah(b.keluar)}`}
              onMouseEnter={() => setPilih(i)}
              onFocus={() => setPilih(i)}
              onClick={() => setPilih(i)}
            >
              <b style={{ height: `${(b.masuk / atas) * 100}%`, background: "var(--grafik-masuk)" }} />
              <b style={{ height: `${(b.keluar / atas) * 100}%`, background: "var(--grafik-keluar)" }} />
            </button>
          ))}
        </div>
        <div className="grafik-bulan" aria-hidden>
          {data.map((b) => <span key={b.bulan}>{namaBulan(b.bulan, true).split(" ")[0]}</span>)}
        </div>
      </div>
      <div className="grafik-baca" aria-live="polite">
        <strong>{namaBulan(d.bulan)}</strong>
        <span>Pemasukan <span className="angka">{rupiah(d.masuk)}</span></span>
        <span>Pengeluaran <span className="angka">{rupiah(d.keluar)}</span></span>
        <span>Selisih <span className="angka">{rupiah(selisih)}</span></span>
      </div>
      <details>
        <summary>Lihat sebagai tabel</summary>
        <div className="gulir">
          <table className="polos">
            <thead>
              <tr><th>Bulan</th><th className="kanan">Pemasukan</th><th className="kanan">Pengeluaran</th><th className="kanan">Selisih</th></tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.bulan}>
                  <td>{namaBulan(b.bulan)}</td>
                  <td className="kanan angka">{rupiah(b.masuk)}</td>
                  <td className="kanan angka">{rupiah(b.keluar)}</td>
                  <td className="kanan angka">{rupiah(b.masuk - b.keluar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
