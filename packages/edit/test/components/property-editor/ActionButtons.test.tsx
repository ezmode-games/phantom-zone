/**
 * ActionButtons Component Tests
 *
 * Tests for block action buttons (delete, duplicate, move).
 * Implements PZ-208: Block Property Editor
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionButtons } from "../../../src/components/property-editor/ActionButtons";

describe("ActionButtons Component (PZ-208)", () => {
  const defaultProps = {
    blockId: "test-block-id",
    canMoveUp: true,
    canMoveDown: true,
  };

  describe("rendering", () => {
    it("renders all action buttons", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByLabelText("Move block up")).toBeInTheDocument();
      expect(screen.getByLabelText("Move block down")).toBeInTheDocument();
      expect(screen.getByLabelText("Duplicate block")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete block")).toBeInTheDocument();
    });

    it("has correct role and label on container", () => {
      render(<ActionButtons {...defaultProps} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-label", "Block actions");
    });

    it("renders button labels", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByText("Move Up")).toBeInTheDocument();
      expect(screen.getByText("Move Down")).toBeInTheDocument();
      expect(screen.getByText("Duplicate")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  describe("move up button", () => {
    it("is enabled when canMoveUp is true", () => {
      render(<ActionButtons {...defaultProps} canMoveUp={true} />);

      expect(screen.getByLabelText("Move block up")).not.toBeDisabled();
    });

    it("is disabled when canMoveUp is false", () => {
      render(<ActionButtons {...defaultProps} canMoveUp={false} />);

      expect(screen.getByLabelText("Move block up")).toBeDisabled();
    });

    it("calls onMoveUp with blockId when clicked", async () => {
      const user = userEvent.setup();
      const onMoveUp = vi.fn();

      render(<ActionButtons {...defaultProps} onMoveUp={onMoveUp} />);

      await user.click(screen.getByLabelText("Move block up"));

      expect(onMoveUp).toHaveBeenCalledWith("test-block-id");
    });

    it("does not call onMoveUp when disabled", async () => {
      const user = userEvent.setup();
      const onMoveUp = vi.fn();

      render(<ActionButtons {...defaultProps} canMoveUp={false} onMoveUp={onMoveUp} />);

      const button = screen.getByLabelText("Move block up");
      await user.click(button);

      expect(onMoveUp).not.toHaveBeenCalled();
    });
  });

  describe("move down button", () => {
    it("is enabled when canMoveDown is true", () => {
      render(<ActionButtons {...defaultProps} canMoveDown={true} />);

      expect(screen.getByLabelText("Move block down")).not.toBeDisabled();
    });

    it("is disabled when canMoveDown is false", () => {
      render(<ActionButtons {...defaultProps} canMoveDown={false} />);

      expect(screen.getByLabelText("Move block down")).toBeDisabled();
    });

    it("calls onMoveDown with blockId when clicked", async () => {
      const user = userEvent.setup();
      const onMoveDown = vi.fn();

      render(<ActionButtons {...defaultProps} onMoveDown={onMoveDown} />);

      await user.click(screen.getByLabelText("Move block down"));

      expect(onMoveDown).toHaveBeenCalledWith("test-block-id");
    });
  });

  describe("duplicate button", () => {
    it("is always enabled when not disabled globally", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByLabelText("Duplicate block")).not.toBeDisabled();
    });

    it("calls onDuplicate with blockId when clicked", async () => {
      const user = userEvent.setup();
      const onDuplicate = vi.fn();

      render(<ActionButtons {...defaultProps} onDuplicate={onDuplicate} />);

      await user.click(screen.getByLabelText("Duplicate block"));

      expect(onDuplicate).toHaveBeenCalledWith("test-block-id");
    });
  });

  describe("delete button", () => {
    it("is always enabled when not disabled globally", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByLabelText("Delete block")).not.toBeDisabled();
    });

    it("calls onDelete with blockId when clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      render(<ActionButtons {...defaultProps} onDelete={onDelete} />);

      await user.click(screen.getByLabelText("Delete block"));

      expect(onDelete).toHaveBeenCalledWith("test-block-id");
    });
  });

  describe("disabled state", () => {
    it("disables all buttons when disabled is true", () => {
      render(<ActionButtons {...defaultProps} disabled />);

      expect(screen.getByLabelText("Move block up")).toBeDisabled();
      expect(screen.getByLabelText("Move block down")).toBeDisabled();
      expect(screen.getByLabelText("Duplicate block")).toBeDisabled();
      expect(screen.getByLabelText("Delete block")).toBeDisabled();
    });

    it("combines disabled with canMoveUp/canMoveDown", () => {
      render(
        <ActionButtons
          {...defaultProps}
          canMoveUp={true}
          canMoveDown={false}
          disabled={true}
        />
      );

      // All should be disabled due to disabled prop
      expect(screen.getByLabelText("Move block up")).toBeDisabled();
      expect(screen.getByLabelText("Move block down")).toBeDisabled();
    });
  });

  describe("missing handlers", () => {
    it("does not throw when handlers are not provided", async () => {
      const user = userEvent.setup();

      render(<ActionButtons {...defaultProps} />);

      // Should not throw
      await user.click(screen.getByLabelText("Move block up"));
      await user.click(screen.getByLabelText("Move block down"));
      await user.click(screen.getByLabelText("Duplicate block"));
      await user.click(screen.getByLabelText("Delete block"));
    });
  });

  describe("accessibility", () => {
    it("buttons have title attributes", () => {
      render(<ActionButtons {...defaultProps} />);

      expect(screen.getByLabelText("Move block up")).toHaveAttribute("title", "Move block up");
      expect(screen.getByLabelText("Move block down")).toHaveAttribute("title", "Move block down");
      expect(screen.getByLabelText("Duplicate block")).toHaveAttribute("title", "Duplicate block");
      expect(screen.getByLabelText("Delete block")).toHaveAttribute("title", "Delete block");
    });

    it("buttons have type=button", () => {
      render(<ActionButtons {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).toHaveAttribute("type", "button");
      }
    });
  });
});
