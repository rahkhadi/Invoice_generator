import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  const payload = signupSchema.parse(await request.json());
  const email = payload.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: payload.name, passwordHash: hashPassword(payload.password) },
    create: { name: payload.name, email, passwordHash: hashPassword(payload.password) }
  });
  await setSessionCookie(user.id);
  return NextResponse.json(user, { status: 201 });
}
