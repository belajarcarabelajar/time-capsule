import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

import { test, expect, describe, mock, afterEach } from "bun:test";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import StartScreen from "../StartScreen";
import React, { useState } from "react";

describe("StartScreen", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders correctly and handles input/submit", () => {
    const handleStartAdventure = mock((e) => {
        if (e && e.preventDefault) e.preventDefault();
    });

    const setTopic = mock();

    // Test that submit correctly is enabled if topic exists and triggered
    const { getByPlaceholderText, getByRole, rerender } = render(
      <StartScreen
        topic=""
        setTopic={setTopic}
        handleStartAdventure={handleStartAdventure}
        isLoading={false}
      />
    );

    const input = getByPlaceholderText("Ketik Peristiwa Sejarah...");
    expect(input).toBeTruthy();

    const disabledButton = getByRole("button", { name: /Mulai Petualangan/i });
    expect(disabledButton.disabled).toBe(true);

    // Call native fireEvent
    fireEvent.change(input, { target: { value: "Revolusi Prancis" } });

    // Manually render with the topic populated, because happy-dom + react 18 + bun test event propagation
    // issues means controlled state simulation isn't working flawlessly.
    rerender(
      <StartScreen
        topic="Revolusi Prancis"
        setTopic={setTopic}
        handleStartAdventure={handleStartAdventure}
        isLoading={false}
      />
    );

    const button = getByRole("button", { name: /Mulai Petualangan/i });
    expect(button.disabled).toBe(false);

    fireEvent.submit(button.closest("form"));
    expect(handleStartAdventure).toHaveBeenCalled();
  });

  test("displays loading state correctly", () => {
    const { getByText, getByPlaceholderText, getByRole } = render(
      <StartScreen
        topic="Revolusi Prancis"
        setTopic={mock()}
        handleStartAdventure={mock()}
        isLoading={true}
      />
    );

    // Checks that loading text from LoadingPanel is displayed
    expect(getByText("MEMBUKA PORTAL SEJARAH...")).toBeTruthy();

    // Checks that input is disabled
    const input = getByPlaceholderText("Ketik Peristiwa Sejarah...");
    expect(input.disabled).toBe(true);

    // Checks that button is disabled
    const button = getByRole("button", { name: /Membuka Portal.../i });
    expect(button.disabled).toBe(true);
  });

  test("displays error state correctly", () => {
    const handleCopyError = mock();

    const { getByText, getByRole } = render(
      <StartScreen
        topic=""
        setTopic={mock()}
        handleStartAdventure={mock()}
        isLoading={false}
        errorMsg="Gagal memuat portal sejarah"
        errorDetail="Internal Server Error"
        handleCopyError={handleCopyError}
        copied={false}
      />
    );

    expect(getByText("Gagal memuat portal sejarah")).toBeTruthy();

    const copyButton = getByRole("button", { name: /Salin Detail Eror/i });
    expect(copyButton).toBeTruthy();

    fireEvent.click(copyButton);
    expect(handleCopyError).toHaveBeenCalled();
  });
});
