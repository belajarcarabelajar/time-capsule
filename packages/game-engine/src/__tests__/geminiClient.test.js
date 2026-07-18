import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('fetchScenarioData JSON Sanitization', () => {
  let originalFetch;
  let fetchScenarioData;

  beforeEach(async () => {
    originalFetch = global.fetch;
    const module = await import('../geminiClient.js');
    fetchScenarioData = module.fetchScenarioData;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should parse valid JSON successfully without sanitization', async () => {
    const validJsonString = '{"meta": {"location": "Test", "themeColor": "red"}, "characters": {}, "scenes": {}, "script": []}';

    global.fetch = mock(async (url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: validJsonString }] } }]
        }));
      } else {
        return new Response(JSON.stringify({
          success: true,
          result: { choices: [{ message: { content: validJsonString } }] }
        }));
      }
    });

    const result = await fetchScenarioData('Test Topic', 1);
    expect(result.meta.location).toBe('Test');
  });

  it('should sanitize Layer 1: unescaped newlines, tabs, and carriage returns inside string values', async () => {
    // Malformed JSON with literal newlines, carriage returns, and tabs inside quotes
    const malformedJsonString = `{
      "meta": { "location": "Test", "themeColor": "red" },
      "characters": {},
      "scenes": {},
      "script": [
        { "text": "Line 1\nLine 2\r\nAnd a\ttab" }
      ]
    }`;

    global.fetch = mock(async (url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: malformedJsonString }] } }]
        }));
      } else {
        return new Response(JSON.stringify({
          success: true,
          result: { choices: [{ message: { content: malformedJsonString } }] }
        }));
      }
    });

    const result = await fetchScenarioData('Test Topic', 1);
    expect(result.script[0].text).toBe('Line 1\nLine 2\r\nAnd a\ttab');
  });

  it('should sanitize Layer 2: unescaped double quotes inside string values', async () => {
    // Malformed JSON with an unescaped double quote inside a string value on a line
    // The regular expression expects something like: "key": "value",
    const malformedJsonString = `{
      "meta": {
        "location": "Test",
        "themeColor": "red"
      },
      "characters": {},
      "scenes": {},
      "script": [
        {
          "type": "dialogue",
          "speakerId": "PLAYER",
          "mood": "happy",
          "text": "He said, "Hello there" and smiled."
        }
      ]
    }`;

    global.fetch = mock(async (url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: malformedJsonString }] } }]
        }));
      } else {
        return new Response(JSON.stringify({
          success: true,
          result: { choices: [{ message: { content: malformedJsonString } }] }
        }));
      }
    });

    const result = await fetchScenarioData('Test Topic', 1);
    expect(result.script[0].text).toBe('He said, "Hello there" and smiled.');
  });

  it('should throw an error if JSON parsing and both sanitization layers fail', async () => {
    // Malformed JSON that cannot be fixed by the simple regexes (e.g., missing closing brace)
    const malformedJsonString = `{
      "meta": { "location": "Test", "themeColor": "red" },
      "characters": {},
      "scenes": {},
      "script": [
        { "text": "Unclosed string array
    `;

    global.fetch = mock(async (url) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: malformedJsonString }] } }]
        }));
      } else {
        return new Response(JSON.stringify({
          success: true,
          result: { choices: [{ message: { content: malformedJsonString } }] }
        }));
      }
    });

    // Expect the function to throw an error
    await expect(fetchScenarioData('Test Topic', 1)).rejects.toThrow('Gagal memproses skenario cerita.');
  });
});
