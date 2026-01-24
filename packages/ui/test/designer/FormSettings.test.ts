/**
 * FormSettings Tests (PZ-104)
 *
 * Note: These tests are limited since we use node environment.
 * Full component testing would require jsdom environment and @testing-library/react.
 * These tests verify types, exports, validation functions, and basic functionality.
 */

import { describe, expect, it } from "vitest";
import {
  FormSettings,
  useFormSettings,
  createDefaultFormSettings,
  validateEmail,
  validateUrl,
  validateFormSettings,
} from "../../src/designer";
import type {
  FormSettingsProps,
  FormSettingsData,
  FormSettingsChangeEvent,
  FormSettingsValidationError,
  FormStatus,
} from "../../src/designer";

describe("FormSettings", () => {
  describe("exports", () => {
    it("FormSettings is exported as a function", () => {
      expect(typeof FormSettings).toBe("function");
    });

    it("useFormSettings is exported as a function", () => {
      expect(typeof useFormSettings).toBe("function");
    });

    it("createDefaultFormSettings is exported as a function", () => {
      expect(typeof createDefaultFormSettings).toBe("function");
    });

    it("validateEmail is exported as a function", () => {
      expect(typeof validateEmail).toBe("function");
    });

    it("validateUrl is exported as a function", () => {
      expect(typeof validateUrl).toBe("function");
    });

    it("validateFormSettings is exported as a function", () => {
      expect(typeof validateFormSettings).toBe("function");
    });
  });

  describe("FormSettings component", () => {
    it("is a valid React component function", () => {
      expect(FormSettings.length).toBeGreaterThanOrEqual(0);
    });

    it("has sub-components attached", () => {
      expect(FormSettings.BasicInfoSection).toBeDefined();
      expect(FormSettings.SubmissionSection).toBeDefined();
      expect(FormSettings.NotificationSection).toBeDefined();
      expect(FormSettings.StatusSection).toBeDefined();
      expect(FormSettings.TextField).toBeDefined();
      expect(FormSettings.StatusToggle).toBeDefined();
      expect(FormSettings.SettingsIcon).toBeDefined();
    });
  });

  describe("useFormSettings hook", () => {
    it("is exported as a function", () => {
      // Note: We cannot test the actual hook behavior in node environment
      // since React hooks require a React component context.
      expect(typeof useFormSettings).toBe("function");
    });
  });
});

describe("FormSettings Type Tests", () => {
  it("FormSettingsProps interface is correct", () => {
    const settings = createDefaultFormSettings();
    const props: FormSettingsProps = {
      settings,
      onChange: (event: FormSettingsChangeEvent) => {
        void event;
      },
      validateOnChange: true,
      className: "test-class",
      children: null,
    };

    expect(props.settings).toBeDefined();
    expect(typeof props.onChange).toBe("function");
    expect(props.validateOnChange).toBe(true);
    expect(props.className).toBe("test-class");
  });

  it("FormSettingsProps supports minimal configuration", () => {
    const settings = createDefaultFormSettings();
    const props: FormSettingsProps = {
      settings,
    };

    expect(props.settings).toBeDefined();
    expect(props.onChange).toBeUndefined();
  });

  it("FormSettingsData type has correct structure", () => {
    const settings: FormSettingsData = {
      title: "Test Form",
      description: "A test form description",
      submitButtonText: "Submit",
      successMessage: "Thank you!",
      redirectUrl: "https://example.com",
      notificationEmail: "test@example.com",
      status: "active",
    };

    expect(settings.title).toBe("Test Form");
    expect(settings.description).toBe("A test form description");
    expect(settings.submitButtonText).toBe("Submit");
    expect(settings.successMessage).toBe("Thank you!");
    expect(settings.redirectUrl).toBe("https://example.com");
    expect(settings.notificationEmail).toBe("test@example.com");
    expect(settings.status).toBe("active");
  });

  it("FormSettingsData supports empty optional fields", () => {
    const settings: FormSettingsData = {
      title: "Test Form",
      description: "",
      submitButtonText: "Submit",
      successMessage: "",
      redirectUrl: "",
      notificationEmail: "",
      status: "active",
    };

    expect(settings.description).toBe("");
    expect(settings.redirectUrl).toBe("");
    expect(settings.notificationEmail).toBe("");
  });

  it("FormSettingsChangeEvent type has correct structure", () => {
    const event: FormSettingsChangeEvent = {
      setting: "title",
      value: "New Title",
    };

    expect(event.setting).toBe("title");
    expect(event.value).toBe("New Title");
  });

  it("FormSettingsChangeEvent supports status value", () => {
    const event: FormSettingsChangeEvent = {
      setting: "status",
      value: "inactive",
    };

    expect(event.setting).toBe("status");
    expect(event.value).toBe("inactive");
  });

  it("FormSettingsValidationError type has correct structure", () => {
    const error: FormSettingsValidationError = {
      setting: "notificationEmail",
      message: "Please enter a valid email address",
    };

    expect(error.setting).toBe("notificationEmail");
    expect(error.message).toBe("Please enter a valid email address");
  });

  it("FormStatus type accepts valid values", () => {
    const active: FormStatus = "active";
    const inactive: FormStatus = "inactive";

    expect(active).toBe("active");
    expect(inactive).toBe("inactive");
  });
});

