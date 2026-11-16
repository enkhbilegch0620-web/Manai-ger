import type { Metadata } from "next";
import SetupForm from "./SetupForm";

export const metadata: Metadata = { title: "Анхны админ · Манай гэр" };

// Системд админ байхгүй үед л харагдана.
// TODO(Гишүүн 3): админ аль хэдийн байвал /login руу шилжүүлнэ.
export default function SetupPage() {
  return <SetupForm />;
}
