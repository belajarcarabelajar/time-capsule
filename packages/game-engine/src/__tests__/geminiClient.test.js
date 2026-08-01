import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('fetchScenarioData JSON Sanitization', () => {
  let originalFetch;
  let fetchScenarioData;

  const validCharacters = {
    PLAYER: { id: "PLAYER", name: "Penjelajah", icon: "🧑🏻‍🚀", desc: "Masa Depan" },
    NPC_1: { id: "NPC_1", name: "Test1", icon: "1", desc: "Desc1" },
    NPC_2: { id: "NPC_2", name: "Test2", icon: "2", desc: "Desc2" },
    NPC_3: { id: "NPC_3", name: "Test3", icon: "3", desc: "Desc3" }
  };
  const validScenes = { MAIN: { bg: "test", elements: [] } };

  beforeEach(async () => {
    originalFetch = global.fetch;
    const module = await import('../geminiClient.js');
    fetchScenarioData = module.fetchScenarioData;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should parse valid JSON successfully without sanitization', async () => {
    const validJsonString = JSON.stringify({
      meta: { location: "Test", themeColor: "red" },
      characters: validCharacters,
      scenes: validScenes,
      script: []
    });

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: validJsonString }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        success: true,
        result: { choices: [{ message: { content: validJsonString } }] }
      }));
    });

    const result = await fetchScenarioData('Test Topic', 1);
    expect(result.meta.location).toBe('Test');
  });

  it('should sanitize Layer 1: unescaped newlines, tabs, and carriage returns inside string values', async () => {
    const malformedJsonString = `{
      "meta": { "location": "Test", "themeColor": "red" },
      "characters": ${JSON.stringify(validCharacters)},
      "scenes": ${JSON.stringify(validScenes)},
      "script": [
        { "type": "narrator", "text": "Line 1\nLine 2\r\nAnd a\ttab" }
      ]
    }`;

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: malformedJsonString }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        success: true,
        result: { choices: [{ message: { content: malformedJsonString } }] }
      }));
    });

    const result = await fetchScenarioData('Test Topic', 1);
    expect(result.script[0].text).toBe('Line 1\nLine 2\r\nAnd a\ttab');
  });

  it('should sanitize Layer 2: unescaped double quotes inside string values', async () => {
    const malformedJsonString = `{
      "meta": {
        "location": "Test",
        "themeColor": "red"
      },
      "characters": ${JSON.stringify(validCharacters)},
      "scenes": ${JSON.stringify(validScenes)},
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
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: malformedJsonString }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        success: true,
        result: { choices: [{ message: { content: malformedJsonString } }] }
      }));
    });

    const result = await fetchScenarioData('Test Topic', 1);
    expect(result.script[0].text).toBe('He said, "Hello there" and smiled.');
  });

  it('should throw an error if JSON parsing and both sanitization layers fail', async () => {
    const malformedJsonString = `{
      "meta": { "location": "Test", "themeColor": "red" },
      "characters": {},
      "scenes": {},
      "script": [
        { "text": "Unclosed string array
    `;

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: malformedJsonString }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        success: true,
        result: { choices: [{ message: { content: malformedJsonString } }] }
      }));
    });

    await expect(fetchScenarioData('Test Topic', 1)).rejects.toThrow('Gagal memproses skenario cerita.');
  });

  it('should throw detailed error message if Cloudflare AI API returns success: false with errors array', async () => {
    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') return new Response('', { status: 500 });
      return new Response(JSON.stringify({
        success: false,
        errors: [{ message: 'Something went wrong with Cloudflare AI' }]
      }));
    });

    await expect(fetchScenarioData('Test Topic', 1)).rejects.toThrow('Something went wrong with Cloudflare AI');
  });

  it('should throw exact error message when Gemini API returns 403 (e.g., INSUFFICIENT_POINTS)', async () => {
    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          success: false,
          error: 'INSUFFICIENT_POINTS',
          message: 'Poin Anda tidak mencukupi (0 poin). Diperlukan 10 poin.'
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 500 });
    });

    await expect(fetchScenarioData('Test Topic', 1)).rejects.toThrow('Poin Anda tidak mencukupi (0 poin). Diperlukan 10 poin.');
  });

  it('should throw fallback error message if Cloudflare AI returns non-ok without JSON error message', async () => {
    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') return new Response('', { status: 500 });
      return new Response('Internal Server Error', { status: 500 });
    });

    await expect(fetchScenarioData('Test Topic', 1)).rejects.toThrow('Gagal menghubungi portal Cloudflare AI.');
  });
});

describe('Cloudflare Fallback Behavior', () => {
  let originalFetch;
  let fetchScenarioData;

  const validCharacters = {
    PLAYER: { id: "PLAYER", name: "Penjelajah", icon: "🧑🏻‍🚀", desc: "Masa Depan" },
    NPC_1: { id: "NPC_1", name: "Test1", icon: "1", desc: "Desc1" },
    NPC_2: { id: "NPC_2", name: "Test2", icon: "2", desc: "Desc2" },
    NPC_3: { id: "NPC_3", name: "Test3", icon: "3", desc: "Desc3" }
  };
  const validScenes = { MAIN: { bg: "test", elements: [] } };

  beforeEach(async () => {
    originalFetch = global.fetch;
    const module = await import('../geminiClient.js');
    fetchScenarioData = module.fetchScenarioData;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should extract text from Cloudflare result.choices[0].message.content', async () => {
    const validJsonString = JSON.stringify({
      meta: { location: "Cloudflare Choices", themeColor: "blue" },
      characters: validCharacters,
      scenes: validScenes,
      script: []
    });

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') return new Response('', { status: 500 });
      return new Response(JSON.stringify({
        success: true,
        result: { choices: [{ message: { content: validJsonString } }] }
      }));
    });

    const result = await fetchScenarioData('Fallback Topic', 1);
    expect(result.meta.location).toBe('Cloudflare Choices');
  });

  it('should extract text from Cloudflare result.response if choices array is missing', async () => {
    const validJsonString = JSON.stringify({
      meta: { location: "Cloudflare Response", themeColor: "green" },
      characters: validCharacters,
      scenes: validScenes,
      script: []
    });

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') return new Response('', { status: 500 });
      return new Response(JSON.stringify({
        success: true,
        result: { response: validJsonString }
      }));
    });

    const result = await fetchScenarioData('Fallback Topic', 1);
    expect(result.meta.location).toBe('Cloudflare Response');
  });
});

describe('Input Validation & Prompt Construction & Zod Schema Validation', () => {
  let originalFetch;
  let fetchScenarioData;

  const validCharacters = {
    PLAYER: { id: "PLAYER", name: "Penjelajah", icon: "🧑🏻‍🚀", desc: "Masa Depan" },
    NPC_1: { id: "NPC_1", name: "Test1", icon: "1", desc: "Desc1" },
    NPC_2: { id: "NPC_2", name: "Test2", icon: "2", desc: "Desc2" },
    NPC_3: { id: "NPC_3", name: "Test3", icon: "3", desc: "Desc3" }
  };
  const validScenes = { MAIN: { bg: "test", elements: [] } };

  beforeEach(async () => {
    originalFetch = global.fetch;
    const module = await import('../geminiClient.js');
    fetchScenarioData = module.fetchScenarioData;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should throw an error if input types are invalid', async () => {
    await expect(fetchScenarioData(123, 1, "")).rejects.toThrow('Invalid input types.');
    await expect(fetchScenarioData("Topic", "1", "")).rejects.toThrow('Invalid input types.');
    await expect(fetchScenarioData("Topic", 1, 456)).rejects.toThrow('Invalid input types.');
  });

  it('should truncate topic > 200 chars and history > 5000 chars', async () => {
    let capturedBody;
    const validJsonString = JSON.stringify({
      meta: { location: "Sanitized Location", themeColor: "red" },
      characters: validCharacters,
      scenes: validScenes,
      script: []
    });

    global.fetch = mock(async (url, options) => {
      capturedBody = JSON.parse(options.body);
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: validJsonString }] } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const longTopic = "A".repeat(250);
    const longHistory = "B".repeat(6000);

    await fetchScenarioData(longTopic, 2, longHistory);

    const promptSent = capturedBody.contents[0].parts[0].text;
    
    expect(promptSent).toContain("TOPIK UTAMA: " + "A".repeat(200));
    expect(promptSent).toContain("B".repeat(5000));
    expect(promptSent).toContain("KONTEKS: Ini adalah BAGIAN 2.");
  });

  it('should strip forbidden characters <>{}[\] from inputs', async () => {
    let capturedBody;
    const validJsonString = JSON.stringify({
      meta: { location: "Sanitized Location", themeColor: "red" },
      characters: validCharacters,
      scenes: validScenes,
      script: []
    });

    global.fetch = mock(async (url, options) => {
      capturedBody = JSON.parse(options.body);
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: validJsonString }] } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    await fetchScenarioData("<Topic>{With}[Brackets]", 1, "<History>{With}[Brackets]");

    const promptSent = capturedBody.contents[0].parts[0].text;
    expect(promptSent).not.toContain("<");
    expect(promptSent).not.toContain(">");
    expect(promptSent).not.toContain("{");
    expect(promptSent).not.toContain("}");
    expect(promptSent).not.toContain("[");
    expect(promptSent).not.toContain("]");
    expect(promptSent).toContain("TopicWithBrackets");
  });

  it('should throw an error if response structure fails Zod schema validation', async () => {
    const invalidSchemaJson = JSON.stringify({
      meta: { location: "Missing Required Characters" },
      // Missing characters and script fields required by Zod schema
      scenes: validScenes
    });

    global.fetch = mock(async () => {
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: invalidSchemaJson }] } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const consoleErrorSpy = mock(() => {});
    const originalConsoleError = console.error;
    console.error = consoleErrorSpy;

    try {
      await expect(fetchScenarioData('Invalid Schema Topic', 1)).rejects.toThrow('Gagal memproses skenario cerita.');
      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      console.error = originalConsoleError;
    }
  });

  it('should throw an error when rawText contains no JSON brackets', async () => {
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Plain text response with no brackets" }] } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    await expect(fetchScenarioData('Plain Text Topic', 1)).rejects.toThrow('Gagal memproses skenario cerita.');
  });
});
