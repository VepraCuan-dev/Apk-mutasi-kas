"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEM = [
  ["/", "Dashboard"],
  ["/transaksi", "Transaksi"],
  ["/impor", "Impor"],
  ["/akun", "Akun"],
] as const;

export function Menu() {
  const jalur = usePathname();
  return (
    <nav className="menu" aria-label="Menu utama">
      {ITEM.map(([href, nama]) => {
        const aktif = href === "/" ? jalur === "/" : jalur.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={aktif ? "page" : undefined}>
            {nama}
          </Link>
        );
      })}
    </nav>
  );
}
