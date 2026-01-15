import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";

export const proxy = async (req: NextRequest) => {
  const pathName = req.nextUrl.pathname;

  const roomMatched = pathName.match(/^\/room\/([^/]+)$/);
  if (!roomMatched) return NextResponse.redirect(new URL("/", req.url));

  const roomId = roomMatched[1];

  const meta = await redis.hgetall<{ createdAt: number }>(`meta:${roomId}`);

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  const connected = await redis.lrange<string>(`connected:${roomId}`, 0, -1);

  const existingToken = req.cookies.get("x-auth-token")?.value;

  // Already registered user → allow
  if (existingToken && connected.includes(existingToken)) {
    return NextResponse.next();
  }

  // Room full
  if (!existingToken && connected.length >= 2) {
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  // Register new user
  const response = NextResponse.next();
  const token = nanoid();

  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  await redis.rpush(`connected:${roomId}`, token);

  return response;
};

export const config = {
  matcher: "/room/:path*",
};
