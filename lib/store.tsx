"use client";

// Хуудсууд хооронд хуваалцах ЖИШЭЭ төлөв (гэрийн ажил, хийсэн тэмдэглэл, захиалга).
// Хуудас дахин ачаалахад анхны жишээ өгөгдөл рүү буцна.
// TODO(Гишүүн 2, 3): энэ файлын функц бүрийг Supabase-ийн уншилт/бичилтээр солино
//   chores, chore_days, chore_done, shopping хүснэгтүүд.

import { createContext, useContext, useRef, useState } from "react";
import { chores as initialChores, shopping as initialShopping, type Chore, type ShoppingItem } from "@/lib/mock-data";

export type ChoreInput = Pick<Chore, "title" | "mode" | "days" | "onceOffset">;

type Store = {
  chores: Chore[];
  /** `${choreId}|${dayOffset}` → хийсэн гишүүний id */
  doneBy: Record<string, number>;
  items: ShoppingItem[];
  addChores: (input: ChoreInput, memberIds: number[]) => void;
  updateChore: (id: number, input: ChoreInput & { memberId: number | null }) => void;
  deleteChore: (id: number) => void;
  toggleDone: (choreId: number, dayOffset: number, by: number) => void;
  addItem: (text: string, qty: string, by: number) => void;
  toggleGot: (id: number, by: number, at: string) => void;
  deleteItem: (id: number) => void;
  clearGot: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const nextId = useRef(1000);
  const [chores, setChores] = useState<Chore[]>(initialChores);
  const [doneBy, setDoneBy] = useState<Record<string, number>>({ "14|0": 2 });
  const [items, setItems] = useState<ShoppingItem[]>(initialShopping);

  const store: Store = {
    chores,
    doneBy,
    items,
    addChores(input, memberIds) {
      // Сонгосон гишүүн бүрт тусдаа ажил үүснэ (UC10).
      const created = memberIds.map((memberId) => ({ ...input, id: ++nextId.current, memberId }));
      setChores((prev) => [...prev, ...created]);
    },
    updateChore(id, input) {
      setChores((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
    },
    deleteChore(id) {
      setChores((prev) => prev.filter((c) => c.id !== id));
      setDoneBy((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${id}|`))));
    },
    toggleDone(choreId, dayOffset, by) {
      const key = `${choreId}|${dayOffset}`;
      setDoneBy((prev) => {
        const next = { ...prev };
        if (key in next) delete next[key];
        else next[key] = by;
        return next;
      });
    },
    addItem(text, qty, by) {
      setItems((prev) => [...prev, { id: ++nextId.current, text, qty, orderedBy: by, got: false }]);
    },
    toggleGot(id, by, at) {
      setItems((prev) =>
        prev.map((s) =>
          s.id !== id ? s : s.got ? { ...s, got: false, gotBy: null, gotAt: undefined } : { ...s, got: true, gotBy: by, gotAt: at },
        ),
      );
    },
    deleteItem(id) {
      setItems((prev) => prev.filter((s) => s.id !== id));
    },
    clearGot() {
      setItems((prev) => prev.filter((s) => !s.got));
    },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore-ийг StoreProvider дотор ашиглана");
  return store;
}
