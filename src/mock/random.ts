/**
 * Deterministic random helpers shared by every mock module (no imports from the store,
 * so any module can use them without circular imports).
 */
import { MOCK_SETTINGS } from "./seed";

export function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). Same seed => same sequence. */
export function rng(seedText: string) {
  let a = hashString(`${MOCK_SETTINGS.seed}:${seedText}`);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Deterministic UUID-v7-looking id from any text (e.g. "019a2c3e-…"). */
export function fakeUuid(seedText: string) {
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const a = hex(hashString(`a:${seedText}`));
  const b = hex(hashString(`b:${seedText}`));
  const c = hex(hashString(`c:${seedText}`));
  const d = hex(hashString(`d:${seedText}`));
  return `019${a.slice(0, 5)}-${b.slice(0, 4)}-7${b.slice(4, 7)}-${"89ab"[hashString(seedText) % 4]}${c.slice(0, 3)}-${c.slice(3, 8)}${d.slice(0, 7)}`;
}

/** Monotonic id generator for records created at runtime (POST endpoints). */
let counter = 0;
export function runtimeId(prefix = "") {
  counter += 1;
  return fakeUuid(`${prefix}:${Date.now()}:${counter}:${Math.random()}`);
}
