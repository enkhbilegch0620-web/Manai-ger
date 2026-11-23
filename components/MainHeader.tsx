"use client";

import AppHeader from "@/components/AppHeader";
import { currentUser } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

// Дээд цэсний "Захиалга (n)" тоог store-оос уншина.
export default function MainHeader() {
  const { items } = useStore();
  return <AppHeader user={currentUser} shopCount={items.filter((s) => !s.got).length} />;
}
