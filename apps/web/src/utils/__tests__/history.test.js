import { describe, it, expect } from 'bun:test';
import { generateHistorySummary } from '../history';

describe('generateHistorySummary', () => {
  it('should return an empty string for an empty array', () => {
    const pastChaptersData = [];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toBe('');
  });

  it('should ignore null or undefined data elements', () => {
    const pastChaptersData = [null, undefined];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toBe('');
  });

  it('should include location if provided', () => {
    const pastChaptersData = [
      {
        meta: { location: 'Jakarta' },
      },
    ];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toContain('--- RINGKASAN BAGIAN 1 ---');
    expect(result).toContain('Lokasi: Jakarta');
  });

  it('should handle missing script data gracefully', () => {
    const pastChaptersData = [
      {
        meta: { location: 'Bandung' },
      },
    ];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toContain('Lokasi: Bandung');
    expect(result).not.toContain('Kuis yang sudah ditanyakan:');
    expect(result).not.toContain('Dialog/Narasi singkat:');
  });

  it('should extract up to 3 dialogues and truncate them if necessary', () => {
    const pastChaptersData = [
      {
        script: [
          { type: 'dialogue', speakerId: 'Alice', text: 'Hello, this is a very long text that goes well beyond the sixty character limit in order to test the truncation functionality of the generateHistorySummary function properly.' },
          { type: 'dialogue', speakerId: 'Bob', text: 'Hi Alice!' },
          { type: 'dialogue', speakerId: 'Charlie', text: 'Good morning.' },
          { type: 'dialogue', speakerId: 'Diana', text: 'This fourth dialogue should be ignored.' },
        ],
      },
    ];
    const result = generateHistorySummary(pastChaptersData);

    expect(result).toContain('Dialog/Narasi singkat:');
    // First dialogue truncated
    expect(result).toContain('- Alice: Hello, this is a very long text that goes well beyond the si...');
    // Second dialogue
    expect(result).toContain('- Bob: Hi Alice!...');
    // Third dialogue
    expect(result).toContain('- Charlie: Good morning....');
    // Fourth dialogue should not be present
    expect(result).not.toContain('Diana');
  });

  it('should extract quizzes and format them correctly', () => {
    const pastChaptersData = [
      {
        script: [
          { type: 'quiz', text: 'What is the capital of Indonesia?' },
          { type: 'quiz', text: 'When did Indonesia gain independence?' },
        ],
      },
    ];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toContain('Kuis yang sudah ditanyakan:');
    expect(result).toContain('- "What is the capital of Indonesia?"');
    expect(result).toContain('- "When did Indonesia gain independence?"');
  });

  it('should handle a combination of dialogues, quizzes, and missing location', () => {
    const pastChaptersData = [
      {
        script: [
          { type: 'dialogue', speakerId: 'Teacher', text: 'Today we will learn about history.' },
          { type: 'quiz', text: 'Who was the first president?' },
        ],
      },
      {
        meta: { location: 'Museum' },
        script: [
          { type: 'dialogue', speakerId: 'Guide', text: 'Welcome to the museum.' },
        ],
      },
    ];
    const result = generateHistorySummary(pastChaptersData);

    // First chapter
    expect(result).toContain('--- RINGKASAN BAGIAN 1 ---');
    expect(result).toContain('- Teacher: Today we will learn about history....');
    expect(result).toContain('Kuis yang sudah ditanyakan:');
    expect(result).toContain('- "Who was the first president?"');

    // Second chapter
    expect(result).toContain('--- RINGKASAN BAGIAN 2 ---');
    expect(result).toContain('Lokasi: Museum');
    expect(result).toContain('- Guide: Welcome to the museum....');
  });

  it('should handle empty objects gracefully', () => {
    const pastChaptersData = [{}];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toContain('--- RINGKASAN BAGIAN 1 ---');
    expect(result).not.toContain('Lokasi:');
    expect(result).not.toContain('Kuis yang sudah ditanyakan:');
    expect(result).not.toContain('Dialog/Narasi singkat:');
  });

  it('should handle missing properties on dialogue items gracefully', () => {
    const pastChaptersData = [
      {
        script: [
          { type: 'dialogue' }, // Missing text and speakerId
          { type: 'dialogue', speakerId: 'Alice', text: null },
          { type: 'dialogue', speakerId: 'Bob' },
        ],
      },
    ];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toContain('Dialog/Narasi singkat:');
  });

  it('should ignore unknown script item types', () => {
    const pastChaptersData = [
      {
        script: [
          { type: 'unknown_type', text: 'Should be ignored' },
          { type: 'dialogue', speakerId: 'Alice', text: 'Valid dialogue' },
        ],
      },
    ];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).not.toContain('Should be ignored');
    expect(result).toContain('- Alice: Valid dialogue...');
  });

  it('should handle empty script array', () => {
    const pastChaptersData = [{ script: [] }];
    const result = generateHistorySummary(pastChaptersData);
    expect(result).toContain('--- RINGKASAN BAGIAN 1 ---');
    expect(result).not.toContain('Kuis yang sudah ditanyakan:');
    expect(result).not.toContain('Dialog/Narasi singkat:');
  });
});
