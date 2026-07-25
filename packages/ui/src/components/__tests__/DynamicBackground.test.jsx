import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { render } from '@testing-library/react';
import { DynamicBackground } from '../DynamicBackground.jsx';

describe('DynamicBackground', () => {
  describe('Gradient handling', () => {
    it('renders default gradient when no props provided', () => {
      const { container } = render(<DynamicBackground />);

      const mainDiv = container.firstChild;
      expect(mainDiv.className).toContain('from-stone-900');
      expect(mainDiv.className).toContain('to-black');
    });

    it('uses scene.bg gradient when provided', () => {
      const scene = { bg: 'from-blue-500 to-cyan-500' };
      const { container } = render(<DynamicBackground scene={scene} />);

      const mainDiv = container.firstChild;
      expect(mainDiv.className).toContain('from-blue-500');
      expect(mainDiv.className).toContain('to-cyan-500');
    });

    it('overrides scene.bg with angry mood gradient', () => {
      const scene = { bg: 'from-blue-500 to-cyan-500' };
      const { container } = render(<DynamicBackground scene={scene} currentMood="😡" />);

      const mainDiv = container.firstChild;
      expect(mainDiv.className).toContain('from-red-900');
      expect(mainDiv.className).toContain('via-orange-900');
      expect(mainDiv.className).toContain('to-black');
    });

    it('uses surprised mood gradient', () => {
      const { container } = render(<DynamicBackground currentMood="😱" />);
      const mainDiv = container.firstChild;
      expect(mainDiv.className).toContain('from-amber-900');
      expect(mainDiv.className).toContain('via-orange-950');
      expect(mainDiv.className).toContain('to-black');
      expect(mainDiv.className).toContain('animate-pulse');
    });

    it('uses sad mood gradient', () => {
      const { container } = render(<DynamicBackground currentMood="😢" />);
      const mainDiv = container.firstChild;
      expect(mainDiv.className).toContain('from-slate-800');
      expect(mainDiv.className).toContain('via-stone-900');
      expect(mainDiv.className).toContain('to-black');
    });

    it('uses happy mood gradient', () => {
      const { container } = render(<DynamicBackground currentMood="😄" />);
      const mainDiv = container.firstChild;
      expect(mainDiv.className).toContain('from-sky-700');
      expect(mainDiv.className).toContain('via-emerald-800');
      expect(mainDiv.className).toContain('to-black');
    });

    it('uses thoughtful mood gradient', () => {
      const { container } = render(<DynamicBackground currentMood="🤔" />);
      const mainDiv = container.firstChild;
      expect(mainDiv.className).toContain('from-stone-800');
      expect(mainDiv.className).toContain('via-amber-950');
      expect(mainDiv.className).toContain('to-black');
    });
  });

  describe('Particle handling', () => {
    it('renders default particles when no mood provided', () => {
      const { container } = render(<DynamicBackground />);
      expect(container.textContent).toContain('⚪');
    });

    it('renders battle particles', () => {
      const { container } = render(<DynamicBackground currentMood="⚔️" />);
      expect(container.textContent).toContain('⚔️');
    });

    it('renders angry particles', () => {
      const { container } = render(<DynamicBackground currentMood="😡" />);
      expect(container.textContent).toContain('🔥');
    });

    it('renders happy particles', () => {
      const { container } = render(<DynamicBackground currentMood="😄" />);
      expect(container.textContent).toContain('✨');
    });

    it('renders sad particles', () => {
      const { container } = render(<DynamicBackground currentMood="😢" />);
      expect(container.textContent).toContain('💧');
    });

    it('renders king particles', () => {
      const { container } = render(<DynamicBackground currentMood="👑" />);
      expect(container.textContent).toContain('🪙');
    });
  });

  describe('Scene elements', () => {
    it('renders nothing for scene elements when empty', () => {
      const { container } = render(<DynamicBackground />);
      // Should not contain '🏛️' which is the default for undefined elements when the array exists
      expect(container.textContent).not.toContain('🏛️');
    });

    it('renders string scene elements correctly', () => {
      const scene = { elements: ['🌲', '⛰️'] };
      const { container } = render(<DynamicBackground scene={scene} />);

      expect(container.textContent).toContain('🌲');
      expect(container.textContent).toContain('⛰️');
    });

    it('renders default element for non-string elements', () => {
      const scene = { elements: [{}] }; // passing an object to trigger non-string logic
      const { container } = render(<DynamicBackground scene={scene} />);

      expect(container.textContent).toContain('🏛️');
    });
  });
});
