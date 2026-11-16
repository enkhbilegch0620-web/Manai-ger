import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import ComingSoon from "@/components/ComingSoon";
import { members } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Админ · Манай гэр" };

export default function AdminPage() {
  const admin = members.find((m) => m.role === "admin")!;
  return (
    <>
      <AppHeader user={admin} shopCount={0} />
      <main className="mx-auto max-w-[960px] px-4 pt-8 pb-16">
        <ComingSoon title="Админ хэсэг" week={4} what="Гэр бүл нэмэх, гишүүн үүсгэх, PIN шинэчлэх, бүртгэл устгах" />
      </main>
    </>
  );
}
