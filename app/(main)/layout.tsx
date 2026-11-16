import AppHeader from "@/components/AppHeader";
import { currentUser, shopping } from "@/lib/mock-data";

// Нэвтэрсэн гишүүний бүх хуудсанд нийтлэг: дээд цэс + голын багана.
// TODO(Гишүүн 3): нэвтрээгүй бол /login руу шилжүүлнэ.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const shopCount = shopping.filter((s) => !s.got).length;
  return (
    <>
      <AppHeader user={currentUser} shopCount={shopCount} />
      <main className="mx-auto max-w-[960px] px-4 pt-8 pb-16">{children}</main>
    </>
  );
}
