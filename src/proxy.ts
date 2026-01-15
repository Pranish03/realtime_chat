import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";

export const proxy = async (req: NextRequest) => {
  const pathName = req.nextUrl.pathname;

  const roomMatched = pathName.match(/^\/room\/([^/]+)$/);
  if (!roomMatched) return NextResponse.redirect(new URL("/", req.url));

  const roomId = roomMatched[1];
  const connectedKey = `connected:${roomId}`;

  // Check if room exists
  const meta = await redis.hgetall<{ createdAt: number }>(`meta:${roomId}`);
  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  const existingToken = req.cookies.get("x-auth-token")?.value;

  // If user already has a token and is in the room, let them in
  if (existingToken && (await redis.sismember(connectedKey, existingToken))) {
    return NextResponse.next();
  }

  // Check room capacity (2 users max)
  const connectedCount = await redis.scard(connectedKey);
  if (!existingToken && connectedCount >= 2) {
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  // Generate a new token for this user
  const token = nanoid();

  const response = NextResponse.next();
  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  // Add token to Redis set and set expiry
  await redis.sadd(connectedKey, token);
  await redis.expire(connectedKey, 600); // 10 min TTL same as room TTL

  return response;
};

export const config = {
  matcher: "/room/:path*",
};
