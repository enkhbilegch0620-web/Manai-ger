"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/Modal";
import { Button, Card } from "@/components/ui";
import { currentUser, memberName, type ShoppingItem } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { nowHM } from "@/lib/useToday";

type Dialog = { kind: "delete"; item: ShoppingItem } | { kind: "clear" } | null;

// Захиалга (UC05, UC06): гэр бүлийн дэлгүүрийн нэг жагсаалт.
export default function ShopView() {
  const user = currentUser;
  const store = useStore();
  const [dialog, setDialog] = useState<Dialog>(null);
  const textRef = useRef<HTMLInputElement>(null);

  const items = [...store.items].sort((a, b) => Number(a.got) - Number(b.got));
  const gotCount = items.filter((s) => s.got).length;
  const close = () => setDialog(null);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("text") ?? "").trim();
    // Нэр хоосон бол юу ч хийхгүй, курсорыг талбарт буцаана (UC05, 2а).
    if (!text) return textRef.current?.focus();
    store.addItem(text, String(data.get("qty") ?? "").trim(), user.id);
    form.reset();
    textRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] leading-tight font-extrabold sm:text-[32px]">Захиалга</h1>
        <p className="mt-1 text-muted">Гэр бүлийн дэлгүүрийн жагсаалт</p>
      </div>

      <Card>
        <form onSubmit={add} className="grid grid-cols-[1fr_100px] items-end gap-3 sm:grid-cols-[1fr_180px_auto]">
          <div>
            <label htmlFor="text" className="mb-1.5 block text-[13px] font-semibold">
              Юу авах вэ
            </label>
            <input
              ref={textRef}
              id="text"
              name="text"
              placeholder="Жишээ нь: Сүү"
              autoComplete="off"
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-base placeholder:text-muted focus:outline-2 focus:outline-dark"
            />
          </div>
          <div>
            <label htmlFor="qty" className="mb-1.5 block text-[13px] font-semibold">
              Хэмжээ
            </label>
            <input
              id="qty"
              name="qty"
              placeholder="2 л"
              autoComplete="off"
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-base placeholder:text-muted focus:outline-2 focus:outline-dark"
            />
          </div>
          <Button type="submit" className="col-span-2 h-10 sm:col-span-1">
            Захих
          </Button>
        </form>
      </Card>

      <div>
        <p className="text-[13px] font-semibold">
          {gotCount} / {items.length} авсан
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded bg-soft" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={gotCount} aria-label="Авсан бараа">
          <div className="h-full bg-dark transition-[width] duration-200" style={{ width: `${items.length ? (gotCount / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      <Card className="py-1.5!">
        <ul className="divide-y divide-soft">
          {items.length === 0 && <li className="py-3 text-muted">Жагсаалт хоосон байна.</li>}
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                checked={s.got}
                onChange={() => store.toggleGot(s.id, user.id, nowHM())}
                aria-label={`${s.text} авсан`}
                className="size-[18px] shrink-0 cursor-pointer accent-dark"
              />
              <div className="min-w-0 flex-1">
                <div>
                  <span className={`font-semibold ${s.got ? "text-muted line-through" : ""}`}>{s.text}</span>
                  {s.qty && <span className="ml-2 text-[13px] text-muted">{s.qty}</span>}
                </div>
                <div className="text-xs text-muted">
                  {s.got ? `${memberName(s.gotBy ?? null)} авсан${s.gotAt ? ` · ${s.gotAt}` : ""}` : `${memberName(s.orderedBy)} захисан`}
                </div>
              </div>
              {!s.got && (
                <button type="button" onClick={() => setDialog({ kind: "delete", item: s })} className="text-[13px] font-semibold text-danger hover:underline">
                  Устгах
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {gotCount > 0 && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setDialog({ kind: "clear" })}>
            Авсныг цэвэрлэх
          </Button>
        </div>
      )}

      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Устгах уу?"
          text={`«${dialog.item.text}» жагсаалтаас устгагдана.`}
          onConfirm={() => store.deleteItem(dialog.item.id)}
          onClose={close}
        />
      )}
      {dialog?.kind === "clear" && (
        <ConfirmDialog
          title="Авсныг цэвэрлэх үү?"
          text="Авсан гэж тэмдэглэсэн бүх бараа жагсаалтаас устна."
          confirmLabel="Цэвэрлэх"
          onConfirm={store.clearGot}
          onClose={close}
        />
      )}
    </div>
  );
}
