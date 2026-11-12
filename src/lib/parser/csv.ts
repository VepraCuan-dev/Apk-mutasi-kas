/** Pembaca CSV kecil: mendukung tanda kutip ganda dan pemisah , atau ; */
export function bacaCsv(teks: string, pemisah = ","): string[][] {
  const baris: string[][] = [];
  let sel = "";
  let kolom: string[] = [];
  let dalamKutip = false;
  const t = teks.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dalamKutip) {
      if (c === '"' && t[i + 1] === '"') { sel += '"'; i++; }
      else if (c === '"') dalamKutip = false;
      else sel += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === pemisah) { kolom.push(sel.trim()); sel = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      kolom.push(sel.trim());
      baris.push(kolom);
      kolom = [];
      sel = "";
    } else sel += c;
  }
  if (sel !== "" || kolom.length) { kolom.push(sel.trim()); baris.push(kolom); }
  return baris;
}
