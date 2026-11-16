import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Button, Card, CardTitle, buttonClass } from "@/components/ui";
import { ROLE_NAMES, WEEKDAYS, currentUser, familyName, plans, schedules } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Профайл · Манай гэр" };

const dayLabel = (offset: number) => (offset === 0 ? "Өнөөдөр" : offset === 1 ? "Маргааш" : `${offset} хоногийн дараа`);

// Ажил (эцэг эх) / Сурагч (хүүхэд) — өөрийн долоо хоногийн хуваарь, төлөвлөгөө.
// TODO(3-р долоо хоног): "Засах", "Оруулах", "Нэр засах", "Устгах" товчны цонхнууд.
export default function ProfilePage() {
  const user = currentUser;
  const child = user.role === "child";
  const week = schedules[user.id] ?? {};
  const myPlans = plans.filter((p) => p.memberId === user.id).sort((a, b) => a.dayOffset - b.dayOffset || a.from.localeCompare(b.from));

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="flex-1">
          <h1 className="text-[22px] font-extrabold">{user.name}</h1>
          <p className="text-[13px] text-muted">
            {ROLE_NAMES[user.role]} · {familyName(user.familyId)}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" type="button">
            Нэр засах
          </Button>
          {/* TODO(Гишүүн 3): session-оос гаргана */}
          <Link href="/login" className={buttonClass("secondary")}>
            Гарах
          </Link>
        </div>
      </Card>

      <Card>
        <CardTitle eyebrow="Хуваарь" title="7 хоногийн хуваарь" />
        <ul className="mt-2 divide-y divide-soft">
          {WEEKDAYS.map((name, i) => {
            const s = week[i + 1];
            const type = !s ? null : s.place === "off" ? "Амралтын өдөр" : child ? "Хичээлтэй өдөр" : "Ажлын өдөр";
            return (
              <li key={name} className="flex items-center gap-3 py-2">
                <b className="w-[70px] shrink-0 sm:w-[90px]">{name}</b>
                <span className={`hidden w-[150px] shrink-0 sm:block ${type ? "" : "text-muted"}`}>{type ?? "Оруулаагүй"}</span>
                <span className="flex-1 font-semibold">{s && s.place !== "off" ? `${s.start}–${s.end}` : s ? "—" : ""}</span>
                {child && s && s.place !== "off" && <span className="hidden text-muted sm:block">{s.lessons} хичээл</span>}
                <Button variant={s ? "secondary" : "primary"} type="button" className="h-8 px-3 text-[13px]">
                  {s ? "Засах" : "Оруулах"}
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle eyebrow="Төлөвлөгөө" title="Тарсны дараах ажил" />
        <ul className="mt-2 divide-y divide-soft">
          {myPlans.length === 0 && <li className="py-2.5 text-muted">Төлөвлөгөө алга.</li>}
          {myPlans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
              <b className="w-[140px] whitespace-nowrap">{dayLabel(p.dayOffset)}</b>
              <span className="w-[100px] font-semibold">
                {p.from}
                {p.to && `–${p.to}`}
              </span>
              <span className="flex-1">{p.text}</span>
              <button type="button" className="text-[13px] font-semibold text-danger hover:underline">
                Устгах
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-1 text-[13px] font-semibold hover:underline">
          + Тарсны дараах ажил нэмэх
        </button>
      </Card>
    </div>
  );
}
