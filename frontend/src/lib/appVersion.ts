/**
 * Minimum app version (AppConfig.minAppVersion, set in the back office, KAN-55).
 * Versions are "major.minor.patch" numbers; anything else counts as "not older", so a typo
 * in the back office never locks everyone out.
 */
export function isOlderThan(
  version: string | null | undefined,
  minimum: string | null | undefined,
): boolean {
  const a = parse(version);
  const b = parse(minimum);
  if (!a || !b) return false;
  const diff = a.map((n, i) => n - b[i]!).find((d) => d !== 0) ?? 0;
  return diff < 0;
}

function parse(v: string | null | undefined): [number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v?.trim() ?? '');
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
