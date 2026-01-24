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

// Property Editor (PZ-208)
export {
  // Components
  PropertyEditor,
  FormField,
  ActionButtons,
  // Types
  type ActionButtonsProps,
  type FieldError,
  type FieldMeta,
  type FieldType,
  type FormFieldProps,
  type PropertyEditorProps,
  type PropertyEditorState,
  type SchemaParseResult,
  type SelectOption,
  type ValidationResult,
  // State
  $selectedBlock as $propertyEditorSelectedBlock,
  $blockDefinition,
  $fieldMeta,
  $showPropertyEditor,
  $canMoveUp,
  $canMoveDown,
  $validationErrors,
  $hasErrors,
  $propertyEditorState,
  getFieldErrors,
  hasFieldError,
  setErrors,
  clearErrors,
  markTouched,
  resetPropertyEditorState,
  // Schema utilities
  parseSchema,
  validateProps,
  keyToLabel,
} from "./property-editor";
