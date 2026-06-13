"use client";

import Image from "next/image";
import type { Menu } from "@/types/app-ui";

export function MenuPhoto({ menu, className }: { menu: Pick<Menu, "name" | "photoUrl">; className?: string }) {
  if (menu.photoUrl) {
    return <Image src={menu.photoUrl} alt={menu.name} width={640} height={420} unoptimized className={`bg-skysoft object-cover ${className ?? ""}`} />;
  }
  return (
    <div className={`flex items-center justify-center bg-skysoft text-xl font-black text-leaf ${className ?? ""}`}>
      {menu.name.slice(0, 2).toUpperCase()}
    </div>
  );
}
