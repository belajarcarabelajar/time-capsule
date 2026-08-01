import { GlobalRegistrator } from "@happy-dom/global-registrator";
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import { test, expect, describe, mock, afterEach } from "bun:test";
import { render, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import AuthModal from "../AuthModal";

describe("AuthModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  test("does not render when isOpen is false", () => {
    const { queryByText } = render(<AuthModal isOpen={false} onClose={mock()} />);
    expect(queryByText("Portal Terkunci")).toBeNull();
  });

  test("renders modal elements when isOpen is true", () => {
    const { getByText, getByRole } = render(<AuthModal isOpen={true} onClose={mock()} />);
    expect(getByText(/Portal Terkunci/i)).toBeTruthy();
    expect(getByText(/Sesi Penjelajah Diperlukan/i)).toBeTruthy();
    expect(getByRole("button", { name: /Masuk dengan Google/i })).toBeTruthy();
  });

  test("calls onClose when Batal button is clicked", () => {
    const handleClose = mock();
    const { getByText } = render(<AuthModal isOpen={true} onClose={handleClose} />);
    
    const cancelButton = getByText("Batal");
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalled();
  });
});
