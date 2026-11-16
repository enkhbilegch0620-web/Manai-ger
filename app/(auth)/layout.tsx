// Нэвтрэх хуудсуудын нийтлэг загвар: дэлгэцийн голд нэг карт.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-8">{children}</div>
    </main>
  );
}
