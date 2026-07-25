import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from "bun:test";
import { fetchScenarioData } from "../src/geminiClient.js";

describe("fetchScenarioData", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // ensure apiKey is empty for cloudflare path, or we can just mock it properly.
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws an error when JSON parsing and sanitization fail completely", async () => {
    // This JSON matches the regex for json extraction but has syntax errors
    // that the basic sanitization won't fix.
    const malformedJSON = `{
      "unquoted_key": 123,
      "missing_comma" true
    }`;

    global.fetch = mock(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          result: {
            response: malformedJSON
          }
        })
      })
    );

    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    try {
      await fetchScenarioData("Test Topic", 1);
      // If it doesn't throw, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toBe("Gagal memproses skenario cerita.");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "JSON parsing failed:",
        expect.anything()
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("parses valid JSON response successfully", async () => {
    const validJSON = `{
      "meta": { "location": "Test", "themeColor": "red" },
      "characters": {
        "PLAYER": { "id": "PLAYER", "name": "Penjelajah", "icon": "🧑🏻‍🚀", "desc": "Masa Depan" },
        "NPC_1": { "id": "NPC_1", "name": "Test1", "icon": "1", "desc": "Desc1" },
        "NPC_2": { "id": "NPC_2", "name": "Test2", "icon": "2", "desc": "Desc2" },
        "NPC_3": { "id": "NPC_3", "name": "Test3", "icon": "3", "desc": "Desc3" }
      },
      "scenes": {
        "MAIN": { "bg": "test", "elements": [] }
      },
      "script": [
        { "type": "narrator", "text": "Welcome to the game" }
      ]
    }`;

    global.fetch = mock(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          result: {
            response: validJSON
          }
        })
      })
    );

    const result = await fetchScenarioData("Test Topic", 1);
    expect(result).toBeDefined();
    expect(result.script[0].text).toBe("Welcome to the game");
  });

  it("throws an error when JSON does not match Zod schema", async () => {
    // Missing required fields
    const invalidSchemaJSON = `{
      "meta": { "location": "Test", "themeColor": "red" }
    }`;

    global.fetch = mock(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          result: {
            response: invalidSchemaJSON
          }
        })
      })
    );

    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    try {
      await fetchScenarioData("Test Topic", 1);
      // If it doesn't throw, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toBe("Gagal memproses skenario cerita.");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Data validation failed:",
        expect.anything()
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
