/**
 * Components Module
 *
 * React component exports for the block editor.
 */

// Block Sidebar (PZ-206)
export {
  // Components
  BlockSidebar,
  BlockItem,
  CategorySection,
  SearchInput,
  RecentlyUsedSection,
  // Types
  type BlockSidebarProps,
  type BlockItemProps,
  type CategorySectionProps,
  type SearchInputProps,
  type RecentlyUsedSectionProps,
  type GroupedBlocks,
  // State
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
} from "./sidebar";
