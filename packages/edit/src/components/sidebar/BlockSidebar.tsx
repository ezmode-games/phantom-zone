/**
 * BlockSidebar Component
 *
 * Main sidebar component showing available blocks grouped by category.
 * Supports drag-to-insert, click-to-insert, search/filter, and recently used.
 * Implements PZ-206: Block Sidebar
 */

import { useCallback, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { uuidv7 } from "uuidv7";
import type { Block } from "../../model/types";
import { insertBlockAction, $document, findBlockById } from "../../model/document";
import { $focus } from "../../selection/state";
import { getNextBlockId } from "../../selection/state";
import { getComponentBlockRegistry } from "../../registry/blocks";
import { BLOCK_CATEGORIES } from "../../registry/types";
import type { BaseComponentBlockDefinition, BlockCategoryMeta } from "../../registry/types";
import {
  $recentlyUsedBlocks,
  $sidebarSearchQuery,
  $collapsedCategories,
  addToRecentlyUsed,
  setSearchQuery,
  toggleCategory,
  isCategoryCollapsed,
} from "./state";
import type { BlockSidebarProps, GroupedBlocks } from "./types";
import { SearchInput } from "./SearchInput";
import { RecentlyUsedSection } from "./RecentlyUsedSection";
import { CategorySection } from "./CategorySection";

/**
 * Main block sidebar component
 */
export function BlockSidebar({
  className = "",
  onBlockInsert,
  guildId,
  showSearch = true,
  showRecentlyUsed = true,
  collapsibleCategories = true,
  defaultCollapsedCategories,
}: BlockSidebarProps): React.ReactElement {
  const registry = getComponentBlockRegistry();
  const recentlyUsedIds = useStore($recentlyUsedBlocks);
  const searchQuery = useStore($sidebarSearchQuery);
  const collapsedCategories = useStore($collapsedCategories);
  const focus = useStore($focus);

  // Initialize default collapsed categories
  useEffect(() => {
    if (defaultCollapsedCategories && defaultCollapsedCategories.length > 0) {
      const current = $collapsedCategories.get();
      if (current.size === 0) {
        $collapsedCategories.set(new Set(defaultCollapsedCategories));
      }
    }
  }, [defaultCollapsedCategories]);

  // Get available blocks (filtered by guild if provided)
  const availableBlocks = useMemo(() => {
    if (guildId) {
      return registry.getForGuild(guildId);
    }
    return registry.getAll();
  }, [registry, guildId]);

  // Create block definitions map for lookups
  const blockDefinitionsMap = useMemo(() => {
    const map = new Map<string, BaseComponentBlockDefinition>();
    for (const block of availableBlocks) {
      map.set(block.id, block);
    }
    return map;
  }, [availableBlocks]);

  // Filter blocks by search query
  const filteredBlocks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return availableBlocks;
    }
    return registry.search(query).filter((block) => blockDefinitionsMap.has(block.id));
  }, [availableBlocks, searchQuery, registry, blockDefinitionsMap]);

  // Group filtered blocks by category
  const groupedBlocks = useMemo((): GroupedBlocks[] => {
    const groups: GroupedBlocks[] = [];

    // Sort categories by order
    const sortedCategories = [...BLOCK_CATEGORIES].sort((a, b) => a.order - b.order);

    for (const category of sortedCategories) {
      const categoryBlocks = filteredBlocks.filter((block) => block.category === category.id);
      if (categoryBlocks.length > 0 || !searchQuery) {
        groups.push({
          category,
          blocks: categoryBlocks,
        });
      }
    }

    return groups;
  }, [filteredBlocks, searchQuery]);

  // Handle search query change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Handle category toggle
  const handleCategoryToggle = useCallback((categoryId: string) => {
    toggleCategory(categoryId);
  }, []);

  // Handle block click - insert at cursor/selection
  const handleBlockClick = useCallback(
    (blockTypeId: string) => {
      const definition = blockDefinitionsMap.get(blockTypeId);
      if (!definition) return;

      // Determine insert position
      const doc = $document.get();
      let insertIndex = doc.blocks.length;
      let parentId: string | undefined;

      // If there's a focused block, insert after it
      if (focus.focusedId) {
        const focusedBlock = findBlockById(doc.blocks, focus.focusedId);
        if (focusedBlock) {
          // Find index in root blocks or parent
          const rootIndex = doc.blocks.findIndex((b) => b.id === focus.focusedId);
          if (rootIndex !== -1) {
            insertIndex = rootIndex + 1;
          }
        }
      }

      // Create the new block
      const newBlock: Block = {
        id: uuidv7(),
        type: blockTypeId,
        props: { ...definition.defaultProps },
      };

      // Add children array for containers
      if (definition.isContainer) {
        newBlock.children = [];
      }

      // Insert the block
      const result = insertBlockAction(newBlock, parentId, insertIndex);

      if (result.ok) {
        // Track recently used
        addToRecentlyUsed(blockTypeId);

        // Call callback if provided
        onBlockInsert?.(blockTypeId);
      }
    },
    [blockDefinitionsMap, focus.focusedId, onBlockInsert]
  );

  // Filter recently used to available blocks
  const filteredRecentlyUsed = useMemo(() => {
    return recentlyUsedIds.filter((id) => blockDefinitionsMap.has(id));
  }, [recentlyUsedIds, blockDefinitionsMap]);

  return (
    <aside className={`pz-block-sidebar ${className}`} role="complementary" aria-label="Block palette">
      {showSearch && (
        <div className="pz-block-sidebar__search">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search blocks..."
          />
        </div>
      )}

      <div className="pz-block-sidebar__content">
        {showRecentlyUsed && !searchQuery && filteredRecentlyUsed.length > 0 && (
          <RecentlyUsedSection
            blockTypeIds={filteredRecentlyUsed}
            blockDefinitions={blockDefinitionsMap}
            isCollapsed={isCategoryCollapsed("recently-used")}
            onToggle={() => handleCategoryToggle("recently-used")}
            onBlockClick={handleBlockClick}
          />
        )}

        {groupedBlocks.map(({ category, blocks }) => (
          <CategorySection
            key={category.id}
            category={category}
            blocks={blocks}
            isCollapsed={collapsibleCategories && collapsedCategories.has(category.id)}
            onToggle={() => handleCategoryToggle(category.id)}
            collapsible={collapsibleCategories}
            onBlockClick={handleBlockClick}
          />
        ))}

        {searchQuery && filteredBlocks.length === 0 && (
          <div className="pz-block-sidebar__empty">
            <p>No blocks match your search.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
