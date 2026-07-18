import { describe, it, expect } from 'bun:test';
import { formatText } from './formatText.js';

describe('formatText', () => {
  it('should format bold text', () => {
    expect(formatText('**bold**')).toBe('<b>bold</b>');
  });

  it('should format italic text', () => {
    expect(formatText('*italic*')).toBe('<i>italic</i>');
  });

  it('should sanitize XSS attempts', () => {
    const malicious = '<script>alert("xss")</script>**bold**';
    const result = formatText(malicious);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<b>bold</b>');
  });

  it('should sanitize img onerror', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const result = formatText(malicious);
    expect(result).not.toContain('onerror');
  });
});
