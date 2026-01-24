import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecentlyUsedSection } from "../../../src/components/sidebar/RecentlyUsedSection";
import type { BaseComponentBlockDefinition } from "../../../src/registry/types";
import { resetDragState } from "../../../src/dnd/state";
import { resetGlobalComponentBlockRegistry } from "../../../src/registry";
import { z } from "zod/v4";

const mockBlockDefs = new Map<string, BaseComponentBlockDefinition>([
  [
    "paragraph",
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
  ],
  [
    "heading",
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
  ],
]);

describe("RecentlyUsedSection Component (PZ-206)", () => {
  beforeEach(() => {
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  afterEach(() => {
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  describe("rendering", () => {
    it("renders section title", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
        />
      );
      expect(screen.getByText("Recently Used")).toBeInTheDocument();
    });

    it("renders block items", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph", "heading"]}
          blockDefinitions={mockBlockDefs}
        />
      );
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Heading")).toBeInTheDocument();
    });

    it("returns null when no valid blocks", () => {
      const { container } = render(
        <RecentlyUsedSection
          blockTypeIds={["nonexistent"]}
          blockDefinitions={mockBlockDefs}
        />
      );
      expect(container.innerHTML).toBe("");
    });

    it("returns null when blockTypeIds is empty", () => {
      const { container } = render(
        <RecentlyUsedSection blockTypeIds={[]} blockDefinitions={mockBlockDefs} />
      );
      expect(container.innerHTML).toBe("");
    });

    it("filters out invalid block IDs", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph", "nonexistent", "heading"]}
          blockDefinitions={mockBlockDefs}
        />
      );
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Heading")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          className="custom-recent"
        />
      );
      const section = screen.getByText("Recently Used").closest("section");
      expect(section).toHaveClass("custom-recent");
    });
  });

  describe("collapsing", () => {
    it("shows content when not collapsed", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          isCollapsed={false}
        />
      );
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
    });

    it("hides content when collapsed", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          isCollapsed={true}
        />
      );
      expect(screen.queryByText("Paragraph")).not.toBeInTheDocument();
    });

    it("calls onToggle when header is clicked", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          onToggle={onToggle}
        />
      );

      await user.click(screen.getByText("Recently Used"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("calls onToggle on Enter key", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          onToggle={onToggle}
        />
      );

      const header = screen.getByText("Recently Used").closest("[role='button']");
      header?.focus();
      await user.keyboard("{Enter}");

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("adds collapsed class when collapsed", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          isCollapsed={true}
        />
      );
      const section = screen.getByText("Recently Used").closest("section");
      expect(section).toHaveClass("pz-recently-used--collapsed");
    });
  });

  describe("block interaction", () => {
    it("calls onBlockClick when block is clicked", async () => {
      const user = userEvent.setup();
      const onBlockClick = vi.fn();
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          onBlockClick={onBlockClick}
        />
      );

      await user.click(screen.getByLabelText("Insert Paragraph block"));
      expect(onBlockClick).toHaveBeenCalledWith("paragraph");
    });
  });

  describe("accessibility", () => {
    it("has aria-labelledby on section", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
        />
      );
      const section = screen.getByText("Recently Used").closest("section");
      expect(section).toHaveAttribute("aria-labelledby", "recently-used-header");
    });

    it("header has aria-expanded", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
          isCollapsed={false}
        />
      );
      const header = screen.getByText("Recently Used").closest("[role='button']");
      expect(header).toHaveAttribute("aria-expanded", "true");
    });

    it("header has aria-controls", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
        />
      );
      const header = screen.getByText("Recently Used").closest("[role='button']");
      expect(header).toHaveAttribute("aria-controls", "recently-used-content");
    });

    it("content has list role", () => {
      render(
        <RecentlyUsedSection
          blockTypeIds={["paragraph"]}
          blockDefinitions={mockBlockDefs}
        />
      );
      expect(screen.getByRole("list")).toBeInTheDocument();
    });
  });
});
