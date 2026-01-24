/**
 * FormField Component
 *
 * Renders a form field based on field metadata extracted from Zod schema.
 * Implements PZ-208: Block Property Editor
 */

import type { ReactElement, ChangeEvent } from "react";
import type { FieldError, FieldMeta, FormFieldProps } from "./types";

/**
 * Get errors that match a specific path
 */
function getErrorsForPath(errors: FieldError[], path: string): FieldError[] {
  return errors.filter((error) => error.path === path);
}

/**
 * Renders a text input field
 */
function TextField({
  field,
  value,
  onChange,
  errors,
  disabled,
  path,
}: FormFieldProps): ReactElement {
  const fieldPath = path ? `${path}.${field.key}` : field.key;
  const fieldErrors = getErrorsForPath(errors, fieldPath);
  const hasError = fieldErrors.length > 0;
  const inputId = `pz-field-${fieldPath.replace(/\./g, "-")}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Use textarea for content fields or long text
  const isLongText = field.key === "content" || field.key === "text" || (field.maxLength && field.maxLength > 100);

  return (
    <div className={`pz-form-field pz-form-field--text ${hasError ? "pz-form-field--error" : ""}`}>
      <label htmlFor={inputId} className="pz-form-field__label">
        {field.label}
        {field.required && <span className="pz-form-field__required" aria-hidden="true">*</span>}
      </label>
      {isLongText ? (
        <textarea
          id={inputId}
          className="pz-form-field__input pz-form-field__textarea"
          value={String(value ?? "")}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          rows={4}
        />
      ) : (
        <input
          type="text"
          id={inputId}
          className="pz-form-field__input"
          value={String(value ?? "")}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          minLength={field.minLength}
          maxLength={field.maxLength}
        />
      )}
      {hasError && (
        <div id={`${inputId}-error`} className="pz-form-field__error" role="alert">
          {fieldErrors.map((err) => err.message).join(", ")}
        </div>
      )}
      {field.description && !hasError && (
        <div className="pz-form-field__description">{field.description}</div>
      )}
    </div>
  );
}

/**
 * Renders a number input field
 */
function NumberField({
  field,
  value,
  onChange,
  errors,
  disabled,
  path,
}: FormFieldProps): ReactElement {
  const fieldPath = path ? `${path}.${field.key}` : field.key;
  const fieldErrors = getErrorsForPath(errors, fieldPath);
  const hasError = fieldErrors.length > 0;
  const inputId = `pz-field-${fieldPath.replace(/\./g, "-")}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const numValue = e.target.value === "" ? undefined : Number(e.target.value);
    onChange(numValue);
  };

  return (
    <div className={`pz-form-field pz-form-field--number ${hasError ? "pz-form-field--error" : ""}`}>
      <label htmlFor={inputId} className="pz-form-field__label">
        {field.label}
        {field.required && <span className="pz-form-field__required" aria-hidden="true">*</span>}
      </label>
      <input
        type="number"
        id={inputId}
        className="pz-form-field__input"
        value={value === undefined ? "" : String(value)}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        min={field.min}
        max={field.max}
      />
      {hasError && (
        <div id={`${inputId}-error`} className="pz-form-field__error" role="alert">
          {fieldErrors.map((err) => err.message).join(", ")}
        </div>
      )}
      {field.description && !hasError && (
        <div className="pz-form-field__description">{field.description}</div>
      )}
    </div>
  );
}

/**
 * Renders a boolean checkbox field
 */
function BooleanField({
  field,
  value,
  onChange,
  errors,
  disabled,
  path,
}: FormFieldProps): ReactElement {
  const fieldPath = path ? `${path}.${field.key}` : field.key;
  const fieldErrors = getErrorsForPath(errors, fieldPath);
  const hasError = fieldErrors.length > 0;
  const inputId = `pz-field-${fieldPath.replace(/\./g, "-")}`;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className={`pz-form-field pz-form-field--boolean ${hasError ? "pz-form-field--error" : ""}`}>
      <div className="pz-form-field__checkbox-wrapper">
        <input
          type="checkbox"
          id={inputId}
          className="pz-form-field__checkbox"
          checked={Boolean(value)}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
        />
        <label htmlFor={inputId} className="pz-form-field__checkbox-label">
          {field.label}
        </label>
      </div>
      {hasError && (
        <div id={`${inputId}-error`} className="pz-form-field__error" role="alert">
          {fieldErrors.map((err) => err.message).join(", ")}
        </div>
      )}
      {field.description && !hasError && (
        <div className="pz-form-field__description">{field.description}</div>
      )}
    </div>
  );
}

/**
 * Renders a select dropdown field
 */
