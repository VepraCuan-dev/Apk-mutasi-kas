import Link from "next/link";
import { aksiKeluar } from "@/app/actions";
import { Menu } from "@/components/Menu";
import { wajibMasuk } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TataLetakApp({ children }: { children: React.ReactNode }) {
  await wajibMasuk();
  return (
    <>
      <header className="atas">
        <div className="atas-isi">
          <Link href="/" className="merek">Rekap Mutasi Kas</Link>
          <Menu />
          <form action={aksiKeluar}>
            <button className="tombol polos">Keluar</button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
