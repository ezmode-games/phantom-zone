/**
 * RecentlyUsedSection Component
 *
 * Displays recently used blocks for quick access.
 * Implements PZ-206: Block Sidebar
 */

import type { ReactElement } from "react";
import { BlockItem } from "./BlockItem";
import type { RecentlyUsedSectionProps } from "./types";

/**
 * Renders the recently used blocks section
 */
export function RecentlyUsedSection({
  blockTypeIds,
  blockDefinitions,
  isCollapsed = false,
  onToggle,
  onBlockClick,
  className = "",
}: RecentlyUsedSectionProps): ReactElement | null {
  // Filter to only blocks that exist in the registry
  const validBlocks = blockTypeIds
    .map((id) => blockDefinitions.get(id))
    .filter((block): block is NonNullable<typeof block> => block !== undefined);

  // Don't render if no valid blocks
  if (validBlocks.length === 0) {
    return null;
  }

  const handleHeaderClick = () => {
    onToggle?.();
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle?.();
    }
  };

  return (
    <section
      className={`pz-recently-used ${isCollapsed ? "pz-recently-used--collapsed" : ""} ${className}`}
      aria-labelledby="recently-used-header"
    >
      <div
        id="recently-used-header"
        className="pz-recently-used__header"
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-controls="recently-used-content"
      >
        <span className="pz-recently-used__icon" data-icon="clock" aria-hidden="true">
          {/* Clock icon */}
        </span>
        <span className="pz-recently-used__name">Recently Used</span>
        <span
          className={`pz-recently-used__chevron ${isCollapsed ? "pz-recently-used__chevron--collapsed" : ""}`}
          aria-hidden="true"
        >
          {/* Chevron icon */}
        </span>
      </div>

      {!isCollapsed && (
        <div
          id="recently-used-content"
          className="pz-recently-used__content"
          role="list"
        >
          {validBlocks.map((block) => (
            <div key={block.id} role="listitem">
              <BlockItem
                block={block}
                onClick={() => onBlockClick?.(block.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
