"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Card, CardTitle, Tag } from "@/components/ui";
import { WEEKDAYS, WEEKDAYS_SHORT, choresOn, currentUser, memberName, plans, weekdayOf } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { addDays, nowHM, useToday } from "@/lib/useToday";

export default function HomeView() {
  const today = useToday();
  const user = currentUser;
  const [offset, setOffset] = useState(0);
  const store = useStore();

  if (!today) return <div className="h-96" aria-busy="true" />;

  const day = addDays(today, offset);
  const wd = weekdayOf(day);
  const list = choresOn(store.chores, offset, wd, user.familyId)
    .map((c) => ({ c, by: store.doneBy[`${c.id}|${offset}`] }))
    .sort((a, b) => Number(!!a.by) - Number(!!b.by) || Number(b.c.memberId === user.id) - Number(a.c.memberId === user.id));
  const left = list.filter((x) => !x.by).length;
  const mine = list.filter((x) => x.c.memberId === user.id);
  const mineLeft = mine.filter((x) => !x.by);
  const items = store.items.filter((s) => !s.got);
  const myPlans = plans.filter((p) => p.memberId === user.id && p.dayOffset === offset).sort((a, b) => a.from.localeCompare(b.from));
  const isToday = offset === 0;

  const toggleChore = (id: number) => store.toggleDone(id, offset, user.id);
  const markGot = (id: number) => store.toggleGot(id, user.id, nowHM());

  return (
    <div>
      <p className="text-[13px] text-muted">
        {WEEKDAYS[wd - 1]}, {day.getMonth() + 1} сарын {day.getDate()}
      </p>
      <h1 className="mt-1 text-[26px] leading-tight font-extrabold sm:text-[32px]">
        {isToday ? "Өнөөдрийн" : `${WEEKDAYS[wd - 1]} гарагийн`} гэр бүлийн өдөр.
      </h1>

      <div role="group" aria-label="Өдөр сонгох" className="mt-5 mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(today, i);
          const on = i === offset;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              onClick={() => setOffset(i)}
              className={`h-8 rounded-full border px-3.5 text-[13px] font-semibold ${on ? "border-dark bg-dark text-white" : "border-line bg-white hover:bg-bg"}`}
            >
              {i === 0 ? "Өнөөдөр" : `${WEEKDAYS_SHORT[weekdayOf(d) - 1]} ${d.getDate()}`}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <CardTitle eyebrow="Гэрийн ажил" title={isToday ? "Өнөөдрийн гэрийн ажил" : "Энэ өдрийн гэрийн ажил"} />
              <Tag>{left} үлдсэн</Tag>
            </div>
            <ul className="mt-2 divide-y divide-soft">
              {list.length === 0 && <li className="py-3 text-muted">Энэ өдөр гэрийн ажил алга.</li>}
              {list.map(({ c, by }) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={!!by}
                    onChange={() => toggleChore(c.id)}
                    aria-label={c.title}
                    className="size-[18px] shrink-0 cursor-pointer accent-dark"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${by ? "text-muted line-through" : ""}`}>{c.title}</div>
                    <div className="text-xs text-muted">
                      {by ? `${memberName(by)} хийсэн` : c.memberId ? memberName(c.memberId) : "Хэн ч хийж болно"}
                    </div>
                  </div>
                  <Avatar name={c.memberId ? memberName(c.memberId) : "—"} />
                </li>
              ))}
            </ul>
            {user.role === "parent" && (
              <Link href="/chores" className="mt-2 inline-block text-[13px] font-semibold hover:underline">
                + Ажил өгөх
              </Link>
            )}
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <CardTitle eyebrow="Дэлгүүр" title="Авах зүйлс" />
              <Link href="/shop" className="text-[13px] font-semibold whitespace-nowrap hover:underline">
                Захиалга нэмэх ›
              </Link>
            </div>
            <ul className="mt-2 divide-y divide-soft">
              {items.length === 0 && <li className="py-3 text-muted">Авах зүйл алга.</li>}
              {items.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    onChange={() => markGot(s.id)}
                    aria-label={`${s.text} авсан`}
                    className="size-[18px] shrink-0 cursor-pointer accent-dark"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {s.qty} {s.text}
                    </div>
                    <div className="text-xs text-muted">{memberName(s.orderedBy)} захисан</div>
                  </div>
                  <Avatar name={memberName(s.orderedBy)} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="bg-dark! text-white">
            <CardTitle eyebrow="Миний ажил" dark />
            {mine.length === 0 ? (
              <p className="mt-1.5 text-xl font-bold">Танд ажил оноогдоогүй</p>
            ) : mineLeft.length === 0 ? (
              <p className="mt-1.5 text-xl font-bold">Таны ажил бүгд дууссан</p>
            ) : (
              <>
                <p className="mt-1.5 mb-2 text-xl font-bold">{mineLeft.length} ажил үлдсэн</p>
                <ul className="text-zinc-300">
                  {mineLeft.map((x) => (
                    <li key={x.c.id}>• {x.c.title}</li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card>
            <CardTitle eyebrow="Тарсны дараа" title="Миний төлөвлөгөө" />
            <ul className="mt-2 divide-y divide-soft">
              {myPlans.length === 0 && <li className="py-2.5 text-muted">Төлөвлөгөө алга.</li>}
              {myPlans.map((p) => (
                <li key={p.id} className="flex gap-3 py-2.5">
                  <b className="whitespace-nowrap">
                    {p.from}
                    {p.to && `–${p.to}`}
                  </b>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
            {/* TODO(3-р долоо хоног): "Тарсны дараах ажил нэмэх" цонх */}
            <Link href="/profile" className="mt-1 inline-block text-[13px] font-semibold hover:underline">
              + Тарсны дараах ажил
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
