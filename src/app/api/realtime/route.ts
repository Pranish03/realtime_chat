import { realtime } from "@/lib/realtime";
import { handle } from "@upstash/realtime";

export const GET = handle({ realtime });
