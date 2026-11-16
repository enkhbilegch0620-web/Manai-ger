"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, ErrorText, Field } from "@/components/ui";
import { DEMO_PIN, ROLE_NAMES, familyName, findMemberByName, isValidPin, type Member } from "@/lib/mock-data";

// Нэвтрэх урсгал (UC02, activity A1):
//   1. Нэр оруулах  →  2a. PIN оруулах  эсвэл  2b. PIN үүсгэх (анх удаа)
// TODO(Гишүүн 3): findMemberByName, PIN шалгах, PIN хадгалахыг Supabase-ээр солино.
type Step = "name" | "pin" | "create";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState("");

  function finish(m: Member) {
    router.push(m.role === "admin" ? "/admin" : "/");
  }

  function backToName() {
    setStep("name");
    setMember(null);
    setError("");
  }

  function submitName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    if (!name.trim()) return setError("Нэрээ бичнэ үү");
    const m = findMemberByName(name);
    if (!m) return setError("Ийм нэртэй бүртгэл олдсонгүй");
    setMember(m);
    setError("");
    setStep(m.hasPin ? "pin" : "create");
  }

  function submitPin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pin = String(new FormData(e.currentTarget).get("pin") ?? "");
    if (pin !== DEMO_PIN) return setError("PIN код буруу байна");
    finish(member!);
  }

  function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const pin = String(data.get("pin") ?? "");
    const pin2 = String(data.get("pin2") ?? "");
    if (!isValidPin(pin)) return setError("PIN код 4–8 оронтой тоо байна");
    if (pin !== pin2) return setError("PIN кодууд таарахгүй байна");
    finish(member!);
  }

  if (step === "name") {
    return (
      <form onSubmit={submitName} className="flex flex-col gap-4" noValidate>
        <div className="mb-2 text-center">
          <h1 className="text-3xl font-extrabold">Манай гэр</h1>
          <p className="mt-1 text-muted">Админаас авсан нэрээ бичнэ үү</p>
        </div>
        <Field label="Нэр" id="name" name="name" placeholder="Жишээ нь: Ээж" autoComplete="username" autoFocus />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" block>
          Үргэлжлүүлэх
        </Button>
        <p className="rounded-md border border-dashed border-note bg-blue-50 px-3 py-2 text-xs text-note">
          Туршилт: Ээж, Тувшин, Админ (PIN 1234). Аав анх нэвтэрч байгаа тул PIN үүсгэнэ.
        </p>
      </form>
    );
  }

  const memberRow = member && (
    <div className="my-4 flex items-center gap-3 rounded-lg bg-bg px-4 py-3">
      <Avatar name={member.name} />
      <div>
        <div className="text-[15px] font-bold">{member.name}</div>
        <div className="text-xs text-muted">
          {ROLE_NAMES[member.role]}
          {member.familyId ? ` · ${familyName(member.familyId)}` : ""}
        </div>
      </div>
    </div>
  );

  const back = (
    <button type="button" onClick={backToName} className="mx-auto text-[13px] font-semibold hover:underline">
      ← Өөр нэрээр нэвтрэх
    </button>
  );

  if (step === "create") {
    return (
      <form onSubmit={submitCreate} className="flex flex-col gap-4" noValidate>
        <div>
          <h1 className="text-[26px] font-extrabold">PIN код үүсгэх</h1>
          <p className="text-[13px] text-muted">Анх удаа нэвтэрч байна</p>
          {memberRow}
        </div>
        <Field label="PIN код (4–8 оронтой тоо)" id="pin" name="pin" type="password" inputMode="numeric" maxLength={8} autoComplete="new-password" autoFocus />
        <Field label="PIN кодоо давтана уу" id="pin2" name="pin2" type="password" inputMode="numeric" maxLength={8} autoComplete="new-password" />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" block>
          Хадгалаад нэвтрэх
        </Button>
        {back}
      </form>
    );
  }

  return (
    <form onSubmit={submitPin} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-[26px] font-extrabold">Нэвтрэх</h1>
        {memberRow}
      </div>
      <Field label="PIN код" id="pin" name="pin" type="password" inputMode="numeric" maxLength={8} autoComplete="current-password" autoFocus />
      <ErrorText>{error}</ErrorText>
      <Button type="submit" block>
        Нэвтрэх
      </Button>
      {back}
    </form>
  );
}
