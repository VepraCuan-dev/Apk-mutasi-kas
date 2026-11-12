"use client";

import { useActionState } from "react";
import { aksiMasuk } from "@/app/actions";

export function FormMasuk({ baru }: { baru: boolean }) {
  const [pesan, aksi, tunggu] = useActionState(aksiMasuk, null);
  return (
    <form action={aksi} className="borang">
      <label>
        Password
        <input type="password" name="password" required autoFocus autoComplete={baru ? "new-password" : "current-password"} />
      </label>
      {baru && (
        <label>
          Ulangi password
          <input type="password" name="ulangi" required autoComplete="new-password" />
        </label>
      )}
      {pesan?.galat && <p className="pesan galat" role="alert">{pesan.galat}</p>}
      <button className="tombol" disabled={tunggu}>{baru ? "Simpan dan masuk" : "Masuk"}</button>
    </form>
  );
}
