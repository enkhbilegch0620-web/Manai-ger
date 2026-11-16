import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Нэвтрэх · Манай гэр" };

export default function LoginPage() {
  return <LoginForm />;
}
