/**
 * SearchInput Component
 *
 * Search input for filtering blocks in the sidebar.
 * Implements PZ-206: Block Sidebar
 */

import type { ReactElement } from "react";
import { useCallback, useRef } from "react";
import type { SearchInputProps } from "./types";

/**
 * Renders a search input with clear button
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search blocks...",
  className = "",
}: SearchInputProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (value) {
          e.preventDefault();
          e.stopPropagation();
          onChange("");
        }
      }
    },
    [value, onChange]
  );

  return (
    <div className={`pz-search-input ${className}`}>
      <span className="pz-search-input__icon" aria-hidden="true">
        {/* Search icon */}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pz-search-input__field"
        aria-label="Search blocks"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="pz-search-input__clear"
          aria-label="Clear search"
        >
          {/* Clear icon */}
        </button>
      )}
    </div>
  );
}
