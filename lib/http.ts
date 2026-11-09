import { NextResponse } from "next/server";
import { getUser, type User } from "./auth";

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser(): Promise<User | NextResponse> {
  const user = await getUser();
  return user ?? err("Please log in.", 401);
}

export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
export const isTime = (s: unknown): s is string => typeof s === "string" && (s === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(s));
