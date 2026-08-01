import test from "node:test";
import assert from "node:assert/strict";
import { getErrorMessage } from "../src/lib/errorHandling";

test("returns the message from Error objects", () => {
  assert.equal(getErrorMessage(new Error("boom")), "boom");
});

test("extracts an API error message from a payload", () => {
  assert.equal(getErrorMessage({ error: "Invalid password" }), "Invalid password");
});

test("falls back to a default message for unknown values", () => {
  assert.equal(getErrorMessage(undefined, "Something went wrong"), "Something went wrong");
});
