import "server-only";
import { Redis } from "@upstash/redis";
import { hasRedisEnv } from "./persistence";

export function getRedisClient(): Redis | null {
  if (!hasRedisEnv()) return null;
  return Redis.fromEnv();
}
