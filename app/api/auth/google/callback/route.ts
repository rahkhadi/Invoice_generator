import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("googleOAuthState")?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?google=failed", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${requestUrl.origin}/api/auth/google/callback`;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?google=not-configured", request.url));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/login?google=failed", request.url));
  const tokenJson = await tokenResponse.json();

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` }
  });
  if (!userInfoResponse.ok) return NextResponse.redirect(new URL("/login?google=failed", request.url));
  const googleUser = (await userInfoResponse.json()) as GoogleUserInfo;

  const user = await prisma.user.upsert({
    where: { email: googleUser.email.toLowerCase() },
    update: { googleId: googleUser.sub, name: googleUser.name, image: googleUser.picture },
    create: {
      email: googleUser.email.toLowerCase(),
      googleId: googleUser.sub,
      name: googleUser.name,
      image: googleUser.picture
    }
  });

  cookieStore.delete("googleOAuthState");
  await setSessionCookie(user.id);
  return NextResponse.redirect(new URL("/profile", request.url));
}
