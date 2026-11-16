import Link from "next/link";
import { buttonClass } from "@/components/ui";

// Дараагийн долоо хоногуудад хийх хуудсуудын түр орлуулагч.
export default function ComingSoon({ title, week, what }: { title: string; week: number; what: string }) {
  return (
    <div>
      <h1 className="text-[32px] leading-tight font-extrabold">{title}</h1>
      <p className="mt-1 text-muted">{what}</p>
      <div className="mt-6 rounded-xl border border-dashed border-line bg-white p-8 text-center">
        <p className="font-semibold">Энэ хуудсыг {week}-р долоо хоногт хийнэ.</p>
        <p className="mt-1 text-muted">Харагдацыг Figma-гийн wireframe дээрээс харна уу.</p>
        <Link href="/" className={`${buttonClass("secondary")} mt-4`}>
          Нүүр рүү буцах
        </Link>
      </div>
    </div>
  );
}
