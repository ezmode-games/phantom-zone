/**
 * Block Sidebar State Management
 *
 * Nanostores atoms for sidebar state including recently used blocks and UI state.
 * Implements PZ-206: Block Sidebar
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from "nanostores";
import type { BlockTypeId } from "../../model/types";

/**
 * Maximum number of recently used blocks to track
 */
export const MAX_RECENTLY_USED = 5;

/**
 * Storage key for recently used blocks persistence
 */
const RECENTLY_USED_STORAGE_KEY = "phantom-zone:recently-used-blocks";

/**
 * Load recently used blocks from localStorage
 */
function loadRecentlyUsed(): BlockTypeId[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const stored = localStorage.getItem(RECENTLY_USED_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is BlockTypeId => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save recently used blocks to localStorage
 */
function saveRecentlyUsed(blocks: BlockTypeId[]): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(RECENTLY_USED_STORAGE_KEY, JSON.stringify(blocks));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Recently used blocks atom
 * Persisted to localStorage when modified
 */
export const $recentlyUsedBlocks: WritableAtom<BlockTypeId[]> = atom<BlockTypeId[]>(loadRecentlyUsed());

/**
 * Sidebar search query
 */
export const $sidebarSearchQuery: WritableAtom<string> = atom<string>("");

/**
 * Collapsed category IDs
 */
export const $collapsedCategories: WritableAtom<Set<string>> = atom<Set<string>>(new Set());

/**
 * Computed: Whether there is an active search
 */
export const $hasSearch: ReadableAtom<boolean> = computed(
  $sidebarSearchQuery,
  (query) => query.trim().length > 0
);

/**
 * Add a block type to recently used
 * Moves to front if already present, adds to front otherwise
 */
export function addToRecentlyUsed(blockTypeId: BlockTypeId): void {
  const current = $recentlyUsedBlocks.get();

  // Remove if already present
  const filtered = current.filter((id) => id !== blockTypeId);

  // Add to front
  const updated = [blockTypeId, ...filtered];

  // Limit to max size
  const limited = updated.slice(0, MAX_RECENTLY_USED);
  $recentlyUsedBlocks.set(limited);
  saveRecentlyUsed(limited);
}

/**
 * Clear recently used blocks
 */
export function clearRecentlyUsed(): void {
  $recentlyUsedBlocks.set([]);
  saveRecentlyUsed([]);
}

/**
 * Set the sidebar search query
 */
export function setSearchQuery(query: string): void {
  $sidebarSearchQuery.set(query);
}

/**
 * Clear the sidebar search query
 */
export function clearSearchQuery(): void {
  $sidebarSearchQuery.set("");
}

/**
 * Toggle a category's collapsed state
 */
export function toggleCategory(categoryId: string): void {
  const current = $collapsedCategories.get();
  const updated = new Set(current);

  if (updated.has(categoryId)) {
    updated.delete(categoryId);
  } else {
    updated.add(categoryId);
  }

  $collapsedCategories.set(updated);
}

/**
 * Check if a category is collapsed
 */
export function isCategoryCollapsed(categoryId: string): boolean {
  return $collapsedCategories.get().has(categoryId);
}

/**
 * Expand all categories
 */
export function expandAllCategories(): void {
  $collapsedCategories.set(new Set());
}

/**
 * Collapse all categories
 */
export function collapseAllCategories(categoryIds: string[]): void {
  $collapsedCategories.set(new Set(categoryIds));
}

/**
 * Reset sidebar state to defaults
 */
export function resetSidebarState(): void {
  $sidebarSearchQuery.set("");
  $collapsedCategories.set(new Set());
  // Note: recently used is persisted, so we don't clear it by default
}
