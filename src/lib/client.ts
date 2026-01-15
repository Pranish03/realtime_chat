import { treaty } from "@elysiajs/eden";
import type { App } from "../app/api/[[...slugs]]/route";

export const client = treaty<App>(
  process.env.NEXT_PUBLIC_BASE_URL || "localhost:3000"
).api;
