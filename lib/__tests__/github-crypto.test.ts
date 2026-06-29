import { describe, it, expect, beforeAll } from 'vitest';
import { encryptToken, decryptToken } from '../github/crypto';

// 32-байтный ключ (64 hex) для тестов.
const KEY = 'a'.repeat(64);

beforeAll(() => {
  process.env.TOKEN_ENC_KEY = KEY;
});

describe('github token crypto', () => {
  it('round-trips a token', () => {
    const token = 'gho_examplePersonalAccessToken123456';
    const enc = encryptToken(token);
    expect(decryptToken(enc)).toBe(token);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    const a = encryptToken('same-token');
    const b = encryptToken('same-token');
    expect(a).not.toBe(b);
    // оба расшифровываются в исходник
    expect(decryptToken(a)).toBe('same-token');
    expect(decryptToken(b)).toBe('same-token');
  });

  it('stores in ivHex:cipherHex:tagHex format', () => {
    const enc = encryptToken('x');
    const parts = enc.split(':');
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(p).toMatch(/^[0-9a-f]+$/));
  });

  it('throws on tampered ciphertext (auth tag mismatch)', () => {
    const enc = encryptToken('secret');
    const [iv, cipher, tag] = enc.split(':');
    // портим cipher — меняем последний символ
    const badCipher = cipher.slice(0, -1) + (cipher.slice(-1) === '0' ? '1' : '0');
    expect(() => decryptToken(`${iv}:${badCipher}:${tag}`)).toThrow();
  });

  it('throws on malformed stored value', () => {
    expect(() => decryptToken('not-a-valid-format')).toThrow('Invalid encrypted token format');
  });

  it('throws when key is wrong length', () => {
    process.env.TOKEN_ENC_KEY = 'short';
    expect(() => encryptToken('x')).toThrow('64 hex');
    process.env.TOKEN_ENC_KEY = KEY; // восстановить для других тестов
  });
});
