import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import AuthForm from "../AuthForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign up – Nudge" };

export default async function Signup() {
  if (await getUser()) redirect("/dashboard");
  return <AuthForm mode="signup" />;
}
