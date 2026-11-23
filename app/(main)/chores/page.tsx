import type { Metadata } from "next";
import ChoresView from "./ChoresView";

export const metadata: Metadata = { title: "Гэрийн ажил · Манай гэр" };

export default function ChoresPage() {
  return <ChoresView />;
}
