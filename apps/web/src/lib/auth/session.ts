import "server-only";
import { cookies } from "next/headers";
import type { SessionUser } from "./portals";

export const backendUrl = () => (process.env.BACKEND_URL ?? "https://lanttl-demovinstay.onrender.com").replace(/\/+$/, "");

/** Người dùng hiện tại cho Server Component (proxy.ts đã chặn người chưa đăng nhập; đây chỉ để hiển thị). */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookie = (await cookies()).toString();
    const res = await fetch(`${backendUrl()}/api/v1/auth/session`, { headers: { cookie }, cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { data?: { user: SessionUser | null } }).data?.user ?? null;
  } catch {
    return null;
  }
}
