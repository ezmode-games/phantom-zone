import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  $recentlyUsedBlocks,
  $sidebarSearchQuery,
  $collapsedCategories,
  $hasSearch,
  addToRecentlyUsed,
  clearRecentlyUsed,
  setSearchQuery,
  clearSearchQuery,
  toggleCategory,
  isCategoryCollapsed,
  expandAllCategories,
  collapseAllCategories,
  resetSidebarState,
  MAX_RECENTLY_USED,
} from "../../../src/components/sidebar/state";

describe("Sidebar State (PZ-206)", () => {
  beforeEach(() => {
    // Reset state before each test
    $recentlyUsedBlocks.set([]);
    $sidebarSearchQuery.set("");
    $collapsedCategories.set(new Set());
  });

  afterEach(() => {
    // Clean up after each test
    $recentlyUsedBlocks.set([]);
    $sidebarSearchQuery.set("");
    $collapsedCategories.set(new Set());
  });

  describe("$recentlyUsedBlocks", () => {
    it("starts with empty array", () => {
      expect($recentlyUsedBlocks.get()).toEqual([]);
    });

    it("can be set directly", () => {
      $recentlyUsedBlocks.set(["paragraph", "heading"]);
      expect($recentlyUsedBlocks.get()).toEqual(["paragraph", "heading"]);
    });
  });

  describe("addToRecentlyUsed", () => {
    it("adds a block type to the front", () => {
      addToRecentlyUsed("paragraph");
      expect($recentlyUsedBlocks.get()).toEqual(["paragraph"]);
    });

    it("moves existing block to front", () => {
      addToRecentlyUsed("paragraph");
      addToRecentlyUsed("heading");
      addToRecentlyUsed("paragraph");
      expect($recentlyUsedBlocks.get()).toEqual(["paragraph", "heading"]);
    });

    it("limits to MAX_RECENTLY_USED entries", () => {
      for (let i = 0; i < MAX_RECENTLY_USED + 3; i++) {
        addToRecentlyUsed(`block-${i}`);
      }
      expect($recentlyUsedBlocks.get().length).toBe(MAX_RECENTLY_USED);
    });

    it("keeps most recent blocks when limiting", () => {
      for (let i = 0; i < MAX_RECENTLY_USED + 2; i++) {
        addToRecentlyUsed(`block-${i}`);
      }
      const recent = $recentlyUsedBlocks.get();
      // Most recent should be at front
      expect(recent[0]).toBe(`block-${MAX_RECENTLY_USED + 1}`);
    });
  });

  describe("clearRecentlyUsed", () => {
    it("clears all recently used blocks", () => {
      addToRecentlyUsed("paragraph");
      addToRecentlyUsed("heading");
      clearRecentlyUsed();
      expect($recentlyUsedBlocks.get()).toEqual([]);
    });
  });

  describe("$sidebarSearchQuery", () => {
    it("starts with empty string", () => {
      expect($sidebarSearchQuery.get()).toBe("");
    });
  });

  describe("setSearchQuery", () => {
    it("sets the search query", () => {
      setSearchQuery("heading");
      expect($sidebarSearchQuery.get()).toBe("heading");
    });

    it("can set to empty string", () => {
      setSearchQuery("heading");
      setSearchQuery("");
      expect($sidebarSearchQuery.get()).toBe("");
    });
  });

  describe("clearSearchQuery", () => {
    it("clears the search query", () => {
      setSearchQuery("heading");
      clearSearchQuery();
      expect($sidebarSearchQuery.get()).toBe("");
    });
  });

  describe("$hasSearch", () => {
    it("is false when query is empty", () => {
      expect($hasSearch.get()).toBe(false);
    });

    it("is false when query is whitespace only", () => {
      setSearchQuery("   ");
      expect($hasSearch.get()).toBe(false);
    });

    it("is true when query has content", () => {
      setSearchQuery("heading");
      expect($hasSearch.get()).toBe(true);
    });
  });

  describe("$collapsedCategories", () => {
    it("starts with empty set", () => {
      expect($collapsedCategories.get().size).toBe(0);
    });
  });

  describe("toggleCategory", () => {
    it("collapses a category", () => {
      toggleCategory("typography");
      expect($collapsedCategories.get().has("typography")).toBe(true);
    });

    it("expands a collapsed category", () => {
      toggleCategory("typography");
      toggleCategory("typography");
      expect($collapsedCategories.get().has("typography")).toBe(false);
    });

    it("handles multiple categories independently", () => {
      toggleCategory("typography");
      toggleCategory("media");
      expect($collapsedCategories.get().has("typography")).toBe(true);
      expect($collapsedCategories.get().has("media")).toBe(true);

      toggleCategory("typography");
      expect($collapsedCategories.get().has("typography")).toBe(false);
      expect($collapsedCategories.get().has("media")).toBe(true);
    });
  });

  describe("isCategoryCollapsed", () => {
    it("returns false for expanded category", () => {
      expect(isCategoryCollapsed("typography")).toBe(false);
    });

    it("returns true for collapsed category", () => {
      toggleCategory("typography");
      expect(isCategoryCollapsed("typography")).toBe(true);
    });
  });

  describe("expandAllCategories", () => {
    it("expands all categories", () => {
      toggleCategory("typography");
      toggleCategory("media");
      toggleCategory("layout");
      expandAllCategories();
      expect($collapsedCategories.get().size).toBe(0);
    });
  });

  describe("collapseAllCategories", () => {
    it("collapses specified categories", () => {
      collapseAllCategories(["typography", "media", "layout"]);
      expect($collapsedCategories.get().has("typography")).toBe(true);
      expect($collapsedCategories.get().has("media")).toBe(true);
      expect($collapsedCategories.get().has("layout")).toBe(true);
    });

    it("replaces existing collapsed state", () => {
      toggleCategory("form");
      collapseAllCategories(["typography", "media"]);
      expect($collapsedCategories.get().has("form")).toBe(false);
      expect($collapsedCategories.get().has("typography")).toBe(true);
      expect($collapsedCategories.get().has("media")).toBe(true);
    });
  });

  describe("resetSidebarState", () => {
    it("resets search query", () => {
      setSearchQuery("heading");
      resetSidebarState();
      expect($sidebarSearchQuery.get()).toBe("");
    });

    it("resets collapsed categories", () => {
      toggleCategory("typography");
      resetSidebarState();
      expect($collapsedCategories.get().size).toBe(0);
    });

    it("does not reset recently used (persisted)", () => {
      addToRecentlyUsed("paragraph");
      resetSidebarState();
      // Recently used is intentionally NOT reset as it's persisted
      expect($recentlyUsedBlocks.get()).toEqual(["paragraph"]);
    });
  });
});
