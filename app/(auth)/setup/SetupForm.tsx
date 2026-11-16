"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText, Field } from "@/components/ui";
import { isValidPin } from "@/lib/mock-data";

export default function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const pin = String(data.get("pin") ?? "");
    const pin2 = String(data.get("pin2") ?? "");
    if (!name) return setError("Нэрээ бичнэ үү");
    if (!isValidPin(pin)) return setError("PIN код 4–8 оронтой тоо байна");
    if (pin !== pin2) return setError("PIN кодууд таарахгүй байна");
    // TODO(Гишүүн 3): админы бүртгэлийг Supabase-д үүсгэнэ.
    router.push("/admin");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-[26px] font-extrabold">Анхны админ үүсгэх</h1>
        <p className="text-[13px] text-muted">Системийн удирдлагын бүртгэл</p>
      </div>
      <Field label="Нэр" id="name" name="name" placeholder="Жишээ нь: Админ" autoComplete="username" autoFocus />
      <Field label="PIN код (4–8 оронтой тоо)" id="pin" name="pin" type="password" inputMode="numeric" maxLength={8} autoComplete="new-password" />
      <Field label="PIN кодоо давтана уу" id="pin2" name="pin2" type="password" inputMode="numeric" maxLength={8} autoComplete="new-password" />
      <ErrorText>{error}</ErrorText>
      <Button type="submit" block>
        Админ үүсгэх
      </Button>
    </form>
  );
}
