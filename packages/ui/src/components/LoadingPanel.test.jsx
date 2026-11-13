import { describe, it, expect } from 'bun:test';
import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { LoadingPanel } from './LoadingPanel.jsx';

// React 19 renders test-renderer roots concurrently, so the tree only exists
// after act() has flushed the render.
const render = async (element) => {
  let component;
  await act(async () => {
    component = create(element);
  });
  return component;
};

describe('LoadingPanel', () => {
  it('renders default text when no text is provided', async () => {
    const component = await render(<LoadingPanel />);
    const root = component.root;

    const headingNode = root.findByType('h3');
    expect(headingNode.props.children).toBe("MEMBUKA PORTAL WAKTU...");
  });

  it('renders provided text correctly', async () => {
    const customText = "CUSTOM LOADING TEXT...";
    const component = await render(<LoadingPanel text={customText} />);
    const root = component.root;

    const headingNode = root.findByType('h3');
    expect(headingNode.props.children).toBe(customText);
  });

  it('tells the visitor how long writing a chapter usually takes', async () => {
    const component = await render(<LoadingPanel text="MEMBUKA PORTAL SEJARAH..." />);
    const hint = component.root.findByProps({ 'data-testid': 'loading-hint' });

    expect(hint.props.children).toBe("AI sedang menulis babak ini. Biasanya butuh sekitar 30 detik.");
    expect(component.root.findByType('h3').props.children).toBe("MEMBUKA PORTAL SEJARAH...");
  });

  it('renders a provided hint instead of the default estimate', async () => {
    const component = await render(<LoadingPanel hint="Sebentar lagi." />);
    const hint = component.root.findByProps({ 'data-testid': 'loading-hint' });

    expect(hint.props.children).toBe("Sebentar lagi.");
  });
});
