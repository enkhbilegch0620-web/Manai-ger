"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Nunito } from "next/font/google";
import { checkName, login, createPin, type Role } from "@/lib/auth-api";

const nunito = Nunito({ subsets: ["latin", "cyrillic"], weight: ["400", "600", "800"] });

type Step = "name" | "pin" | "create";
const PIN_RE = /^\d{4,8}$/;

function PinDots({ length }: { length: number }) {
  return (
    <div className="flex justify-center gap-2 pt-1" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full border-2 transition-colors ${
            i < length ? "border-[#F2B134] bg-[#F2B134]" : "border-[#C5D3CB] bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
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

  async function onName(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Нэрээ оруулна уу.");
    setLoading(true);
    try {
      const res = await checkName(name);
      if (res.status === "not_found") {
        setError("Ийм нэртэй бүртгэл олдсонгүй. Админаас нэрээ асууна уу.");
      } else {
        setDisplayName(res.name);
        setStep(res.status === "has_pin" ? "pin" : "create");
      }
    } catch {
      setError("Холбогдож чадсангүй. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  }

  async function onPin(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!PIN_RE.test(pin)) return setError("PIN нь 4–8 оронтой тоо байна.");
    setLoading(true);
    try {
      const res = await login(name, pin);
      if (res.ok) goHome(res.role);
      else setError(res.error);
    } catch {
      setError("Холбогдож чадсангүй. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!PIN_RE.test(pin)) return setError("PIN нь 4–8 оронтой тоо байна.");
    if (pin !== pin2) return setError("Хоёр PIN таарахгүй байна.");
    setLoading(true);
    try {
      const res = await createPin(name, pin);
      if (res.ok) goHome(res.role);
      else setError(res.error);
    } catch {
      setError("Холбогдож чадсангүй. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-xl border border-[#C5D3CB] bg-white px-4 py-3 text-base text-[#1E2B2A] placeholder:text-[#8A9B93] focus:border-[#1F5C4D] focus:outline-none focus:ring-2 focus:ring-[#1F5C4D]/30";
  const button =
    "w-full rounded-xl bg-[#1F5C4D] px-4 py-3 text-base font-extrabold text-white transition hover:bg-[#184a3e] focus:outline-none focus:ring-2 focus:ring-[#1F5C4D] focus:ring-offset-2 disabled:opacity-60";

  return (
    <main className={`${nunito.className} flex min-h-screen items-center justify-center bg-[#EAF0EC] px-4 py-10`}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-[0_8px_30px_rgba(31,92,77,0.12)]">
        <div className="mb-6 text-center">
          <svg viewBox="0 0 64 64" className="mx-auto mb-3 h-14 w-14" aria-hidden="true">
            <path d="M8 30 32 10l24 20v24a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill="#1F5C4D" />
            <rect x="26" y="36" width="12" height="22" rx="2" fill="#F2B134" />
          </svg>
          <h1 className="text-3xl font-extrabold text-[#1F4D43]">Манай гэр</h1>
          <p className="mt-1 text-sm text-[#5B6E66]">
            {step === "name" && "Админаас авсан нэрээрээ нэвтэрнэ үү."}
            {step === "pin" && `Сайн уу, ${displayName}. PIN кодоо оруулна уу.`}
            {step === "create" && `Сайн уу, ${displayName}. Анх удаа орж байна, PIN код үүсгэнэ үү.`}
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-[#FBE9E7] px-4 py-3 text-sm text-[#A12D25]">
            {error}
          </p>
        )}

        {step === "name" && (
          <form onSubmit={onName} className="space-y-4" noValidate>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#1E2B2A]">Нэвтрэх нэр</span>
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                autoFocus
                placeholder="Жишээ нь: Бат"
              />
            </label>
            <button className={button} disabled={loading}>
              {loading ? "Шалгаж байна..." : "Үргэлжлүүлэх"}
            </button>
          </form>
        )}

        {step === "pin" && (
          <form onSubmit={onPin} className="space-y-4" noValidate>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#1E2B2A]">PIN код</span>
              <input
                className={`${input} text-center tracking-[0.4em]`}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(digits(e.target.value))}
                autoFocus
              />
            </label>
            <PinDots length={pin.length} />
            <button className={button} disabled={loading}>
              {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
            </button>
            <button type="button" onClick={backToName} className="w-full text-sm font-semibold text-[#1F5C4D] underline">
              Өөр нэрээр нэвтрэх
            </button>
          </form>
        )}

        {step === "create" && (
          <form onSubmit={onCreate} className="space-y-4" noValidate>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#1E2B2A]">Шинэ PIN (4–8 оронтой тоо)</span>
              <input
                className={`${input} text-center tracking-[0.4em]`}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pin}
                onChange={(e) => setPin(digits(e.target.value))}
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#1E2B2A]">PIN-ээ давтаж оруулна уу</span>
              <input
                className={`${input} text-center tracking-[0.4em]`}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pin2}
                onChange={(e) => setPin2(digits(e.target.value))}
              />
            </label>
            <PinDots length={pin.length} />
            <button className={button} disabled={loading}>
              {loading ? "Хадгалж байна..." : "PIN хадгалаад нэвтрэх"}
            </button>
            <button type="button" onClick={backToName} className="w-full text-sm font-semibold text-[#1F5C4D] underline">
              Өөр нэрээр нэвтрэх
            </button>
          </form>
        )}
      </div>
    </main>
  );
}