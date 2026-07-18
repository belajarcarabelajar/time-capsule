import { describe, it, expect } from 'bun:test';
import { formatText } from './formatText.js';

describe('formatText', () => {
  it('returns empty string for falsy values', () => {
    expect(formatText('')).toBe('');
    expect(formatText(null)).toBe('');
    expect(formatText(undefined)).toBe('');
  });

  it('formats bold text correctly', () => {
    expect(formatText('This is **bold** text.')).toBe('This is <b>bold</b> text.');
    expect(formatText('**Start** bold.')).toBe('<b>Start</b> bold.');
    expect(formatText('End **bold**')).toBe('End <b>bold</b>');
  });

  it('formats italic text correctly', () => {
    expect(formatText('This is *italic* text.')).toBe('This is <i>italic</i> text.');
    expect(formatText('*Start* italic.')).toBe('<i>Start</i> italic.');
    expect(formatText('End *italic*')).toBe('End <i>italic</i>');
  });

  it('formats both bold and italic text in the same string', () => {
    expect(formatText('This is **bold** and *italic*.')).toBe('This is <b>bold</b> and <i>italic</i>.');
  });

  it('formats multiple bold or italic instances', () => {
    expect(formatText('**One** and **Two**')).toBe('<b>One</b> and <b>Two</b>');
    expect(formatText('*One* and *Two*')).toBe('<i>One</i> and <i>Two</i>');
  });

  it('leaves unformatted text unchanged', () => {
    expect(formatText('Just normal text.')).toBe('Just normal text.');
  });
});
