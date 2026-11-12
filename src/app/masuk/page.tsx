import { redirect } from "next/navigation";
import { FormMasuk } from "@/components/FormMasuk";
import { sudahAdaPassword, sudahMasuk } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HalamanMasuk() {
  if (await sudahMasuk()) redirect("/");
  const baru = !sudahAdaPassword();
  return (
    <main style={{ maxWidth: 440, paddingTop: "12vh" }}>
      <h1>Rekap Mutasi Kas</h1>
      <p className="redup">
        {baru
          ? "Buat password untuk membuka aplikasi ini. Ini password khusus aplikasi, bukan password internet banking."
          : "Masukkan password aplikasi untuk melihat data."}
      </p>
      <FormMasuk baru={baru} />
    </main>
  );
}
