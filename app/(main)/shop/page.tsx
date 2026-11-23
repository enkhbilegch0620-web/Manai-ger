import type { Metadata } from "next";
import ShopView from "./ShopView";

export const metadata: Metadata = { title: "Захиалга · Манай гэр" };

export default function ShopPage() {
  return <ShopView />;
}
