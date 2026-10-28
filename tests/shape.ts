/**
 * Tiny shape checker for API contract tests.
 * A shape is written like the "QUERY SHAPES" captured from the live app:
 *   "string" | "number" | "boolean" | "null" | "string|null" | "dur" (HH:MM[:SS]) | "date" (YYYY-MM-DD)
 *   { key: shape, ... }  — every key must exist (extra keys are reported as errors too)
 *   [itemShape]          — array whose items all match itemShape (may be empty)
 */
export type Shape = string | Shape[] | { [key: string]: Shape };

const DUR = /^\d{1,4}:\d{2}(:\d{2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function checkPrimitive(value: unknown, type: string): boolean {
  return type.split("|").some((t) => {
    switch (t) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && Number.isFinite(value);
      case "boolean":
        return typeof value === "boolean";
      case "null":
        return value === null;
      case "dur":
        return typeof value === "string" && DUR.test(value);
      case "date":
        return typeof value === "string" && DATE.test(value);
      case "any":
        return true;
      default:
        throw new Error(`unknown type ${t}`);
    }
  });
}

export function shapeErrors(value: unknown, shape: Shape, path = "$"): string[] {
  if (typeof shape === "string") return checkPrimitive(value, shape) ? [] : [`${path}: expected ${shape}, got ${JSON.stringify(value)}`];
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return [`${path}: expected array`];
    return value.flatMap((v, i) => shapeErrors(v, shape[0], `${path}[${i}]`));
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [`${path}: expected object`];
  const obj = value as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(shape)) {
    if (!(key in obj)) errors.push(`${path}.${key}: missing`);
    else errors.push(...shapeErrors(obj[key], shape[key], `${path}.${key}`));
  }
  for (const key of Object.keys(obj)) if (!(key in shape)) errors.push(`${path}.${key}: unexpected key`);
  return errors;
}