function SelectField({
  field,
  value,
  onChange,
  errors,
  disabled,
  path,
}: FormFieldProps): ReactElement {
  const fieldPath = path ? `${path}.${field.key}` : field.key;
  const fieldErrors = getErrorsForPath(errors, fieldPath);
  const hasError = fieldErrors.length > 0;
  const inputId = `pz-field-${fieldPath.replace(/\./g, "-")}`;

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    // Convert numeric strings back to numbers if the original value was a number
    const newValue = e.target.value;
    const numericOptions = field.options?.every((opt) => !Number.isNaN(Number(opt.value)));
    if (numericOptions && newValue !== "") {
      onChange(Number(newValue));
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className={`pz-form-field pz-form-field--select ${hasError ? "pz-form-field--error" : ""}`}>
      <label htmlFor={inputId} className="pz-form-field__label">
        {field.label}
        {field.required && <span className="pz-form-field__required" aria-hidden="true">*</span>}
      </label>
      <select
        id={inputId}
        className="pz-form-field__select"
        value={String(value ?? "")}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
      >
        {field.optional && (
          <option value="">Select...</option>
        )}
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError && (
        <div id={`${inputId}-error`} className="pz-form-field__error" role="alert">
          {fieldErrors.map((err) => err.message).join(", ")}
        </div>
      )}
      {field.description && !hasError && (
        <div className="pz-form-field__description">{field.description}</div>
      )}
    </div>
  );
}

/**
 * Renders an array field with add/remove capabilities
 */
function ArrayField({
  field,
  value,
  onChange,
  errors,
  disabled,
  path,
}: FormFieldProps): ReactElement {
  const fieldPath = path ? `${path}.${field.key}` : field.key;
  const fieldErrors = getErrorsForPath(errors, fieldPath);
  const hasError = fieldErrors.length > 0;
  const inputId = `pz-field-${fieldPath.replace(/\./g, "-")}`;

  const arrayValue = Array.isArray(value) ? value : [];

  const handleItemChange = (index: number, newItemValue: unknown) => {
    const newArray = [...arrayValue];
    newArray[index] = newItemValue;
    onChange(newArray);
  };

  const handleAddItem = () => {
    const defaultItem = field.itemSchema?.defaultValue ?? "";
    onChange([...arrayValue, defaultItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newArray = arrayValue.filter((_, i) => i !== index);
    onChange(newArray);
  };

  return (
    <div className={`pz-form-field pz-form-field--array ${hasError ? "pz-form-field--error" : ""}`}>
      <label className="pz-form-field__label">
        {field.label}
        {field.required && <span className="pz-form-field__required" aria-hidden="true">*</span>}
      </label>
      <div className="pz-form-field__array-items">
        {arrayValue.map((item, index) => (
          <div key={index} className="pz-form-field__array-item">
            {field.itemSchema ? (
              <FormField
                field={{ ...field.itemSchema, key: String(index), label: `Item ${index + 1}` }}
                value={item}
                onChange={(newValue) => handleItemChange(index, newValue)}
                errors={errors}
                disabled={disabled}
                path={fieldPath}
              />
            ) : (
              <input
                type="text"
                className="pz-form-field__input"
                value={String(item ?? "")}
                onChange={(e) => handleItemChange(index, e.target.value)}
                disabled={disabled}
              />
            )}
            <button
              type="button"
              className="pz-form-field__array-remove"
              onClick={() => handleRemoveItem(index)}
              disabled={disabled}
              aria-label={`Remove item ${index + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="pz-form-field__array-add"
        onClick={handleAddItem}
        disabled={disabled}
      >
        Add Item
      </button>
      {hasError && (
        <div id={`${inputId}-error`} className="pz-form-field__error" role="alert">
          {fieldErrors.map((err) => err.message).join(", ")}
        </div>
      )}
      {field.description && !hasError && (
        <div className="pz-form-field__description">{field.description}</div>
      )}
    </div>
  );
}

/**
 * Renders a nested object field
 */
function ObjectField({
  field,
  value,
  onChange,
  errors,
  disabled,
  path,
}: FormFieldProps): ReactElement {
  const fieldPath = path ? `${path}.${field.key}` : field.key;
  const objectValue = (value && typeof value === "object" && !Array.isArray(value))
    ? value as Record<string, unknown>
    : {};

  const handleNestedChange = (nestedKey: string, newValue: unknown) => {
    onChange({
      ...objectValue,
      [nestedKey]: newValue,
    });
  };

  return (
    <div className="pz-form-field pz-form-field--object">
      <fieldset className="pz-form-field__fieldset">
        <legend className="pz-form-field__legend">{field.label}</legend>
        {field.nested?.map((nestedField) => (
          <FormField
            key={nestedField.key}
            field={nestedField}
            value={objectValue[nestedField.key]}
            onChange={(newValue) => handleNestedChange(nestedField.key, newValue)}
            errors={errors}
            disabled={disabled}
            path={fieldPath}
          />
        ))}
      </fieldset>
      {field.description && (
        <div className="pz-form-field__description">{field.description}</div>
      )}
    </div>
  );
}

/**
 * Renders an unknown/unsupported field type
 */
function UnknownField({ field, path }: FormFieldProps): ReactElement {
  const fieldPath = path ? `${path}.${field.key}` : field.key;
  return (
    <div className="pz-form-field pz-form-field--unknown">
      <label className="pz-form-field__label">{field.label}</label>
      <div className="pz-form-field__unsupported">
        Unsupported field type for "{fieldPath}"
      </div>
    </div>
  );
}

/**
 * Main FormField component that delegates to specific field types
 */
export function FormField(props: FormFieldProps): ReactElement {
  const { field } = props;

  switch (field.type) {
    case "text":
      return <TextField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "boolean":
      return <BooleanField {...props} />;
    case "select":
      return <SelectField {...props} />;
    case "array":
      return <ArrayField {...props} />;
    case "object":
      return <ObjectField {...props} />;
    default:
      return <UnknownField {...props} />;
  }
}
