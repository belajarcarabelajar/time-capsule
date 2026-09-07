import { describe, expect, test } from 'bun:test';
import { isImmersiveEnabled } from '../featureFlag.js';

describe('immersive feature flag', () => {
  test('enables contextual rendering when the flag is absent', () => {
    expect(isImmersiveEnabled(undefined)).toBe(true);
  });

  test('enables contextual rendering when explicitly true', () => {
    expect(isImmersiveEnabled('true')).toBe(true);
  });

  test('disables contextual rendering only when explicitly false', () => {
    expect(isImmersiveEnabled('false')).toBe(false);
  });
});
