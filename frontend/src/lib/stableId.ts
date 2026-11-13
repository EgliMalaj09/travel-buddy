/**
 * An id that is always the same for the same text, in UUID format (version 8, "custom").
 * Auto checklist items use it (trip id + rule id): two phones that make the same checklist
 * write the same row, so the server keeps one item instead of two copies.
 * Not for security: it only has to spread well and never change.
 */
export function stableId(text: string): string {
  // Two 64-bit FNV-1a hashes with different starting points give 128 bits.
  const fnv = (seed: bigint) => {
    let h = seed;
    for (let i = 0; i < text.length; i++) {
      h ^= BigInt(text.charCodeAt(i));
      h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
    }
    return h.toString(16).padStart(16, '0');
  };
  const hex = (fnv(0xcbf29ce484222325n) + fnv(0x84222325cbf29ce4n)).split('');
  hex[12] = '8'; // version 8
  hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16); // variant
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