describe("createDefaultFormSettings", () => {
  it("returns default settings with expected values", () => {
    const settings = createDefaultFormSettings();

    expect(settings.title).toBe("Untitled Form");
    expect(settings.description).toBe("");
    expect(settings.submitButtonText).toBe("Submit");
    expect(settings.successMessage).toBe("Thank you for your submission!");
    expect(settings.redirectUrl).toBe("");
    expect(settings.notificationEmail).toBe("");
    expect(settings.status).toBe("active");
  });

  it("returns a new object each time", () => {
    const settings1 = createDefaultFormSettings();
    const settings2 = createDefaultFormSettings();

    expect(settings1).not.toBe(settings2);
    expect(settings1).toEqual(settings2);
  });
});

describe("validateEmail", () => {
  it("returns null for empty string", () => {
    expect(validateEmail("")).toBeNull();
  });

  it("returns null for valid email addresses", () => {
    expect(validateEmail("test@example.com")).toBeNull();
    expect(validateEmail("user.name@domain.org")).toBeNull();
    expect(validateEmail("user+tag@example.co.uk")).toBeNull();
    expect(validateEmail("a@b.co")).toBeNull();
  });

  it("returns error for invalid email addresses", () => {
    expect(validateEmail("invalid")).toBe("Please enter a valid email address");
    expect(validateEmail("@example.com")).toBe("Please enter a valid email address");
    expect(validateEmail("test@")).toBe("Please enter a valid email address");
    expect(validateEmail("test@example")).toBe("Please enter a valid email address");
    expect(validateEmail("test @example.com")).toBe("Please enter a valid email address");
    expect(validateEmail("test@exam ple.com")).toBe("Please enter a valid email address");
  });

  it("returns error for email without @", () => {
    expect(validateEmail("testexample.com")).toBe("Please enter a valid email address");
  });

  it("returns error for email without domain", () => {
    expect(validateEmail("test@.com")).toBe("Please enter a valid email address");
  });

  it("returns error for email without TLD", () => {
    expect(validateEmail("test@example")).toBe("Please enter a valid email address");
  });
});

describe("validateUrl", () => {
  it("returns null for empty string", () => {
    expect(validateUrl("")).toBeNull();
  });

  it("returns null for valid http URLs", () => {
    expect(validateUrl("http://example.com")).toBeNull();
    expect(validateUrl("http://example.com/path")).toBeNull();
    expect(validateUrl("http://example.com/path?query=value")).toBeNull();
    expect(validateUrl("http://sub.example.com")).toBeNull();
  });

  it("returns null for valid https URLs", () => {
    expect(validateUrl("https://example.com")).toBeNull();
    expect(validateUrl("https://example.com/path")).toBeNull();
    expect(validateUrl("https://example.com/path?query=value")).toBeNull();
    expect(validateUrl("https://example.com:8080")).toBeNull();
    expect(validateUrl("https://example.com/path#anchor")).toBeNull();
  });

  it("returns error for invalid URLs", () => {
    expect(validateUrl("invalid")).toBe("Please enter a valid URL");
    expect(validateUrl("example.com")).toBe("Please enter a valid URL");
    expect(validateUrl("www.example.com")).toBe("Please enter a valid URL");
    expect(validateUrl("://example.com")).toBe("Please enter a valid URL");
  });

  it("returns error for non-http/https protocols", () => {
    expect(validateUrl("ftp://example.com")).toBe("URL must start with http:// or https://");
    expect(validateUrl("mailto:test@example.com")).toBe("URL must start with http:// or https://");
    expect(validateUrl("javascript:alert(1)")).toBe("URL must start with http:// or https://");
    expect(validateUrl("file:///path/to/file")).toBe("URL must start with http:// or https://");
  });

  it("handles URLs with special characters", () => {
    expect(validateUrl("https://example.com/path%20with%20spaces")).toBeNull();
    expect(validateUrl("https://example.com/path?q=hello+world")).toBeNull();
  });
});

