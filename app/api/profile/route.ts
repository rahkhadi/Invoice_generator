import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileSchema = z.object({
  companyName: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  logoUrl: z.string().optional().nullable()
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json(user.profile ?? {});
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const payload = profileSchema.parse(await request.json());
  const profile = await prisma.companyProfile.upsert({
    where: { userId: user.id },
    update: payload,
    create: { ...payload, userId: user.id }
  });
  return NextResponse.json(profile);
}
