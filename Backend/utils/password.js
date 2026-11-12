import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Passwords are never stored. We store "salt:hash", where the hash comes from scrypt
// (a deliberately slow, memory-hard function) and every user gets a random salt.
export async function hashPassword(password) {
    const salt = randomBytes(16);
    const key = await scryptAsync(password, salt, KEY_LENGTH);
    return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
    const [saltHex, keyHex] = String(stored).split(":");
    if (!saltHex || !keyHex) return false;
    const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
    const expected = Buffer.from(keyHex, "hex");
    return expected.length === key.length && timingSafeEqual(key, expected); // constant-time compare
}