describe("validateFormSettings", () => {
  it("returns empty array for valid settings", () => {
    const settings: FormSettingsData = {
      title: "Valid Form",
      description: "A description",
      submitButtonText: "Submit",
      successMessage: "Thank you!",
      redirectUrl: "https://example.com",
      notificationEmail: "test@example.com",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors).toEqual([]);
  });

  it("returns empty array for valid settings with empty optional fields", () => {
    const settings: FormSettingsData = {
      title: "Valid Form",
      description: "",
      submitButtonText: "Submit",
      successMessage: "",
      redirectUrl: "",
      notificationEmail: "",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors).toEqual([]);
  });

  it("returns error for empty title", () => {
    const settings: FormSettingsData = {
      title: "",
      description: "",
      submitButtonText: "Submit",
      successMessage: "",
      redirectUrl: "",
      notificationEmail: "",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors).toContainEqual({
      setting: "title",
      message: "Form title is required",
    });
  });

  it("returns error for whitespace-only title", () => {
    const settings: FormSettingsData = {
      title: "   ",
      description: "",
      submitButtonText: "Submit",
      successMessage: "",
      redirectUrl: "",
      notificationEmail: "",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors).toContainEqual({
      setting: "title",
      message: "Form title is required",
    });
  });

  it("returns error for empty submit button text", () => {
    const settings: FormSettingsData = {
      title: "Valid Form",
      description: "",
      submitButtonText: "",
      successMessage: "",
      redirectUrl: "",
      notificationEmail: "",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors).toContainEqual({
      setting: "submitButtonText",
      message: "Submit button text is required",
    });
  });

  it("returns error for invalid email", () => {
    const settings: FormSettingsData = {
      title: "Valid Form",
      description: "",
      submitButtonText: "Submit",
      successMessage: "",
      redirectUrl: "",
      notificationEmail: "invalid-email",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors).toContainEqual({
      setting: "notificationEmail",
      message: "Please enter a valid email address",
    });
  });

  it("returns error for invalid URL", () => {
    const settings: FormSettingsData = {
      title: "Valid Form",
      description: "",
      submitButtonText: "Submit",
      successMessage: "",
      redirectUrl: "invalid-url",
      notificationEmail: "",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors).toContainEqual({
      setting: "redirectUrl",
      message: "Please enter a valid URL",
    });
  });

  it("returns multiple errors when multiple fields are invalid", () => {
    const settings: FormSettingsData = {
      title: "",
      description: "",
      submitButtonText: "",
      successMessage: "",
      redirectUrl: "invalid",
      notificationEmail: "invalid",
      status: "active",
    };

    const errors = validateFormSettings(settings);
    expect(errors.length).toBe(4);
    expect(errors.map((e) => e.setting)).toContain("title");
    expect(errors.map((e) => e.setting)).toContain("submitButtonText");
    expect(errors.map((e) => e.setting)).toContain("notificationEmail");
    expect(errors.map((e) => e.setting)).toContain("redirectUrl");
  });
});

