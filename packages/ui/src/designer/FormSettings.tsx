/**
 * Form Settings Panel (PZ-104)
 *
 * A panel to configure global form settings.
 * Features:
 * - Form title
 * - Form description
 * - Submit button text
 * - Success message
 * - Redirect URL (with validation)
 * - Notification email (with validation)
 * - Form status (active/inactive)
 */

import {
  type ReactNode,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Form status indicating whether the form is active or inactive.
 */
export type FormStatus = "active" | "inactive";

/**
 * Data structure for form settings.
 */
export interface FormSettingsData {
  /** Form title displayed to users */
  title: string;
  /** Form description (optional) */
  description: string;
  /** Text shown on the submit button */
  submitButtonText: string;
  /** Message shown after successful submission */
  successMessage: string;
  /** URL to redirect to after submission (optional) */
  redirectUrl: string;
  /** Email to send notifications to (optional) */
  notificationEmail: string;
  /** Whether the form is active or inactive */
  status: FormStatus;
}

/**
 * Event emitted when a form setting changes.
 */
export interface FormSettingsChangeEvent {
  /** The setting that changed */
  setting: keyof FormSettingsData;
  /** The new value */
  value: string | FormStatus;
}

/**
 * Validation error for a specific setting.
 */
export interface FormSettingsValidationError {
  /** The setting with the error */
  setting: keyof FormSettingsData;
  /** Error message */
  message: string;
}

// -----------------------------------------------------------------------------
// Validation Functions
// -----------------------------------------------------------------------------

/**
 * Validates an email address format.
 * Returns null if valid, or an error message if invalid.
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    // Empty email is valid (field is optional)
    return null;
  }

  // Basic email regex pattern
  // Matches: local@domain.tld
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return "Please enter a valid email address";
  }

  return null;
}

/**
 * Validates a URL format.
 * Returns null if valid, or an error message if invalid.
 */
export function validateUrl(url: string): string | null {
  if (!url) {
    // Empty URL is valid (field is optional)
    return null;
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
    return null;
  } catch {
    return "Please enter a valid URL";
  }
}

/**
 * Validates all form settings and returns any errors.
 */
export function validateFormSettings(
  settings: FormSettingsData
): FormSettingsValidationError[] {
  const errors: FormSettingsValidationError[] = [];

  // Title is required
  if (!settings.title.trim()) {
    errors.push({
      setting: "title",
      message: "Form title is required",
    });
  }

  // Submit button text is required
  if (!settings.submitButtonText.trim()) {
    errors.push({
      setting: "submitButtonText",
      message: "Submit button text is required",
    });
  }

  // Validate email if provided
  const emailError = validateEmail(settings.notificationEmail);
  if (emailError) {
    errors.push({
      setting: "notificationEmail",
      message: emailError,
    });
  }

  // Validate URL if provided
  const urlError = validateUrl(settings.redirectUrl);
  if (urlError) {
    errors.push({
      setting: "redirectUrl",
      message: urlError,
    });
  }

  return errors;
}

// -----------------------------------------------------------------------------
// Default Values
// -----------------------------------------------------------------------------

/**
 * Creates default form settings.
 */
export function createDefaultFormSettings(): FormSettingsData {
  return {
    title: "Untitled Form",
    description: "",
    submitButtonText: "Submit",
    successMessage: "Thank you for your submission!",
    redirectUrl: "",
    notificationEmail: "",
    status: "active",
  };
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface FormSettingsContextValue {
  /** Current form settings */
  settings: FormSettingsData;
  /** Validation errors */
  errors: FormSettingsValidationError[];
  /** Update a setting */
  onChange: (event: FormSettingsChangeEvent) => void;
  /** Get error for a specific setting */
  getError: (setting: keyof FormSettingsData) => string | undefined;
  /** Check if a setting has an error */
  hasError: (setting: keyof FormSettingsData) => boolean;
}

const FormSettingsContext = createContext<FormSettingsContextValue | null>(null);

/**
 * Hook to access the FormSettings context.
 * Must be used within a FormSettings component.
 */
export function useFormSettings(): FormSettingsContextValue {
  const context = useContext(FormSettingsContext);
  if (!context) {
    throw new Error("useFormSettings must be used within a FormSettings component");
  }
  return context;
}

// -----------------------------------------------------------------------------
// Field Components
// -----------------------------------------------------------------------------

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  multiline?: boolean;
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  helpText,
  multiline,
}: TextFieldProps) {
  const inputId = `form-setting-${id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  const describedBy = [
    error ? errorId : null,
    helpText ? helpId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div data-testid={`setting-field-${id}`}>
      <label htmlFor={inputId} data-testid={`setting-label-${id}`}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <InputComponent
        id={inputId}
        type={multiline ? undefined : "text"}
        data-testid={`setting-input-${id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        rows={multiline ? 3 : undefined}
      />
      {helpText && (
        <p id={helpId} data-testid={`setting-help-${id}`}>
          {helpText}
        </p>
      )}
      {error && (
        <p id={errorId} data-testid={`setting-error-${id}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface StatusToggleProps {
  value: FormStatus;
  onChange: (value: FormStatus) => void;
}

function StatusToggle({ value, onChange }: StatusToggleProps) {
  return (
    <div data-testid="setting-field-status">
      <fieldset>
        <legend data-testid="setting-label-status">Form Status</legend>
        <div data-testid="status-options">
          <label htmlFor="status-active" data-testid="status-option-active">
            <input
              id="status-active"
              type="radio"
              name="form-status"
              data-testid="setting-input-status-active"
              value="active"
              checked={value === "active"}
              onChange={() => onChange("active")}
              aria-describedby="status-active-desc"
            />
            Active
          </label>
          <span id="status-active-desc" data-testid="status-active-description">
            Form accepts submissions
          </span>

          <label htmlFor="status-inactive" data-testid="status-option-inactive">
            <input
              id="status-inactive"
              type="radio"
              name="form-status"
              data-testid="setting-input-status-inactive"
              value="inactive"
              checked={value === "inactive"}
              onChange={() => onChange("inactive")}
              aria-describedby="status-inactive-desc"
            />
            Inactive
          </label>
          <span id="status-inactive-desc" data-testid="status-inactive-description">
            Form is closed for submissions
          </span>
        </div>
      </fieldset>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section Components
// -----------------------------------------------------------------------------

interface BasicInfoSectionProps {
  settings: FormSettingsData;
  onChange: (event: FormSettingsChangeEvent) => void;
  getError: (setting: keyof FormSettingsData) => string | undefined;
}

function BasicInfoSection({ settings, onChange, getError }: BasicInfoSectionProps) {
  return (
    <section
      data-testid="basic-info-section"
      role="region"
      aria-label="Basic Information"
    >
      <h3 data-testid="section-title-basic">Basic Information</h3>

      <TextField
        id="title"
        label="Form Title"
        value={settings.title}
        onChange={(value) => onChange({ setting: "title", value })}
        placeholder="Enter form title"
        required
        error={getError("title")}
      />

      <TextField
        id="description"
        label="Description"
        value={settings.description}
        onChange={(value) => onChange({ setting: "description", value })}
        placeholder="Describe your form (optional)"
        multiline
        helpText="This description will be shown to users above the form"
      />
    </section>
  );
}

interface SubmissionSectionProps {
  settings: FormSettingsData;
  onChange: (event: FormSettingsChangeEvent) => void;
  getError: (setting: keyof FormSettingsData) => string | undefined;
}

function SubmissionSection({ settings, onChange, getError }: SubmissionSectionProps) {
  return (
    <section
      data-testid="submission-section"
      role="region"
      aria-label="Submission Settings"
    >
      <h3 data-testid="section-title-submission">Submission Settings</h3>

      <TextField
        id="submitButtonText"
        label="Submit Button Text"
        value={settings.submitButtonText}
        onChange={(value) => onChange({ setting: "submitButtonText", value })}
        placeholder="Submit"
        required
        error={getError("submitButtonText")}
      />

      <TextField
        id="successMessage"
        label="Success Message"
        value={settings.successMessage}
        onChange={(value) => onChange({ setting: "successMessage", value })}
        placeholder="Thank you for your submission!"
        multiline
        helpText="Message displayed after successful form submission"
      />

      <TextField
        id="redirectUrl"
        label="Redirect URL"
        value={settings.redirectUrl}
        onChange={(value) => onChange({ setting: "redirectUrl", value })}
        placeholder="https://example.com/thank-you"
        error={getError("redirectUrl")}
        helpText="Optional URL to redirect users after submission"
      />
    </section>
  );
}

interface NotificationSectionProps {
  settings: FormSettingsData;
  onChange: (event: FormSettingsChangeEvent) => void;
  getError: (setting: keyof FormSettingsData) => string | undefined;
}

function NotificationSection({ settings, onChange, getError }: NotificationSectionProps) {
  return (
    <section
      data-testid="notification-section"
      role="region"
      aria-label="Notification Settings"
    >
      <h3 data-testid="section-title-notification">Notifications</h3>

      <TextField
        id="notificationEmail"
        label="Notification Email"
        value={settings.notificationEmail}
        onChange={(value) => onChange({ setting: "notificationEmail", value })}
        placeholder="notifications@example.com"
        error={getError("notificationEmail")}
        helpText="Email address to receive submission notifications"
      />
    </section>
  );
}

interface StatusSectionProps {
  settings: FormSettingsData;
  onChange: (event: FormSettingsChangeEvent) => void;
}

function StatusSection({ settings, onChange }: StatusSectionProps) {
  return (
    <section
      data-testid="status-section"
      role="region"
      aria-label="Form Status"
    >
      <h3 data-testid="section-title-status">Form Status</h3>

      <StatusToggle
        value={settings.status}
        onChange={(value) => onChange({ setting: "status", value })}
      />
    </section>
  );
}

// -----------------------------------------------------------------------------
// Icons
// -----------------------------------------------------------------------------

function SettingsIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="6" />
      <path d="M41 24c0-1.5-.5-3-1.5-4l2.5-4.5-3-3-4.5 2.5c-1-.5-2-1-3.5-1V8h-4v6c-1.5 0-2.5.5-3.5 1L19 12.5l-3 3 2.5 4.5c-1 1-1.5 2.5-1.5 4H11v4h6c0 1.5.5 3 1.5 4l-2.5 4.5 3 3 4.5-2.5c1 .5 2 1 3.5 1v6h4v-6c1.5 0 2.5-.5 3.5-1l4.5 2.5 3-3-2.5-4.5c1-1 1.5-2.5 1.5-4h6v-4h-6z" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// FormSettings Component
// -----------------------------------------------------------------------------

export interface FormSettingsProps {
  /** Current form settings */
  settings: FormSettingsData;
  /** Callback when a setting changes */
  onChange?: (event: FormSettingsChangeEvent) => void;
  /** Whether to validate on change */
  validateOnChange?: boolean;
  /** Additional class name */
  className?: string;
  /** Children to render (e.g., custom header) */
  children?: ReactNode;
}

/**
 * FormSettings is a panel for configuring global form settings.
 *
 * Features:
 * - Form title and description
 * - Submit button text customization
 * - Success message configuration
 * - Redirect URL with validation
 * - Notification email with validation
 * - Form status toggle (active/inactive)
 */
export function FormSettings({
  settings,
  onChange,
  validateOnChange = true,
  className,
  children,
}: FormSettingsProps) {
  // Track validation errors
  const [errors, setErrors] = useState<FormSettingsValidationError[]>([]);

  // Handle setting change
  const handleChange = useCallback(
    (event: FormSettingsChangeEvent) => {
      // Validate if enabled
      if (validateOnChange) {
        let fieldError: string | null = null;

        if (event.setting === "notificationEmail") {
          fieldError = validateEmail(event.value as string);
        } else if (event.setting === "redirectUrl") {
          fieldError = validateUrl(event.value as string);
        } else if (event.setting === "title" && !(event.value as string).trim()) {
          fieldError = "Form title is required";
        } else if (event.setting === "submitButtonText" && !(event.value as string).trim()) {
          fieldError = "Submit button text is required";
        }

        // Update errors for this field
        setErrors((prev) => {
          const filtered = prev.filter((e) => e.setting !== event.setting);
          if (fieldError) {
            return [...filtered, { setting: event.setting, message: fieldError }];
          }
          return filtered;
        });
      }

      // Notify parent
      onChange?.(event);
    },
    [onChange, validateOnChange]
  );

  // Get error for a specific setting
  const getError = useCallback(
    (setting: keyof FormSettingsData): string | undefined => {
      return errors.find((e) => e.setting === setting)?.message;
    },
    [errors]
  );

  // Check if a setting has an error
  const hasError = useCallback(
    (setting: keyof FormSettingsData): boolean => {
      return errors.some((e) => e.setting === setting);
    },
    [errors]
  );

  // Context value
  const contextValue = useMemo<FormSettingsContextValue>(
    () => ({
      settings,
      errors,
      onChange: handleChange,
      getError,
      hasError,
    }),
    [settings, errors, handleChange, getError, hasError]
  );

  return (
    <FormSettingsContext.Provider value={contextValue}>
      <aside
        data-testid="form-settings"
        className={className}
        role="complementary"
        aria-label="Form settings"
      >
        {children && (
          <div data-testid="form-settings-header">{children}</div>
        )}

        <div data-testid="form-settings-content">
          {/* Basic Information Section */}
          <BasicInfoSection
            settings={settings}
            onChange={handleChange}
            getError={getError}
          />

          {/* Submission Settings Section */}
          <SubmissionSection
            settings={settings}
            onChange={handleChange}
            getError={getError}
          />

          {/* Notification Section */}
          <NotificationSection
            settings={settings}
            onChange={handleChange}
            getError={getError}
          />

          {/* Status Section */}
          <StatusSection
            settings={settings}
            onChange={handleChange}
          />
        </div>
      </aside>
    </FormSettingsContext.Provider>
  );
}

// Export sub-components for flexibility
FormSettings.BasicInfoSection = BasicInfoSection;
FormSettings.SubmissionSection = SubmissionSection;
FormSettings.NotificationSection = NotificationSection;
FormSettings.StatusSection = StatusSection;
FormSettings.TextField = TextField;
FormSettings.StatusToggle = StatusToggle;
FormSettings.SettingsIcon = SettingsIcon;
