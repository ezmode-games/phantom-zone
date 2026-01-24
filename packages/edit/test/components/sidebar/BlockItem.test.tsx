import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockItem } from "../../../src/components/sidebar/BlockItem";
import type { BaseComponentBlockDefinition } from "../../../src/registry/types";
import { resetDragState } from "../../../src/dnd/state";
import { resetGlobalComponentBlockRegistry } from "../../../src/registry";
import { z } from "zod/v4";

const mockParagraphBlock: BaseComponentBlockDefinition = {
  id: "paragraph",
  name: "Paragraph",
  icon: "text",
  category: "typography",
  description: "A paragraph of text",
  isContainer: false,
  propsSchema: z.object({ content: z.string() }),
  defaultProps: { content: "" },
  keywords: ["text", "body", "p"],
  component: () => null,
  version: "1.0.0",
};

const mockPremiumBlock: BaseComponentBlockDefinition = {
  id: "premium-block",
  name: "Premium Block",
  icon: "crown",
  category: "other",
  description: "A premium block",
  isContainer: false,
  propsSchema: z.object({ content: z.string() }),
  defaultProps: { content: "" },
  isPremium: true,
  component: () => null,
};

describe("BlockItem Component (PZ-206)", () => {
  beforeEach(() => {
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  afterEach(() => {
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  describe("rendering", () => {
    it("renders block name", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
    });

    it("renders with data-block-type attribute", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      const item = screen.getByRole("button");
      expect(item).toHaveAttribute("data-block-type", "paragraph");
    });

    it("renders with aria-label for accessibility", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      expect(screen.getByLabelText("Insert Paragraph block")).toBeInTheDocument();
    });

    it("shows description as title", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      const item = screen.getByRole("button");
      expect(item).toHaveAttribute("title", "A paragraph of text");
    });

    it("renders premium badge for premium blocks", () => {
      render(<BlockItem block={mockPremiumBlock} />);
      expect(screen.getByText("PRO")).toBeInTheDocument();
    });

    it("does not render premium badge for non-premium blocks", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      expect(screen.queryByText("PRO")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<BlockItem block={mockParagraphBlock} className="custom-class" />);
      const item = screen.getByRole("button");
      expect(item).toHaveClass("custom-class");
    });
  });

  describe("click interaction", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<BlockItem block={mockParagraphBlock} onClick={onClick} />);

      await user.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("handles Enter key press", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<BlockItem block={mockParagraphBlock} onClick={onClick} />);

      const item = screen.getByRole("button");
      item.focus();
      await user.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("handles Space key press", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<BlockItem block={mockParagraphBlock} onClick={onClick} />);

      const item = screen.getByRole("button");
      item.focus();
      await user.keyboard(" ");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not crash when onClick is not provided", async () => {
      const user = userEvent.setup();
      render(<BlockItem block={mockParagraphBlock} />);

      await user.click(screen.getByRole("button"));
      // Should not throw
    });
  });

  describe("drag behavior", () => {
    it("is draggable", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      const item = screen.getByRole("button");
      expect(item).toHaveAttribute("draggable", "true");
    });
  });

  describe("accessibility", () => {
    it("has button role", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("is focusable", () => {
      render(<BlockItem block={mockParagraphBlock} />);
      const item = screen.getByRole("button");
      expect(item).toHaveAttribute("tabIndex", "0");
    });
  });
});
