import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizPopup } from '../QuizPopup.jsx';

describe('QuizPopup', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nothing when data is missing or type is not quiz', () => {
    const { container: container1 } = render(<QuizPopup data={null} />);
    expect(container1.firstChild).toBeNull();

    const { container: container2 } = render(<QuizPopup data={{ type: 'dialogue' }} />);
    expect(container2.firstChild).toBeNull();
  });

  it('renders correctly with valid quiz data', () => {
    const data = {
      type: 'quiz',
      text: 'What is the capital of France?',
      choices: [{ text: 'Paris' }, { text: 'London' }]
    };
    const { getByText } = render(<QuizPopup data={data} />);

    expect(getByText('Pertanyaan / Kuis')).toBeTruthy();
    expect(getByText('What is the capital of France?')).toBeTruthy();
    expect(getByText('Paris')).toBeTruthy();
    expect(getByText('London')).toBeTruthy();
  });

  it('correctly handles choices and options array names', () => {
    const dataWithChoices = {
      type: 'quiz',
      choices: [{ text: 'Choice A' }]
    };
    const { getByText: getByText1, unmount: unmount1 } = render(<QuizPopup data={dataWithChoices} />);
    expect(getByText1('Choice A')).toBeTruthy();
    unmount1();

    const dataWithOptions = {
      type: 'quiz',
      options: [{ text: 'Option A' }]
    };
    const { getByText: getByText2 } = render(<QuizPopup data={dataWithOptions} />);
    expect(getByText2('Option A')).toBeTruthy();
  });

  it('calls onAnswer with the correct value when an option is clicked', async () => {
    const data = {
      type: 'quiz',
      choices: [{ text: 'Choice 1' }, { text: 'Choice 2' }]
    };
    const onAnswerMock = mock();
    const { getAllByRole } = render(<QuizPopup data={data} onAnswer={onAnswerMock} />);

    const choiceButtons = getAllByRole('button');
    expect(choiceButtons.length).toBe(2);

    await userEvent.click(choiceButtons[0]);
    expect(onAnswerMock).toHaveBeenCalledWith(data.choices[0]);

    await userEvent.click(choiceButtons[1]);
    expect(onAnswerMock).toHaveBeenCalledWith(data.choices[1]);
  });

  it('renders character information correctly', () => {
    const data = { type: 'quiz', choices: [] };
    const charData = { name: 'Albert', icon: '👨‍🔬' };
    const { getByText } = render(<QuizPopup data={data} charData={charData} />);

    expect(getByText('Albert')).toBeTruthy();
    expect(getByText('👨‍🔬')).toBeTruthy();
  });

  it('shows fallback message when choices array is empty', () => {
    const data = { type: 'quiz', choices: [] };
    const { getByText } = render(<QuizPopup data={data} />);

    expect(getByText('Tidak ada pilihan respon yang ditemukan.')).toBeTruthy();
  });
});
