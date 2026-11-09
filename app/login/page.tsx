import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import AuthForm from "../AuthForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in – Nudge" };

export default async function Login() {
  if (await getUser()) redirect("/dashboard");
  return <AuthForm mode="login" />;
}
