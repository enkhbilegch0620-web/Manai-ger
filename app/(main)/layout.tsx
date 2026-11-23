import MainHeader from "@/components/MainHeader";
import { StoreProvider } from "@/lib/store";

// Нэвтэрсэн гишүүний бүх хуудсанд нийтлэг: дээд цэс + голын багана.
// StoreProvider нь хуудсууд хооронд жишээ өгөгдлийг хуваалцана.
// TODO(Гишүүн 3): нэвтрээгүй бол /login руу шилжүүлнэ.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <MainHeader />
      <main className="mx-auto max-w-[960px] px-4 pt-8 pb-16">{children}</main>
    </StoreProvider>
  );
}
