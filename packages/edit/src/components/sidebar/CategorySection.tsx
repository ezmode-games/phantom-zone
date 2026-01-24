/**
 * CategorySection Component
 *
 * Displays a collapsible category section with its blocks.
 * Implements PZ-206: Block Sidebar
 */

import type { ReactElement } from "react";
import { BlockItem } from "./BlockItem";
import type { CategorySectionProps } from "./types";

/**
 * Renders a category section with optional collapse functionality
 */
export function CategorySection({
  category,
  blocks,
  isCollapsed = false,
  onToggle,
  collapsible = true,
  onBlockClick,
  className = "",
}: CategorySectionProps): ReactElement | null {
  // Don't render empty categories
  if (blocks.length === 0) {
    return null;
  }

  const handleHeaderClick = () => {
    if (collapsible) {
      onToggle?.();
    }
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (collapsible && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle?.();
    }
  };

  return (
    <section
      className={`pz-category-section ${isCollapsed ? "pz-category-section--collapsed" : ""} ${className}`}
      data-category={category.id}
      aria-labelledby={`category-${category.id}-header`}
    >
      <div
        id={`category-${category.id}-header`}
        className="pz-category-section__header"
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? !isCollapsed : undefined}
        aria-controls={collapsible ? `category-${category.id}-content` : undefined}
      >
        <span className="pz-category-section__icon" data-icon={category.icon} aria-hidden="true">
          {/* Icon rendered via CSS or icon component */}
        </span>
        <span className="pz-category-section__name">{category.name}</span>
        <span className="pz-category-section__count">({blocks.length})</span>
        {collapsible && (
          <span
            className={`pz-category-section__chevron ${isCollapsed ? "pz-category-section__chevron--collapsed" : ""}`}
            aria-hidden="true"
          >
            {/* Chevron icon */}
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div
          id={`category-${category.id}-content`}
          className="pz-category-section__content"
          role="list"
        >
          {blocks.map((block) => (
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
