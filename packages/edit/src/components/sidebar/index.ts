/**
 * Block Sidebar Module
 *
 * Exports for the block sidebar component and related functionality.
 * Implements PZ-206: Block Sidebar
 */

// Components
export { BlockSidebar } from "./BlockSidebar";
export { BlockItem } from "./BlockItem";
export { CategorySection } from "./CategorySection";
export { SearchInput } from "./SearchInput";
export { RecentlyUsedSection } from "./RecentlyUsedSection";

// Types
export type {
  BlockSidebarProps,
  BlockItemProps,
  CategorySectionProps,
  SearchInputProps,
  RecentlyUsedSectionProps,
  GroupedBlocks,
} from "./types";

// State
export {
  // Atoms
  $recentlyUsedBlocks,
  $sidebarSearchQuery,
  $collapsedCategories,
  $hasSearch,
  // Actions
  addToRecentlyUsed,
  clearRecentlyUsed,
  setSearchQuery,
  clearSearchQuery,
  toggleCategory,
  isCategoryCollapsed,
  expandAllCategories,
  collapseAllCategories,
  resetSidebarState,
  // Constants
  MAX_RECENTLY_USED,
} from "./state";
