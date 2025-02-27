import { useEffect } from "react";

interface KeyboardShortcutOptions {
  onSpaceDown?: () => void;
  onSpaceUp?: () => void;
  onHKeyDown?: () => void;
  onHKeyUp?: () => void;
  onVKeyDown?: () => void;
  onVKeyUp?: () => void;
}

/**
 * Custom hook for handling keyboard shortcuts
 * @param options - Object containing callback functions for different key events
 */
export const useKeyboardShortcuts = ({
  onSpaceDown,
  onSpaceUp,
  onHKeyDown,
  onHKeyUp,
  onVKeyDown,
  onVKeyUp,
}: KeyboardShortcutOptions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "Space":
          e.preventDefault();
          onSpaceDown?.();
          break;
        case "KeyH":
          e.preventDefault();
          onHKeyDown?.();
          break;
        case "KeyV":
          e.preventDefault();
          onVKeyDown?.();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "Space":
          onSpaceUp?.();
          break;
        case "KeyH":
          onHKeyUp?.();
          break;
        case "KeyV":
          onVKeyUp?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onSpaceDown, onSpaceUp, onHKeyDown, onHKeyUp, onVKeyDown, onVKeyUp]);
};
