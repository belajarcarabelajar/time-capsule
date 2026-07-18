import { describe, expect, test } from "bun:test";
import { formatText } from "./formatText.js";

describe("formatText", () => {
  test("formats bold text correctly", () => {
    expect(formatText("**bold**")).toBe("<b>bold</b>");
  });

  test("formats italic text correctly", () => {
    expect(formatText("*italic*")).toBe("<i>italic</i>");
  });

  test("sanitizes HTML injection", () => {
    expect(formatText('<script>alert("xss")</script>')).toBe("");
    expect(formatText('**bold** <script>alert("xss")</script>')).toBe("<b>bold</b> ");
  });

  test("returns empty string for null or undefined", () => {
    expect(formatText(null)).toBe("");
    expect(formatText(undefined)).toBe("");
  });
});
