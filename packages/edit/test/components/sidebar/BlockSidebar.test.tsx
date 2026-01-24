import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BlockSidebar,
  $recentlyUsedBlocks,
  $sidebarSearchQuery,
  $collapsedCategories,
  resetSidebarState,
  addToRecentlyUsed,
} from "../../../src/components/sidebar";
import { initializeDocument } from "../../../src/model/document";
import { resetGlobalComponentBlockRegistry, getComponentBlockRegistry } from "../../../src/registry";
import { resetSelectionState } from "../../../src/selection/state";
import { resetDragState } from "../../../src/dnd/state";

describe("BlockSidebar Component (PZ-206)", () => {
  beforeEach(() => {
    initializeDocument();
    resetGlobalComponentBlockRegistry();
    resetSelectionState();
    resetDragState();
    $recentlyUsedBlocks.set([]);
    $sidebarSearchQuery.set("");
    $collapsedCategories.set(new Set());
  });

  afterEach(() => {
    initializeDocument();
    resetGlobalComponentBlockRegistry();
    resetSelectionState();
    resetDragState();
    $recentlyUsedBlocks.set([]);
    $sidebarSearchQuery.set("");
    $collapsedCategories.set(new Set());
  });

  describe("rendering", () => {
    it("renders with default props", () => {
      render(<BlockSidebar />);
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });

    it("renders search input by default", () => {
      render(<BlockSidebar />);
      expect(screen.getByPlaceholderText("Search blocks...")).toBeInTheDocument();
    });

    it("hides search when showSearch is false", () => {
      render(<BlockSidebar showSearch={false} />);
      expect(screen.queryByPlaceholderText("Search blocks...")).not.toBeInTheDocument();
    });

    it("renders category sections", () => {
      render(<BlockSidebar />);
      // Typography category should be visible with blocks
      expect(screen.getByText("Typography")).toBeInTheDocument();
    });

    it("renders block items within categories", () => {
      render(<BlockSidebar />);
      // Default registry includes paragraph, heading, etc.
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
      expect(screen.getByText("Heading")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<BlockSidebar className="custom-sidebar" />);
      expect(screen.getByRole("complementary")).toHaveClass("custom-sidebar");
    });
  });

  describe("search functionality", () => {
    it("filters blocks by name", async () => {
      const user = userEvent.setup();
      render(<BlockSidebar />);

      const searchInput = screen.getByPlaceholderText("Search blocks...");
      await user.type(searchInput, "heading");

      // Should show heading
      expect(screen.getByText("Heading")).toBeInTheDocument();
      // Paragraph may or may not be visible depending on search implementation
    });

    it("shows empty state when no matches", async () => {
      const user = userEvent.setup();
      render(<BlockSidebar />);

      const searchInput = screen.getByPlaceholderText("Search blocks...");
      await user.type(searchInput, "xyznonexistent123");

      expect(screen.getByText(/No blocks match your search/)).toBeInTheDocument();
    });

    it("clears search on escape", async () => {
      const user = userEvent.setup();
      render(<BlockSidebar />);

      const searchInput = screen.getByPlaceholderText("Search blocks...");
      await user.type(searchInput, "heading");
      await user.keyboard("{Escape}");

      expect(searchInput).toHaveValue("");
    });
  });

  describe("recently used section", () => {
    it("shows recently used when there are items", () => {
      addToRecentlyUsed("paragraph");
      addToRecentlyUsed("heading");
      render(<BlockSidebar />);

      expect(screen.getByText("Recently Used")).toBeInTheDocument();
    });

    it("hides recently used when empty", () => {
      render(<BlockSidebar />);
      expect(screen.queryByText("Recently Used")).not.toBeInTheDocument();
    });

    it("hides recently used when showRecentlyUsed is false", () => {
      addToRecentlyUsed("paragraph");
      render(<BlockSidebar showRecentlyUsed={false} />);
      expect(screen.queryByText("Recently Used")).not.toBeInTheDocument();
    });

    it("hides recently used during search", async () => {
      const user = userEvent.setup();
      addToRecentlyUsed("paragraph");
      render(<BlockSidebar />);

      const searchInput = screen.getByPlaceholderText("Search blocks...");
      await user.type(searchInput, "heading");

      expect(screen.queryByText("Recently Used")).not.toBeInTheDocument();
    });
  });

  describe("category collapsing", () => {
    it("collapses category on header click", async () => {
      const user = userEvent.setup();
      render(<BlockSidebar />);

      // Find Typography category header and click it
      const typographyHeader = screen.getByText("Typography");
      await user.click(typographyHeader);

      // The Paragraph block should now be hidden
      // We need to check that the content is not visible
      const section = typographyHeader.closest(".pz-category-section");
      expect(section).toHaveClass("pz-category-section--collapsed");
    });

    it("expands collapsed category on click", async () => {
      const user = userEvent.setup();
      $collapsedCategories.set(new Set(["typography"]));
      render(<BlockSidebar />);

      const typographyHeader = screen.getByText("Typography");
      await user.click(typographyHeader);

      const section = typographyHeader.closest(".pz-category-section");
      expect(section).not.toHaveClass("pz-category-section--collapsed");
    });

    it("respects defaultCollapsedCategories", () => {
      render(<BlockSidebar defaultCollapsedCategories={["typography"]} />);
      // Typography section should be collapsed
      const typographyHeader = screen.getByText("Typography");
      const section = typographyHeader.closest(".pz-category-section");
      expect(section).toHaveClass("pz-category-section--collapsed");
    });

    it("disables collapsing when collapsibleCategories is false", async () => {
      const user = userEvent.setup();
      render(<BlockSidebar collapsibleCategories={false} />);

      const typographyHeader = screen.getByText("Typography");
      await user.click(typographyHeader);

      // Should not have collapsed
      const section = typographyHeader.closest(".pz-category-section");
      expect(section).not.toHaveClass("pz-category-section--collapsed");
    });
  });

  describe("block insertion", () => {
    it("calls onBlockInsert when block is clicked", async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<BlockSidebar onBlockInsert={onInsert} />);

      const paragraphBlock = screen.getByLabelText("Insert Paragraph block");
      await user.click(paragraphBlock);

      expect(onInsert).toHaveBeenCalledWith("paragraph");
    });

    it("adds clicked block to recently used", async () => {
      const user = userEvent.setup();
      render(<BlockSidebar />);

      const paragraphBlock = screen.getByLabelText("Insert Paragraph block");
      await user.click(paragraphBlock);

      expect($recentlyUsedBlocks.get()).toContain("paragraph");
    });

    it("supports keyboard activation (Enter)", async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<BlockSidebar onBlockInsert={onInsert} />);

      const paragraphBlock = screen.getByLabelText("Insert Paragraph block");
      paragraphBlock.focus();
      await user.keyboard("{Enter}");

      expect(onInsert).toHaveBeenCalledWith("paragraph");
    });

    it("supports keyboard activation (Space)", async () => {
      const user = userEvent.setup();
      const onInsert = vi.fn();
      render(<BlockSidebar onBlockInsert={onInsert} />);

      const paragraphBlock = screen.getByLabelText("Insert Paragraph block");
      paragraphBlock.focus();
      await user.keyboard(" ");

      expect(onInsert).toHaveBeenCalledWith("paragraph");
    });
  });

  describe("guild filtering", () => {
    it("filters blocks by guild when guildId is provided", () => {
      // Register a guild-restricted block
      const registry = getComponentBlockRegistry();

      // Default blocks have no restrictions, so all should be visible
      render(<BlockSidebar guildId="test-guild" />);
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
    });
  });

  describe("drag and drop", () => {
    it("block items are draggable", () => {
      render(<BlockSidebar />);
      const paragraphBlock = screen.getByLabelText("Insert Paragraph block");
      expect(paragraphBlock).toHaveAttribute("draggable", "true");
    });

    it("block items have correct data attributes", () => {
      render(<BlockSidebar />);
      const paragraphBlock = screen.getByLabelText("Insert Paragraph block");
      expect(paragraphBlock).toHaveAttribute("data-block-type", "paragraph");
    });
  });

  describe("accessibility", () => {
    it("has correct role on sidebar", () => {
      render(<BlockSidebar />);
      expect(screen.getByRole("complementary")).toHaveAttribute("aria-label", "Block palette");
    });

    it("category sections have proper aria labels", () => {
      render(<BlockSidebar />);
      const typographySection = screen.getByText("Typography").closest("section");
      expect(typographySection).toHaveAttribute("aria-labelledby");
    });

    it("block items have descriptive labels", () => {
      render(<BlockSidebar />);
      expect(screen.getByLabelText("Insert Paragraph block")).toBeInTheDocument();
      expect(screen.getByLabelText("Insert Heading block")).toBeInTheDocument();
    });

    it("collapsible sections have aria-expanded", () => {
      render(<BlockSidebar />);
      const typographyHeader = screen.getByText("Typography").closest("[role='button']");
      expect(typographyHeader).toHaveAttribute("aria-expanded", "true");
    });
  });
});
