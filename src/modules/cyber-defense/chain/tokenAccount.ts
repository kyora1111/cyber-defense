// Where a wallet keeps a token on Solana: its "associated token account", an address derived from
// the wallet and the token's mint — the one every wallet app uses. Derived here, by the rule of
// the chain itself (SHA-256 of the seeds, the first result that is NOT a point of the ed25519
// curve), instead of pulling @solana/web3.js into the game for the sake of one address.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ASSOCIATED_TOKEN_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const ADDRESS_BYTES = 32;

/** The bytes of a base58 string, or null when it is not one. */
export function base58Decode(text: string): Uint8Array | null {
  let value = 0n;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit === -1) return null;
    value = value * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  for (; value > 0n; value >>= 8n) bytes.unshift(Number(value & 0xffn));
  // Every leading "1" is a leading zero byte.
  for (const char of text) {
    if (char !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

export function base58Encode(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let text = "";
  for (; value > 0n; value /= 58n) text = ALPHABET[Number(value % 58n)] + text;
  for (const byte of bytes) {
    if (byte !== 0) break;
    text = "1" + text;
  }
  return text;
}

/** A Solana address as its 32 bytes, or null when the text is not an address. */
function addressBytes(address: string): Uint8Array | null {
  const bytes = base58Decode(address);
  return bytes?.length === ADDRESS_BYTES ? bytes : null;
}

// ed25519: −x² + y² = 1 + d·x²·y² over the field of P.
const P = 2n ** 255n - 19n;
const D = 37095705934669439343138083508754565189542113879843219016388785533085940283555n;

function power(base: bigint, exponent: bigint): bigint {
  let result = 1n;
  for (let b = base % P, e = exponent; e > 0n; e >>= 1n, b = (b * b) % P) {
    if (e & 1n) result = (result * b) % P;
  }
  return result;
}

/** Whether 32 bytes are the encoding of a point of the curve — i.e. could be somebody's key. */
function isOnCurve(bytes: Uint8Array): boolean {
  // The encoding is y, little-endian; its top bit is the sign of x.
  let y = 0n;
  for (let i = ADDRESS_BYTES - 1; i >= 0; i--) {
    const byte = bytes[i] ?? 0;
    y = (y << 8n) | BigInt(i === ADDRESS_BYTES - 1 ? byte & 0x7f : byte);
  }
  if (y >= P) return false;
  // x² = (y² − 1) / (d·y² + 1): a point exists when that is a square.
  const y2 = (y * y) % P;
  const x2 = ((y2 - 1n + P) * power(D * y2 + 1n, P - 2n)) % P;
  if (x2 === 0n) return ((bytes[ADDRESS_BYTES - 1] ?? 0) & 0x80) === 0;
  return power(x2, (P - 1n) / 2n) === 1n;
}

async function sha256(parts: readonly Uint8Array[]): Promise<Uint8Array> {
  const data = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    data.set(part, offset);
    offset += part.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

/**
 * The address of the wallet's associated token account for the mint, or null when either is not
 * an address. The account itself may not exist yet — a wallet that never held the token has none.
 */
export async function associatedTokenAddress(
  wallet: string,
  mint: string,
): Promise<string | null> {
  const owner = addressBytes(wallet);
  const token = addressBytes(mint);
  const tokenProgram = addressBytes(TOKEN_PROGRAM);
  const program = addressBytes(ASSOCIATED_TOKEN_PROGRAM);
  if (!owner || !token || !tokenProgram || !program) return null;
  const marker = new TextEncoder().encode("ProgramDerivedAddress");
  for (let bump = 255; bump >= 0; bump--) {
    const hash = await sha256([
      owner,
      tokenProgram,
      token,
      Uint8Array.of(bump),
      program,
      marker,
    ]);
    if (!isOnCurve(hash)) return base58Encode(hash);
  }
  return null;
}
