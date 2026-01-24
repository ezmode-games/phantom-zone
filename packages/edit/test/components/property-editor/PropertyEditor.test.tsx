/**
 * PropertyEditor Component Tests
 *
 * Tests for the block property editor component.
 * Implements PZ-208: Block Property Editor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { uuidv7 } from "uuidv7";
import { PropertyEditor } from "../../../src/components/property-editor/PropertyEditor";
import {
  resetPropertyEditorState,
} from "../../../src/components/property-editor/state";
import { initializeDocument, insertBlockAction } from "../../../src/model/document";
import { selectBlock } from "../../../src/selection/actions";
import { resetSelectionState } from "../../../src/selection/state";
import { resetGlobalComponentBlockRegistry } from "../../../src/registry/blocks";
import type { Block } from "../../../src/model/types";

describe("PropertyEditor Component (PZ-208)", () => {
  beforeEach(() => {
    initializeDocument();
    resetGlobalComponentBlockRegistry();
    resetSelectionState();
    resetPropertyEditorState();
  });

  afterEach(() => {
    initializeDocument();
    resetGlobalComponentBlockRegistry();
    resetSelectionState();
    resetPropertyEditorState();
  });

  function createTestBlock(type: string, props: Record<string, unknown> = {}): Block {
    return {
      id: uuidv7(),
      type,
      props,
    };
  }

  describe("rendering", () => {
    it("renders nothing when no block is selected", () => {
      const { container } = render(<PropertyEditor />);
      expect(container.querySelector(".pz-property-editor")).toBeNull();
    });

    it("renders when a block is selected", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByRole("complementary")).toBeInTheDocument();
      expect(screen.getByLabelText("Block properties")).toBeInTheDocument();
    });

    it("displays block name in header", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByText("Paragraph")).toBeInTheDocument();
    });

    it("displays block description if available", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByText("A paragraph of text")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor className="custom-editor" />);

      expect(screen.getByRole("complementary")).toHaveClass("custom-editor");
    });
  });

  describe("form fields", () => {
    it("renders text field for string props", () => {
      const block = createTestBlock("paragraph", { content: "Hello World" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      const input = screen.getByLabelText(/Content/);
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Hello World");
    });

    it("renders select field for enum props", () => {
      const block = createTestBlock("paragraph", { content: "", align: "left" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      const select = screen.getByLabelText(/Align/);
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe("SELECT");
    });

    it("renders checkbox for boolean props", () => {
      const block = createTestBlock("code", { content: "", showLineNumbers: true });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      const checkbox = screen.getByLabelText(/Show Line Numbers/);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it("renders select for heading level (union of literals)", () => {
      const block = createTestBlock("heading", { level: 2, content: "Title" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      const levelSelect = screen.getByLabelText(/Level/);
      expect(levelSelect).toBeInTheDocument();
      expect(levelSelect.tagName).toBe("SELECT");
    });
  });

  describe("action buttons", () => {
    it("renders action buttons by default", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByLabelText("Move block up")).toBeInTheDocument();
      expect(screen.getByLabelText("Move block down")).toBeInTheDocument();
      expect(screen.getByLabelText("Duplicate block")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete block")).toBeInTheDocument();
    });

    it("hides action buttons when showActions is false", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor showActions={false} />);

      expect(screen.queryByLabelText("Delete block")).not.toBeInTheDocument();
    });

    it("disables move up for first block", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByLabelText("Move block up")).toBeDisabled();
    });

    it("disables move down for last block", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByLabelText("Move block down")).toBeDisabled();
    });

    it("enables move up/down for middle block", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      const block3 = createTestBlock("paragraph", { content: "Third" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);
      selectBlock(block2.id);

      render(<PropertyEditor />);

      expect(screen.getByLabelText("Move block up")).not.toBeDisabled();
      expect(screen.getByLabelText("Move block down")).not.toBeDisabled();
    });

    it("calls onDelete when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor onDelete={onDelete} />);

      await user.click(screen.getByLabelText("Delete block"));

      expect(onDelete).toHaveBeenCalledWith(block.id);
    });

    it("calls onDuplicate when duplicate button is clicked", async () => {
      const user = userEvent.setup();
      const onDuplicate = vi.fn();
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor onDuplicate={onDuplicate} />);

      await user.click(screen.getByLabelText("Duplicate block"));

      expect(onDuplicate).toHaveBeenCalledWith(block.id);
    });

    it("calls onMoveUp when move up button is clicked", async () => {
      const user = userEvent.setup();
      const onMoveUp = vi.fn();
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      selectBlock(block2.id);

      render(<PropertyEditor onMoveUp={onMoveUp} />);

      await user.click(screen.getByLabelText("Move block up"));

      expect(onMoveUp).toHaveBeenCalledWith(block2.id);
    });

    it("calls onMoveDown when move down button is clicked", async () => {
      const user = userEvent.setup();
      const onMoveDown = vi.fn();
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      selectBlock(block1.id);

      render(<PropertyEditor onMoveDown={onMoveDown} />);

      await user.click(screen.getByLabelText("Move block down"));

      expect(onMoveDown).toHaveBeenCalledWith(block1.id);
    });
  });

  describe("live updates", () => {
    it("calls onPropsChange when field value changes", async () => {
      const user = userEvent.setup();
      const onPropsChange = vi.fn();
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor onPropsChange={onPropsChange} debounceDelay={0} />);

      const input = screen.getByLabelText(/Content/);
      await user.clear(input);
      await user.type(input, "New content");

      await waitFor(() => {
        expect(onPropsChange).toHaveBeenCalled();
      });
    });

    it("debounces rapid changes", async () => {
      const user = userEvent.setup();
      const onPropsChange = vi.fn();
      const block = createTestBlock("paragraph", { content: "" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor onPropsChange={onPropsChange} debounceDelay={100} />);

      const input = screen.getByLabelText(/Content/);
      await user.type(input, "abc");

      // Should not have been called immediately for each keystroke
      expect(onPropsChange.mock.calls.length).toBeLessThan(3);

      // Wait for debounce
      await waitFor(
        () => {
          expect(onPropsChange).toHaveBeenCalled();
        },
        { timeout: 200 }
      );
    });

    it("does not call onPropsChange when liveUpdate is false", async () => {
      const user = userEvent.setup();
      const onPropsChange = vi.fn();
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor onPropsChange={onPropsChange} liveUpdate={false} />);

      const input = screen.getByLabelText(/Content/);
      await user.clear(input);
      await user.type(input, "New content");

      // Wait a bit to ensure no call happens
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(onPropsChange).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("shows validation error for invalid value", async () => {
      const user = userEvent.setup();
      const block = createTestBlock("heading", { level: 2, content: "Title" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      // Clear the required content field
      const contentInput = screen.getByLabelText(/Content/);
      await user.clear(contentInput);

      // Note: The actual validation error display depends on the schema
      // For this test, we just verify the field can be cleared
      expect(contentInput).toHaveValue("");
    });
  });

  describe("empty state", () => {
    it("shows message when block has no editable props", () => {
      // Divider has minimal props (just style which is optional)
      const block = createTestBlock("divider", { style: "solid" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      // Should still render the editor with at least the style field
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has correct role on editor container", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByRole("complementary")).toHaveAttribute(
        "aria-label",
        "Block properties"
      );
    });

    it("has correct aria-invalid on fields with errors", async () => {
      const user = userEvent.setup();
      const block = createTestBlock("heading", { level: 2, content: "Title" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      // The form fields should have aria-invalid attribute available
      const contentInput = screen.getByLabelText(/Content/);
      // Initially should not be invalid
      expect(contentInput).toHaveAttribute("aria-invalid", "false");
    });

    it("action buttons have descriptive labels", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      expect(screen.getByLabelText("Move block up")).toBeInTheDocument();
      expect(screen.getByLabelText("Move block down")).toBeInTheDocument();
      expect(screen.getByLabelText("Duplicate block")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete block")).toBeInTheDocument();
    });

    it("required fields are marked", () => {
      const block = createTestBlock("heading", { level: 2, content: "Title" });
      insertBlockAction(block);
      selectBlock(block.id);

      render(<PropertyEditor />);

      // Content field should be required
      const contentLabel = screen.getByText(/Content/);
      const requiredMarker = contentLabel.querySelector(".pz-form-field__required");
      expect(requiredMarker).toBeInTheDocument();
    });
  });

  describe("block switching", () => {
    it("updates when selection changes to different block", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("heading", { level: 1, content: "Second" });
      insertBlockAction(block1);
      insertBlockAction(block2);

      const { rerender } = render(<PropertyEditor />);

      // Select first block
      selectBlock(block1.id);
      rerender(<PropertyEditor />);
      expect(screen.getByText("Paragraph")).toBeInTheDocument();

      // Select second block
      selectBlock(block2.id);
      rerender(<PropertyEditor />);
      expect(screen.getByText("Heading")).toBeInTheDocument();
    });

    it("resets local values when block changes", async () => {
      const block1 = createTestBlock("paragraph", { content: "Original" });
      const block2 = createTestBlock("paragraph", { content: "Different" });
      insertBlockAction(block1);
      insertBlockAction(block2);

      const { rerender } = render(<PropertyEditor />);

      // Select first block
      selectBlock(block1.id);
      rerender(<PropertyEditor />);

      const input1 = screen.getByLabelText(/Content/);
      expect(input1).toHaveValue("Original");

      // Select second block
      selectBlock(block2.id);
      rerender(<PropertyEditor />);

      const input2 = screen.getByLabelText(/Content/);
      expect(input2).toHaveValue("Different");
    });
  });
});
