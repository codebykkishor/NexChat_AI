import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { isValidEmail, normalizeEmail, passwordError } from "../utils/validators.js";

test("correct password verifies, wrong password does not", async () => {
    const stored = await hashPassword("correct horse battery");
    assert.equal(await verifyPassword("correct horse battery", stored), true);
    assert.equal(await verifyPassword("wrong password", stored), false);
});

test("same password hashes differently each time (random salt) and never contains the password", async () => {
    const a = await hashPassword("samepassword1");
    const b = await hashPassword("samepassword1");
    assert.notEqual(a, b);
    assert.ok(!a.includes("samepassword1"));
});

test("malformed stored hash fails safely", async () => {
    assert.equal(await verifyPassword("x", "garbage"), false);
    assert.equal(await verifyPassword("x", undefined), false);
});

test("email validation and normalisation", () => {
    assert.equal(isValidEmail("kunal@example.com"), true);
    for (const bad of ["", "no-at.com", "a@b", "a b@c.com", null, 5]) assert.equal(isValidEmail(bad), false);
    assert.equal(normalizeEmail("  Kunal@Example.COM "), "kunal@example.com");
});

test("password rules", () => {
    assert.equal(passwordError("12345678"), null);
    assert.match(passwordError("short"), /at least 8/);
    assert.match(passwordError("x".repeat(129)), /too long/);
    assert.match(passwordError(undefined), /required/);
});
