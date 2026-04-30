import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().optional()
});

export async function POST(request: Request) {
  const payload = loginSchema.parse(await request.json());
  const email = payload.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    return NextResponse.json({ error: "Account not found. Please create an account first." }, { status: 404 });
  }

  if (!existing.passwordHash) {
    return NextResponse.json({ error: "This account does not have a platform password. Use Google sign-in or create a platform account." }, { status: 401 });
  }

  if (!payload.password || !verifyPassword(payload.password, existing.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await setSessionCookie(existing.id);
  return NextResponse.json(existing);
}