describe("FormSettings Event Handling Scenarios", () => {
  describe("Setting change events", () => {
    it("captures title changes correctly", () => {
      let capturedEvent: FormSettingsChangeEvent | null = null;

      const props: FormSettingsProps = {
        settings: createDefaultFormSettings(),
        onChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FormSettingsChangeEvent = {
        setting: "title",
        value: "Updated Title",
      };

      props.onChange?.(testEvent);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.setting).toBe("title");
      expect(capturedEvent?.value).toBe("Updated Title");
    });

    it("captures description changes correctly", () => {
      let capturedEvent: FormSettingsChangeEvent | null = null;

      const props: FormSettingsProps = {
        settings: createDefaultFormSettings(),
        onChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FormSettingsChangeEvent = {
        setting: "description",
        value: "New description for the form",
      };

      props.onChange?.(testEvent);

      expect(capturedEvent?.setting).toBe("description");
      expect(capturedEvent?.value).toBe("New description for the form");
    });

    it("captures submitButtonText changes correctly", () => {
      let capturedEvent: FormSettingsChangeEvent | null = null;

      const props: FormSettingsProps = {
        settings: createDefaultFormSettings(),
        onChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FormSettingsChangeEvent = {
        setting: "submitButtonText",
        value: "Send Form",
      };

      props.onChange?.(testEvent);

      expect(capturedEvent?.setting).toBe("submitButtonText");
      expect(capturedEvent?.value).toBe("Send Form");
    });

    it("captures successMessage changes correctly", () => {
      let capturedEvent: FormSettingsChangeEvent | null = null;

      const props: FormSettingsProps = {
        settings: createDefaultFormSettings(),
        onChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FormSettingsChangeEvent = {
        setting: "successMessage",
        value: "Your submission has been received!",
      };

      props.onChange?.(testEvent);

      expect(capturedEvent?.setting).toBe("successMessage");
      expect(capturedEvent?.value).toBe("Your submission has been received!");
    });

    it("captures redirectUrl changes correctly", () => {
      let capturedEvent: FormSettingsChangeEvent | null = null;

      const props: FormSettingsProps = {
        settings: createDefaultFormSettings(),
        onChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FormSettingsChangeEvent = {
        setting: "redirectUrl",
        value: "https://example.com/thank-you",
      };

      props.onChange?.(testEvent);

      expect(capturedEvent?.setting).toBe("redirectUrl");
      expect(capturedEvent?.value).toBe("https://example.com/thank-you");
    });

    it("captures notificationEmail changes correctly", () => {
      let capturedEvent: FormSettingsChangeEvent | null = null;

      const props: FormSettingsProps = {
        settings: createDefaultFormSettings(),
        onChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FormSettingsChangeEvent = {
        setting: "notificationEmail",
        value: "admin@example.com",
      };

      props.onChange?.(testEvent);

      expect(capturedEvent?.setting).toBe("notificationEmail");
      expect(capturedEvent?.value).toBe("admin@example.com");
    });

    it("captures status changes correctly", () => {
      let capturedEvent: FormSettingsChangeEvent | null = null;

      const props: FormSettingsProps = {
        settings: createDefaultFormSettings(),
        onChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FormSettingsChangeEvent = {
        setting: "status",
        value: "inactive",
      };

      props.onChange?.(testEvent);

      expect(capturedEvent?.setting).toBe("status");
      expect(capturedEvent?.value).toBe("inactive");
    });
  });
});

describe("FormSettings Edge Cases", () => {
  it("handles settings with very long values", () => {
    const longText = "a".repeat(10000);
    const settings: FormSettingsData = {
      title: longText,
      description: longText,
      submitButtonText: longText,
      successMessage: longText,
      redirectUrl: "",
      notificationEmail: "",
      status: "active",
    };

    // Should not throw
    expect(settings.title.length).toBe(10000);
    expect(settings.description.length).toBe(10000);
  });

  it("handles settings with unicode characters", () => {
    const settings: FormSettingsData = {
      title: "Form Title",
      description: "Description with special chars",
      submitButtonText: "Submit",
      successMessage: "Thank you!",
      redirectUrl: "",
      notificationEmail: "",
      status: "active",
    };

    // Should not throw
    expect(settings.title).toBeTruthy();
  });

  it("handles email validation with various edge cases", () => {
    // Valid edge cases
    expect(validateEmail("a@b.co")).toBeNull();
    expect(validateEmail("test.name+tag@sub.domain.co.uk")).toBeNull();

    // Invalid edge cases
    expect(validateEmail("test@")).toBe("Please enter a valid email address");
    expect(validateEmail("@test.com")).toBe("Please enter a valid email address");
    expect(validateEmail("test@.com")).toBe("Please enter a valid email address");
  });

  it("handles URL validation with various edge cases", () => {
    // Valid edge cases
    expect(validateUrl("https://localhost")).toBeNull();
    expect(validateUrl("http://127.0.0.1")).toBeNull();
    expect(validateUrl("https://example.com:8080/path")).toBeNull();

    // Invalid edge cases - "htp:" parses as a valid URL with wrong protocol
    expect(validateUrl("htp://example.com")).toBe("URL must start with http:// or https://");
    expect(validateUrl("//example.com")).toBe("Please enter a valid URL");
  });

  it("handles status toggle between active and inactive", () => {
    const settings = createDefaultFormSettings();
    expect(settings.status).toBe("active");

    const inactiveSettings: FormSettingsData = {
      ...settings,
      status: "inactive",
    };
    expect(inactiveSettings.status).toBe("inactive");
  });
});

describe("FormSettings Integration", () => {
  it("can create settings, validate, and modify them", () => {
    // Create default settings
    const settings = createDefaultFormSettings();
    expect(settings.title).toBe("Untitled Form");

    // Validate initial settings
    const initialErrors = validateFormSettings(settings);
    expect(initialErrors).toEqual([]);

    // Modify settings
    const modifiedSettings: FormSettingsData = {
      ...settings,
      title: "Contact Form",
      description: "Get in touch with us",
      submitButtonText: "Send Message",
      successMessage: "We will respond within 24 hours",
      redirectUrl: "https://example.com/thank-you",
      notificationEmail: "contact@example.com",
      status: "active",
    };

    // Validate modified settings
    const modifiedErrors = validateFormSettings(modifiedSettings);
    expect(modifiedErrors).toEqual([]);
  });

  it("can detect and report validation errors", () => {
    const settings = createDefaultFormSettings();

    // Create invalid settings
    const invalidSettings: FormSettingsData = {
      ...settings,
      title: "",
      notificationEmail: "invalid-email",
      redirectUrl: "not-a-url",
    };

    const errors = validateFormSettings(invalidSettings);
    expect(errors.length).toBe(3);

    // Check specific errors
    const titleError = errors.find((e) => e.setting === "title");
    expect(titleError?.message).toBe("Form title is required");

    const emailError = errors.find((e) => e.setting === "notificationEmail");
    expect(emailError?.message).toBe("Please enter a valid email address");

    const urlError = errors.find((e) => e.setting === "redirectUrl");
    expect(urlError?.message).toBe("Please enter a valid URL");
  });

  it("handles complete workflow: create, edit, validate", () => {
    // Step 1: Create default settings
    const settings = createDefaultFormSettings();

    // Step 2: Simulate editing
    let currentSettings = { ...settings };

    // Edit title
    const titleEvent: FormSettingsChangeEvent = {
      setting: "title",
      value: "My Custom Form",
    };
    currentSettings = { ...currentSettings, title: titleEvent.value };

    // Edit notification email
    const emailEvent: FormSettingsChangeEvent = {
      setting: "notificationEmail",
      value: "admin@mycompany.com",
    };
    currentSettings = { ...currentSettings, notificationEmail: emailEvent.value };

    // Edit redirect URL
    const urlEvent: FormSettingsChangeEvent = {
      setting: "redirectUrl",
      value: "https://mycompany.com/form-submitted",
    };
    currentSettings = { ...currentSettings, redirectUrl: urlEvent.value };

    // Step 3: Validate final settings
    const errors = validateFormSettings(currentSettings);
    expect(errors).toEqual([]);

    // Verify final state
    expect(currentSettings.title).toBe("My Custom Form");
    expect(currentSettings.notificationEmail).toBe("admin@mycompany.com");
    expect(currentSettings.redirectUrl).toBe("https://mycompany.com/form-submitted");
  });
});

describe("FormSettings All Settings Fields", () => {
  const allSettings: Array<keyof FormSettingsData> = [
    "title",
    "description",
    "submitButtonText",
    "successMessage",
    "redirectUrl",
    "notificationEmail",
    "status",
  ];

  it("has all expected settings fields", () => {
    const settings = createDefaultFormSettings();

    for (const field of allSettings) {
      expect(settings).toHaveProperty(field);
    }
  });

  it("can change each setting field", () => {
    for (const setting of allSettings) {
      const event: FormSettingsChangeEvent = {
        setting,
        value: setting === "status" ? "inactive" : `test-${setting}`,
      };

      expect(event.setting).toBe(setting);
      expect(event.value).toBeTruthy();
    }
  });
});
