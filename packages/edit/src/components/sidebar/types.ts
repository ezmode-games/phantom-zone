/**
 * Block Sidebar Types
 *
 * Type definitions for the block sidebar component.
 * Implements PZ-206: Block Sidebar
 */

import type { BaseComponentBlockDefinition, BlockCategory, BlockCategoryMeta } from "../../registry/types";

/**
 * Props for the BlockSidebar component
 */
export interface BlockSidebarProps {
  /** Optional class name for the root element */
  className?: string;
  /** Callback when a block is inserted (via click or drag) */
  onBlockInsert?: (blockTypeId: string) => void;
  /** Optional guild ID to filter available blocks */
  guildId?: string;
  /** Whether to show the search input */
  showSearch?: boolean;
  /** Whether to show the recently used section */
  showRecentlyUsed?: boolean;
  /** Whether categories are collapsible */
  collapsibleCategories?: boolean;
  /** Initial collapsed state for categories */
  defaultCollapsedCategories?: string[];
}

/**
 * Props for the BlockItem component
 */
export interface BlockItemProps {
  /** Block definition */
  block: BaseComponentBlockDefinition;
  /** Whether this item is currently being dragged */
  isDragging?: boolean;
  /** Callback when block is clicked */
  onClick?: () => void;
  /** Optional class name */
  className?: string;
}

/**
 * Props for the CategorySection component
 */
export interface CategorySectionProps {
  /** Category metadata */
  category: BlockCategoryMeta;
  /** Blocks in this category */
  blocks: BaseComponentBlockDefinition[];
  /** Whether the category is collapsed */
  isCollapsed?: boolean;
  /** Callback to toggle collapse state */
  onToggle?: () => void;
  /** Whether the category is collapsible */
  collapsible?: boolean;
  /** Callback when a block is clicked */
  onBlockClick?: (blockTypeId: string) => void;
  /** Optional class name */
  className?: string;
}

/**
 * Props for the SearchInput component
 */
export interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Optional class name */
  className?: string;
}

/**
 * Props for the RecentlyUsedSection component
 */
export interface RecentlyUsedSectionProps {
  /** Block type IDs to display */
  blockTypeIds: string[];
  /** Block definitions lookup map */
  blockDefinitions: Map<string, BaseComponentBlockDefinition>;
  /** Whether the section is collapsed */
  isCollapsed?: boolean;
  /** Callback to toggle collapse state */
  onToggle?: () => void;
  /** Callback when a block is clicked */
  onBlockClick?: (blockTypeId: string) => void;
  /** Optional class name */
  className?: string;
}

/**
 * Grouped blocks by category for display
 */
export interface GroupedBlocks {
  category: BlockCategoryMeta;
  blocks: BaseComponentBlockDefinition[];
}
