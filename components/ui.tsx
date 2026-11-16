// Figma-гийн component-уудтай тохирох жижиг UI хэсгүүд.
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-dark text-white hover:bg-black border-dark",
  secondary: "bg-white text-ink hover:bg-bg border-line",
  danger: "bg-danger text-white hover:opacity-90 border-danger",
};

export function buttonClass(variant: Variant = "primary", block = false) {
  return `inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark disabled:opacity-50 ${variants[variant]} ${block ? "h-[42px] w-full" : ""}`;
}

export function Button({
  variant = "primary",
  block = false,
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; block?: boolean }) {
  return <button className={`${buttonClass(variant, block)} ${className}`} {...props} />;
}

export function Field({ label, id, ...props }: ComponentProps<"input"> & { label: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      {/* text-base (16px): утсан дээр дарахад хуудас томрохоос сэргийлнэ */}
      <input
        id={id}
        className="h-10 w-full rounded-md border border-line bg-white px-3 text-base placeholder:text-muted focus:outline-2 focus:outline-dark"
        {...props}
      />
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl bg-white px-6 py-5 ${className}`}>{children}</section>;
}

export function CardTitle({ eyebrow, title, dark = false }: { eyebrow: string; title?: string; dark?: boolean }) {
  return (
    <div>
      <div className={`text-[11px] font-bold uppercase tracking-wide ${dark ? "text-zinc-400" : "text-muted"}`}>{eyebrow}</div>
      {title && <h2 className="mt-0.5 text-[19px] font-bold">{title}</h2>}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const s = size === "lg" ? "size-[52px] text-base" : "size-8 text-[11px]";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full border border-line bg-soft font-bold text-muted ${s}`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-muted">{children}</span>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[13px] font-semibold text-danger">
      {children}
    </p>
  );
}
