import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const getSession = cache(() => auth());

export async function requireUserId(): Promise<number> {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return Number(id);
}
