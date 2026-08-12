import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userSettings } from "@/lib/schema";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const emailLower = email.toLowerCase().trim();

  const [existing] = await db.select().from(users).where(eq(users.email, emailLower));
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ name: name.trim(), email: emailLower, passwordHash })
    .returning({ id: users.id });

  await db.insert(userSettings).values({ userId: user.id });

  return NextResponse.json({ id: user.id, email: emailLower }, { status: 201 });
}
