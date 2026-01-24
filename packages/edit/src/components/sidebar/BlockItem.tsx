/**
 * BlockItem Component
 *
 * Displays a single block type in the sidebar with icon and name.
 * Supports both drag-to-insert and click-to-insert.
 * Implements PZ-206: Block Sidebar
 */

import type { ReactElement } from "react";
import { useDragSidebar } from "../../dnd/hooks";
import type { BlockItemProps } from "./types";

/**
 * Renders a single block item in the sidebar
 */
export function BlockItem({ block, onClick, className = "" }: BlockItemProps): ReactElement {
  const { isDragging, dragProps } = useDragSidebar({
    blockTypeId: block.id,
    displayName: block.name,
    icon: block.icon,
  });

  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      {...dragProps}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`pz-block-item ${isDragging ? "pz-block-item--dragging" : ""} ${className}`}
      data-block-type={block.id}
      aria-label={`Insert ${block.name} block`}
      title={block.description}
    >
      <span className="pz-block-item__icon" data-icon={block.icon} aria-hidden="true">
        {/* Icon rendered via CSS or icon component */}
      </span>
      <span className="pz-block-item__name">{block.name}</span>
      {block.isPremium && (
        <span className="pz-block-item__badge pz-block-item__badge--premium" aria-label="Premium">
          PRO
        </span>
      )}
    </div>
  );
}
