"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "@/components/Modal";
import { ErrorText, Field } from "@/components/ui";
import { WEEKDAYS_SHORT, type Chore, type Member } from "@/lib/mock-data";
import type { ChoreInput } from "@/lib/store";
import { addDays, offsetFromISO, toISODate } from "@/lib/useToday";

type Mode = Chore["mode"];

// Гэрийн ажил өгөх (UC10) болон засах (UC11) цонх.
// Шинээр өгөхөд хэд хэдэн гишүүн сонгож болно; засахад нэг гишүүн эсвэл "Хэн ч хийж болно".
export default function ChoreDialog({
  chore,
  preselect,
  members,
  today,
  onClose,
  onCreate,
  onUpdate,
}: {
  chore?: Chore;
  preselect?: number;
  members: Member[];
  today: Date;
  onClose: () => void;
  onCreate: (input: ChoreInput, memberIds: number[]) => void;
  onUpdate: (id: number, input: ChoreInput & { memberId: number | null }) => void;
}) {
  const editing = !!chore;
  const [mode, setMode] = useState<Mode>(chore?.mode ?? "daily");
  const [days, setDays] = useState<number[]>(chore?.days ?? []);
  const [error, setError] = useState("");
  const defaultDate = toISODate(addDays(today, chore?.onceOffset ?? 0));

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return setError("Ажлын нэрийг бичнэ үү");

    let onceOffset: number | undefined;
    if (mode === "weekly" && days.length === 0) return setError("Дор хаяж нэг гараг сонгоно уу");
    if (mode === "once") {
      const off = offsetFromISO(String(data.get("onceDate") ?? ""), today);
      if (off === null) return setError("Огноогоо зөв оруулна уу");
      onceOffset = off;
    }
    const input: ChoreInput = { title, mode, days: mode === "weekly" ? days : [], onceOffset };

    if (editing) {
      const raw = String(data.get("member") ?? "");
      onUpdate(chore.id, { ...input, memberId: raw ? Number(raw) : null });
    } else {
      const ids = data.getAll("members").map(Number);
      if (ids.length === 0) return setError("Дор хаяж нэг гишүүн сонгоно уу");
      onCreate(input, ids);
    }
    onClose();
  }

  return (
    <Modal
      title={editing ? "Гэрийн ажил засах" : "Гэрийн ажил өгөх"}
      sub={editing ? undefined : "Сонгосон гишүүн бүрт тусдаа ажил үүснэ"}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Юу хийх вэ" id="title" name="title" defaultValue={chore?.title} placeholder="Жишээ нь: Аяга угаах" autoComplete="off" autoFocus />

        {editing ? (
          <div>
            <label htmlFor="member" className="mb-1.5 block text-[13px] font-semibold">
              Хэн хийх вэ
            </label>
            <select
              id="member"
              name="member"
              defaultValue={chore.memberId ?? ""}
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-base focus:outline-2 focus:outline-dark"
            >
              <option value="">Хэн ч хийж болно</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Хэнд өгөх вэ</legend>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold has-checked:border-dark"
                >
                  <input type="checkbox" name="members" value={m.id} defaultChecked={m.id === preselect} className="size-4 accent-dark" />
                  {m.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold">Давтамж</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {(
              [
                ["daily", "Өдөр бүр"],
                ["weekly", "Сонгосон гарагуудад"],
                ["once", "Нэг удаа"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="size-4 accent-dark" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "weekly" && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold">Гарагууд</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS_SHORT.map((label, i) => {
                const on = days.includes(i + 1);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(i + 1)}
                    className={`h-10 w-11 rounded-lg border font-semibold sm:w-14 ${on ? "border-dark bg-dark text-white" : "border-line bg-white hover:bg-bg"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {mode === "once" && <Field label="Өдөр" id="onceDate" name="onceDate" type="date" defaultValue={defaultDate} />}

        <ErrorText>{error}</ErrorText>
        <ModalFooter onCancel={onClose} />
      </form>
    </Modal>
  );
}
