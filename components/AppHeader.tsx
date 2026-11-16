"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui";
import type { Member } from "@/lib/mock-data";

type Tab = { href: string; label: string };

export function tabsFor(user: Member, shopCount: number): Tab[] {
  if (user.role === "admin") return [{ href: "/admin", label: "Админ" }];
  return [
    { href: "/", label: "Нүүр" },
    { href: "/chores", label: "Гэрийн ажил" },
    { href: "/schedule", label: "Хуваарь" },
    { href: "/shop", label: `Захиалга (${shopCount})` },
    { href: "/profile", label: user.role === "parent" ? "Ажил" : "Сурагч" },
  ];
}

export default function AppHeader({ user, shopCount }: { user: Member; shopCount: number }) {
  const pathname = usePathname();
  const tabs = tabsFor(user, shopCount);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-3 sm:gap-6 sm:px-6">
        <Link href={tabs[0].href} className="whitespace-nowrap text-[17px] font-extrabold sm:text-xl">
          Манай гэр
        </Link>
        <nav aria-label="Үндсэн цэс" className="flex h-full flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center whitespace-nowrap border-b-[3px] px-3 ${
                  active ? "border-dark font-bold text-ink" : "border-transparent font-medium text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 font-semibold">
          <Avatar name={user.name} />
          <span className="hidden sm:inline">{user.name}</span>
        </div>
      </div>
    </header>
  );
}
