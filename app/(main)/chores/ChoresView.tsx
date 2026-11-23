"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/Modal";
import { Avatar, Button, Card, Tag } from "@/components/ui";
import { ROLE_NAMES, currentUser, freqText, members, type Chore } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import ChoreDialog from "./ChoreDialog";

type Dialog = { kind: "create"; preselect?: number } | { kind: "edit"; chore: Chore } | { kind: "delete"; chore: Chore } | null;

// Гэрийн ажил (UC10, UC11): гишүүн бүрийн ажлыг картаар харуулна.
// Эцэг эх ажил өгч, засаж, устгана; сурагч зөвхөн харна.
export default function ChoresView() {
  const user = currentUser;
  const parent = user.role === "parent";
  const today = useToday();
  const store = useStore();
  const [dialog, setDialog] = useState<Dialog>(null);

  const family = members.filter((m) => m.familyId === user.familyId);
  const familyIds = new Set(family.map((m) => m.id));
  const familyChores = store.chores.filter((c) => c.memberId === null || familyIds.has(c.memberId));
  const unassigned = familyChores.filter((c) => c.memberId === null);
  const close = () => setDialog(null);

  const row = (c: Chore) => (
    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
      <span className="min-w-0 flex-1 font-semibold">{c.title}</span>
      <Tag>{freqText(c, today)}</Tag>
      {parent && (
        <span className="flex gap-3">
          <button type="button" onClick={() => setDialog({ kind: "edit", chore: c })} className="text-[13px] font-semibold hover:underline">
            Засах
          </button>
          <button type="button" onClick={() => setDialog({ kind: "delete", chore: c })} className="text-[13px] font-semibold text-danger hover:underline">
            Устгах
          </button>
        </span>
      )}
    </li>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-tight font-extrabold sm:text-[32px]">Гэрийн ажил</h1>
          <p className="mt-1 text-muted">{parent ? "Гишүүн бүрийн ажил" : "Өөрт оноогдсон ажлаа «Нүүр» хэсгээс тэмдэглэнэ"}</p>
        </div>
        {parent && (
          <Button type="button" onClick={() => setDialog({ kind: "create" })} className="h-10">
            + Хэд хэдэн гишүүнд ажил өгөх
          </Button>
        )}
      </div>

      <div className="grid items-start gap-5 md:grid-cols-2">
        {family.map((m) => {
          const list = familyChores.filter((c) => c.memberId === m.id);
          return (
            <Card key={m.id}>
              <div className="flex items-center gap-3 pb-3">
                <Avatar name={m.name} />
                <div>
                  <div className="text-[17px] font-bold">{m.name}</div>
                  <div className="text-xs text-muted">{ROLE_NAMES[m.role]}</div>
                </div>
              </div>
              <ul className="divide-y divide-soft border-t border-soft">
                {list.length === 0 && <li className="py-2.5 text-muted">Ажил оноогоогүй.</li>}
                {list.map(row)}
              </ul>
              {parent && (
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "create", preselect: m.id })}
                  className="mt-2 text-[13px] font-semibold hover:underline"
                >
                  + {m.name}-д ажил өгөх
                </button>
              )}
            </Card>
          );
        })}

        {unassigned.length > 0 && (
          <Card>
            <div className="pb-3">
              <div className="text-[17px] font-bold">Хуваарилаагүй</div>
              <div className="text-xs text-muted">Хэн ч хийж болно</div>
            </div>
            <ul className="divide-y divide-soft border-t border-soft">{unassigned.map(row)}</ul>
          </Card>
        )}
      </div>

      {today && (dialog?.kind === "create" || dialog?.kind === "edit") && (
        <ChoreDialog
          key={dialog.kind === "edit" ? `edit-${dialog.chore.id}` : `create-${dialog.preselect ?? "all"}`}
          chore={dialog.kind === "edit" ? dialog.chore : undefined}
          preselect={dialog.kind === "create" ? dialog.preselect : undefined}
          members={family}
          today={today}
          onClose={close}
          onCreate={store.addChores}
          onUpdate={store.updateChore}
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Устгах уу?"
          text={`«${dialog.chore.title}» ажил болон түүний хийсэн тэмдэглэлүүд устна.`}
          onConfirm={() => store.deleteChore(dialog.chore.id)}
          onClose={close}
        />
      )}
    </div>
  );
}
