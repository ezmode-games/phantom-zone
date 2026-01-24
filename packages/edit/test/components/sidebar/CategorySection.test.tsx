import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategorySection } from "../../../src/components/sidebar/CategorySection";
import type { BaseComponentBlockDefinition, BlockCategoryMeta } from "../../../src/registry/types";
import { resetDragState } from "../../../src/dnd/state";
import { resetGlobalComponentBlockRegistry } from "../../../src/registry";
import { z } from "zod/v4";

const mockCategory: BlockCategoryMeta = {
  id: "typography",
  name: "Typography",
  description: "Text and content blocks",
  icon: "type",
  order: 0,
};

const mockBlocks: BaseComponentBlockDefinition[] = [
  {
    id: "paragraph",
    name: "Paragraph",
    icon: "text",
    category: "typography",
    description: "A paragraph of text",
    isContainer: false,
    propsSchema: z.object({ content: z.string() }),
    defaultProps: { content: "" },
    component: () => null,
  },
  {
    id: "heading",
    name: "Heading",
    icon: "heading",
    category: "typography",
    description: "A heading",
    isContainer: false,
    propsSchema: z.object({ content: z.string(), level: z.number() }),
    defaultProps: { content: "", level: 2 },
    component: () => null,
  },
];

describe("CategorySection Component (PZ-206)", () => {
  beforeEach(() => {
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  afterEach(() => {
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  describe("rendering", () => {
    it("renders category name", () => {
      render(<CategorySection category={mockCategory} blocks={mockBlocks} />);
      expect(screen.getByText("Typography")).toBeInTheDocument();
    });

    it("renders block count", () => {
      render(<CategorySection category={mockCategory} blocks={mockBlocks} />);
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });

    it("renders block items", () => {
      render(<CategorySection category={mockCategory} blocks={mockBlocks} />);
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Heading")).toBeInTheDocument();
    });

    it("returns null for empty blocks array", () => {
      const { container } = render(
        <CategorySection category={mockCategory} blocks={[]} />
      );
      expect(container.innerHTML).toBe("");
    });

    it("applies data-category attribute", () => {
      render(<CategorySection category={mockCategory} blocks={mockBlocks} />);
      const section = screen.getByRole("region", { hidden: true }).closest("section");
      expect(section).toHaveAttribute("data-category", "typography");
    });

    it("applies custom className", () => {
      render(
        <CategorySection
          category={mockCategory}
          blocks={mockBlocks}
          className="custom-section"
        />
      );
      const section = screen.getByText("Typography").closest("section");
      expect(section).toHaveClass("custom-section");
    });
  });

  describe("collapsing", () => {
    it("shows content when not collapsed", () => {
      render(
        <CategorySection category={mockCategory} blocks={mockBlocks} isCollapsed={false} />
      );
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
    });

    it("hides content when collapsed", () => {
      render(
        <CategorySection category={mockCategory} blocks={mockBlocks} isCollapsed={true} />
      );
      expect(screen.queryByText("Paragraph")).not.toBeInTheDocument();
    });

    it("toggles on header click when collapsible", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <CategorySection
          category={mockCategory}
          blocks={mockBlocks}
          collapsible={true}
          onToggle={onToggle}
        />
      );

      await user.click(screen.getByText("Typography"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("does not toggle when not collapsible", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <CategorySection
          category={mockCategory}
          blocks={mockBlocks}
          collapsible={false}
          onToggle={onToggle}
        />
      );

      await user.click(screen.getByText("Typography"));
      expect(onToggle).not.toHaveBeenCalled();
    });

    it("toggles on Enter key when collapsible", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <CategorySection
          category={mockCategory}
          blocks={mockBlocks}
          collapsible={true}
          onToggle={onToggle}
        />
      );

      const header = screen.getByText("Typography").closest("[role='button']");
      header?.focus();
      await user.keyboard("{Enter}");

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("adds collapsed class when collapsed", () => {
      render(
        <CategorySection category={mockCategory} blocks={mockBlocks} isCollapsed={true} />
      );
      const section = screen.getByText("Typography").closest("section");
      expect(section).toHaveClass("pz-category-section--collapsed");
    });
  });

  describe("block interaction", () => {
    it("calls onBlockClick when block is clicked", async () => {
      const user = userEvent.setup();
      const onBlockClick = vi.fn();
      render(
        <CategorySection
          category={mockCategory}
          blocks={mockBlocks}
          onBlockClick={onBlockClick}
        />
      );

      await user.click(screen.getByLabelText("Insert Paragraph block"));
      expect(onBlockClick).toHaveBeenCalledWith("paragraph");
    });
  });

  describe("accessibility", () => {
    it("has aria-labelledby on section", () => {
      render(<CategorySection category={mockCategory} blocks={mockBlocks} />);
      const section = screen.getByText("Typography").closest("section");
      expect(section).toHaveAttribute("aria-labelledby", "category-typography-header");
    });

    it("header has aria-expanded when collapsible", () => {
      render(
        <CategorySection
          category={mockCategory}
          blocks={mockBlocks}
          collapsible={true}
          isCollapsed={false}
        />
      );
      const header = screen.getByText("Typography").closest("[role='button']");
      expect(header).toHaveAttribute("aria-expanded", "true");
    });

    it("header has aria-controls when collapsible", () => {
      render(
        <CategorySection
          category={mockCategory}
          blocks={mockBlocks}
          collapsible={true}
        />
      );
      const header = screen.getByText("Typography").closest("[role='button']");
      expect(header).toHaveAttribute("aria-controls", "category-typography-content");
    });

    it("content has list role", () => {
      render(<CategorySection category={mockCategory} blocks={mockBlocks} />);
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("blocks are list items", () => {
      render(<CategorySection category={mockCategory} blocks={mockBlocks} />);
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(2);
    });
  });
});
