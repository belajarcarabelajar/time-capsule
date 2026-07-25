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
});
