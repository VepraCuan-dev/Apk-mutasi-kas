"use client";

import { useTransition } from "react";
import { aksiUbahKategori } from "@/app/actions";
import type { Kategori } from "@/lib/data";

export function PilihKategori({ id, nilai, kategori }: { id: number; nilai: number | null; kategori: Kategori[] }) {
  const [tunggu, mulai] = useTransition();
  return (
    <select
      aria-label="Kategori"
      defaultValue={nilai ?? ""}
      disabled={tunggu}
      onChange={(e) => {
        const v = e.target.value ? Number(e.target.value) : null;
        mulai(() => aksiUbahKategori(id, v));
      }}
    >
      <option value="">Belum dikategorikan</option>
      {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
    </select>
  );
}
