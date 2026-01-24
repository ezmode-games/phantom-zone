/**
 * ActionButtons Component
 *
 * Renders action buttons for block manipulation (delete, duplicate, move).
 * Implements PZ-208: Block Property Editor
 */

import type { ReactElement } from "react";
import type { ActionButtonsProps } from "./types";

/**
 * Renders action buttons for the property editor
 */
export function ActionButtons({
  blockId,
  canMoveUp,
  canMoveDown,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  disabled,
}: ActionButtonsProps): ReactElement {
  const handleDelete = () => {
    onDelete?.(blockId);
  };

  const handleDuplicate = () => {
    onDuplicate?.(blockId);
  };

  const handleMoveUp = () => {
    onMoveUp?.(blockId);
  };

  const handleMoveDown = () => {
    onMoveDown?.(blockId);
  };

  return (
    <div className="pz-property-editor__actions" role="group" aria-label="Block actions">
      <div className="pz-property-editor__actions-row">
        <button
          type="button"
          className="pz-property-editor__action pz-property-editor__action--move-up"
          onClick={handleMoveUp}
          disabled={disabled || !canMoveUp}
          aria-label="Move block up"
          title="Move block up"
        >
          <span className="pz-property-editor__action-icon" data-icon="chevron-up" aria-hidden="true" />
          <span className="pz-property-editor__action-label">Move Up</span>
        </button>
        <button
          type="button"
          className="pz-property-editor__action pz-property-editor__action--move-down"
          onClick={handleMoveDown}
          disabled={disabled || !canMoveDown}
          aria-label="Move block down"
          title="Move block down"
        >
          <span className="pz-property-editor__action-icon" data-icon="chevron-down" aria-hidden="true" />
          <span className="pz-property-editor__action-label">Move Down</span>
        </button>
      </div>
      <div className="pz-property-editor__actions-row">
        <button
          type="button"
          className="pz-property-editor__action pz-property-editor__action--duplicate"
          onClick={handleDuplicate}
          disabled={disabled}
          aria-label="Duplicate block"
          title="Duplicate block"
        >
          <span className="pz-property-editor__action-icon" data-icon="copy" aria-hidden="true" />
          <span className="pz-property-editor__action-label">Duplicate</span>
        </button>
        <button
          type="button"
          className="pz-property-editor__action pz-property-editor__action--delete"
          onClick={handleDelete}
          disabled={disabled}
          aria-label="Delete block"
          title="Delete block"
        >
          <span className="pz-property-editor__action-icon" data-icon="trash-2" aria-hidden="true" />
          <span className="pz-property-editor__action-label">Delete</span>
        </button>
      </div>
    </div>
  );
}
