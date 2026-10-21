import { describe, it, expect } from 'bun:test';
import React from 'react';
import { create } from 'react-test-renderer';
import { LoadingPanel } from './LoadingPanel.jsx';

describe('LoadingPanel', () => {
  it('renders default text when no text is provided', () => {
    const component = create(<LoadingPanel />);
    const root = component.root;

    const headingNode = root.findByType('h3');
    expect(headingNode.props.children).toBe("MEMBUKA PORTAL WAKTU...");
  });

  it('renders provided text correctly', () => {
    const customText = "CUSTOM LOADING TEXT...";
    const component = create(<LoadingPanel text={customText} />);
    const root = component.root;

    const headingNode = root.findByType('h3');
    expect(headingNode.props.children).toBe(customText);
  });

  it('tells the visitor how long writing a chapter usually takes', () => {
    const component = create(<LoadingPanel text="MEMBUKA PORTAL SEJARAH..." />);
    const hint = component.root.findByProps({ 'data-testid': 'loading-hint' });

    expect(hint.props.children).toBe("AI sedang menulis babak ini. Biasanya butuh sekitar 30 detik.");
    expect(component.root.findByType('h3').props.children).toBe("MEMBUKA PORTAL SEJARAH...");
  });

  it('renders a provided hint instead of the default estimate', () => {
    const component = create(<LoadingPanel hint="Sebentar lagi." />);
    const hint = component.root.findByProps({ 'data-testid': 'loading-hint' });

    expect(hint.props.children).toBe("Sebentar lagi.");
  });
});
