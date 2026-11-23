"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText } from "@/components/ui";
import { checkName, createPin, login, type Role } from "@/lib/auth-api";
import { PIN_RE, USE_MOCK } from "@/lib/auth-shared";

// Нэвтрэх урсгал (UC02, activity A1):
//   1. Нэр оруулах → 2а. PIN оруулах эсвэл 2б. PIN үүсгэх (анх удаа)
// Логик: Гишүүн 3 · Харагдац: Figma (Гишүүн 1)
type Step = "name" | "pin" | "create";

const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-base placeholder:text-muted focus:outline-2 focus:outline-dark";

function PinDots({ length }: { length: number }) {
  return (
    <div className="flex justify-center gap-2" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`size-2.5 rounded-full border-2 transition-colors ${i < length ? "border-dark bg-dark" : "border-line"}`} />
      ))}
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 8);

  function goHome(role: Role) {
    router.push(role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  function backToName() {
    setStep("name");
    setPin("");
    setPin2("");
    setError("");
  }

  async function run(action: () => Promise<void>) {
    setError("");
    setLoading(true);
    try {
      await action();
    } catch {
      setError("Холбогдож чадсангүй. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  }

  function onName(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) return setError("Нэвтрэх нэрээ бичнэ үү.");
    run(async () => {
      const res = await checkName(username);
      if (res.status === "not_found") return setError("Ийм нэртэй бүртгэл олдсонгүй. Админаас нэрээ асууна уу.");
      setDisplayName(res.name);
      setStep(res.status === "has_pin" ? "pin" : "create");
    });
  }

  function onPin(e: FormEvent) {
    e.preventDefault();
    if (!PIN_RE.test(pin)) return setError("PIN нь 4–8 оронтой тоо байна.");
    run(async () => {
      const res = await login(username, pin);
      if (res.ok) goHome(res.role);
      else setError(res.error);
    });
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!PIN_RE.test(pin)) return setError("PIN нь 4–8 оронтой тоо байна.");
    if (pin !== pin2) return setError("Хоёр PIN таарахгүй байна.");
    run(async () => {
      const res = await createPin(username, pin);
      if (res.ok) goHome(res.role);
      else setError(res.error);
    });
  }

  const back = (
    <button type="button" onClick={backToName} className="mx-auto text-[13px] font-semibold hover:underline">
      ← Өөр нэрээр нэвтрэх
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2 text-center">
        <h1 className="text-3xl font-extrabold">Манай гэр</h1>
        <p className="mt-1 text-muted">
          {step === "name" && "Админаас авсан нэрээрээ нэвтэрнэ үү."}
          {step === "pin" && `Сайн уу, ${displayName}. PIN кодоо оруулна уу.`}
          {step === "create" && `Сайн уу, ${displayName}. Анх удаа орж байна, PIN код үүсгэнэ үү.`}
        </p>
      </div>

      {step === "name" && (
        <form onSubmit={onName} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="username" className="mb-1.5 block text-[13px] font-semibold">
              Нэвтрэх нэр
            </label>
            <input
              id="username"
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              placeholder="Жишээ нь: bat_eej"
            />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" block disabled={loading}>
            {loading ? "Шалгаж байна..." : "Үргэлжлүүлэх"}
          </Button>
          {USE_MOCK && (
            <p className="rounded-md border border-dashed border-note bg-blue-50 px-3 py-2 text-xs text-note">
              Туршилт: bat_eej, bat_tuvshin, admin (PIN 1234). bat_saraa анх нэвтэрч байгаа тул PIN үүсгэнэ.
            </p>
          )}
        </form>
      )}

      {step === "pin" && (
        <form onSubmit={onPin} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="pin" className="mb-1.5 block text-[13px] font-semibold">
              PIN код
            </label>
            <input
              id="pin"
              className={`${inputClass} text-center tracking-[0.4em]`}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(digits(e.target.value))}
              autoFocus
            />
          </div>
          <PinDots length={pin.length} />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" block disabled={loading}>
            {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
          </Button>
          {back}
        </form>
      )}

      {step === "create" && (
        <form onSubmit={onCreate} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="pin" className="mb-1.5 block text-[13px] font-semibold">
              Шинэ PIN (4–8 оронтой тоо)
            </label>
            <input
              id="pin"
              className={`${inputClass} text-center tracking-[0.4em]`}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={pin}
              onChange={(e) => setPin(digits(e.target.value))}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="pin2" className="mb-1.5 block text-[13px] font-semibold">
              PIN-ээ давтаж оруулна уу
            </label>
            <input
              id="pin2"
              className={`${inputClass} text-center tracking-[0.4em]`}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={pin2}
              onChange={(e) => setPin2(digits(e.target.value))}
            />
          </div>
          <PinDots length={pin.length} />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" block disabled={loading}>
            {loading ? "Хадгалж байна..." : "PIN хадгалаад нэвтрэх"}
          </Button>
          {back}
        </form>
      )}
    </div>
  );
}
