/**
 * FormField Component Tests
 *
 * Tests for form field rendering based on schema metadata.
 * Implements PZ-208: Block Property Editor
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField } from "../../../src/components/property-editor/FormField";
import type { FieldMeta, FieldError } from "../../../src/components/property-editor/types";

describe("FormField Component (PZ-208)", () => {
  describe("TextField", () => {
    const textField: FieldMeta = {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      optional: false,
    };

    it("renders text input", () => {
      render(
        <FormField
          field={textField}
          value="Hello"
          onChange={() => {}}
          errors={[]}
        />
      );

      const input = screen.getByLabelText(/Content/);
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Hello");
      // Content field renders as textarea, not input
      expect(input.tagName).toBe("TEXTAREA");
    });

    it("renders textarea for content fields", () => {
      render(
        <FormField
          field={textField}
          value="Long text"
          onChange={() => {}}
          errors={[]}
        />
      );

      // Content field should render as textarea
      const textarea = screen.getByLabelText(/Content/);
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("calls onChange when value changes", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormField
          field={textField}
          value=""
          onChange={onChange}
          errors={[]}
        />
      );

      const input = screen.getByLabelText(/Content/);
      await user.type(input, "New value");

      expect(onChange).toHaveBeenCalled();
    });

    it("displays validation error", () => {
      const errors: FieldError[] = [{ path: "content", message: "Content is required" }];

      render(
        <FormField
          field={textField}
          value=""
          onChange={() => {}}
          errors={errors}
        />
      );

      expect(screen.getByText("Content is required")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("shows required marker for required fields", () => {
      render(
        <FormField
          field={textField}
          value=""
          onChange={() => {}}
          errors={[]}
        />
      );

      const requiredMarker = screen.getByText("*");
      expect(requiredMarker).toBeInTheDocument();
    });

    it("is disabled when disabled prop is true", () => {
      render(
        <FormField
          field={textField}
          value="Hello"
          onChange={() => {}}
          errors={[]}
          disabled
        />
      );

      const input = screen.getByLabelText(/Content/);
      expect(input).toBeDisabled();
    });
  });

  describe("NumberField", () => {
    const numberField: FieldMeta = {
      key: "count",
      label: "Count",
      type: "number",
      required: true,
      optional: false,
      min: 1,
      max: 100,
    };

    it("renders number input", () => {
      render(
        <FormField
          field={numberField}
          value={42}
          onChange={() => {}}
          errors={[]}
        />
      );

      const input = screen.getByLabelText(/Count/);
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(42);
      expect(input).toHaveAttribute("type", "number");
    });

    it("applies min/max constraints", () => {
      render(
        <FormField
          field={numberField}
          value={50}
          onChange={() => {}}
          errors={[]}
        />
      );

      const input = screen.getByLabelText(/Count/);
      expect(input).toHaveAttribute("min", "1");
      expect(input).toHaveAttribute("max", "100");
    });

    it("calls onChange with number value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormField
          field={numberField}
          value={10}
          onChange={onChange}
          errors={[]}
        />
      );

      const input = screen.getByLabelText(/Count/);
      await user.clear(input);
      await user.type(input, "25");

      // Should be called with numeric values
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("BooleanField", () => {
    const booleanField: FieldMeta = {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      required: false,
      optional: true,
    };

    it("renders checkbox", () => {
      render(
        <FormField
          field={booleanField}
          value={true}
          onChange={() => {}}
          errors={[]}
        />
      );

      const checkbox = screen.getByLabelText("Enabled");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute("type", "checkbox");
      expect(checkbox).toBeChecked();
    });

    it("calls onChange with boolean value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormField
          field={booleanField}
          value={false}
          onChange={onChange}
          errors={[]}
        />
      );

      const checkbox = screen.getByLabelText("Enabled");
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe("SelectField", () => {
    const selectField: FieldMeta = {
      key: "align",
      label: "Align",
      type: "select",
      required: false,
      optional: true,
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    };

    it("renders select dropdown", () => {
      render(
        <FormField
          field={selectField}
          value="center"
          onChange={() => {}}
          errors={[]}
        />
      );

      const select = screen.getByLabelText("Align");
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe("SELECT");
      expect(select).toHaveValue("center");
    });

    it("renders all options", () => {
      render(
        <FormField
          field={selectField}
          value="left"
          onChange={() => {}}
          errors={[]}
        />
      );

      expect(screen.getByText("Left")).toBeInTheDocument();
      expect(screen.getByText("Center")).toBeInTheDocument();
      expect(screen.getByText("Right")).toBeInTheDocument();
    });

    it("includes empty option for optional fields", () => {
      render(
        <FormField
          field={selectField}
          value=""
          onChange={() => {}}
          errors={[]}
        />
      );

      expect(screen.getByText("Select...")).toBeInTheDocument();
    });

    it("calls onChange with selected value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormField
          field={selectField}
          value="left"
          onChange={onChange}
          errors={[]}
        />
      );

      const select = screen.getByLabelText("Align");
      await user.selectOptions(select, "right");

      expect(onChange).toHaveBeenCalledWith("right");
    });
  });

  describe("ArrayField", () => {
    const arrayField: FieldMeta = {
      key: "items",
      label: "Items",
      type: "array",
      required: false,
      optional: true,
      itemSchema: {
        key: "item",
        label: "Item",
        type: "text",
        required: true,
        optional: false,
      },
    };

    it("renders array items", () => {
      render(
        <FormField
          field={arrayField}
          value={["First", "Second"]}
          onChange={() => {}}
          errors={[]}
        />
      );

      expect(screen.getByText("Items")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Remove item/i })).toHaveLength(2);
    });

    it("renders add item button", () => {
      render(
        <FormField
          field={arrayField}
          value={[]}
          onChange={() => {}}
          errors={[]}
        />
      );

      expect(screen.getByText("Add Item")).toBeInTheDocument();
    });

    it("calls onChange when adding item", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormField
          field={arrayField}
          value={["Existing"]}
          onChange={onChange}
          errors={[]}
        />
      );

      await user.click(screen.getByText("Add Item"));

      expect(onChange).toHaveBeenCalledWith(["Existing", ""]);
    });

    it("calls onChange when removing item", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormField
          field={arrayField}
          value={["First", "Second"]}
          onChange={onChange}
          errors={[]}
        />
      );

      const removeButtons = screen.getAllByRole("button", { name: /Remove item/i });
      await user.click(removeButtons[0]!);

      expect(onChange).toHaveBeenCalledWith(["Second"]);
    });
  });

  describe("ObjectField", () => {
    const objectField: FieldMeta = {
      key: "settings",
      label: "Settings",
      type: "object",
      required: false,
      optional: true,
      nested: [
        {
          key: "enabled",
          label: "Enabled",
          type: "boolean",
          required: true,
          optional: false,
        },
        {
          key: "value",
          label: "Value",
          type: "number",
          required: true,
          optional: false,
        },
      ],
    };

    it("renders fieldset with legend", () => {
      render(
        <FormField
          field={objectField}
          value={{ enabled: true, value: 10 }}
          onChange={() => {}}
          errors={[]}
        />
      );

      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders nested fields", () => {
      render(
        <FormField
          field={objectField}
          value={{ enabled: true, value: 10 }}
          onChange={() => {}}
          errors={[]}
        />
      );

      expect(screen.getByLabelText(/Enabled/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Value/)).toBeInTheDocument();
    });

    it("calls onChange with updated nested value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormField
          field={objectField}
          value={{ enabled: false, value: 10 }}
          onChange={onChange}
          errors={[]}
        />
      );

      const checkbox = screen.getByLabelText(/Enabled/);
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith({ enabled: true, value: 10 });
    });
  });

  describe("UnknownField", () => {
    const unknownField: FieldMeta = {
      key: "complex",
      label: "Complex",
      type: "unknown",
      required: false,
      optional: true,
    };

    it("renders unsupported message", () => {
      render(
        <FormField
          field={unknownField}
          value={null}
          onChange={() => {}}
          errors={[]}
        />
      );

      expect(screen.getByText(/Unsupported field type/)).toBeInTheDocument();
    });
  });

  describe("field path handling", () => {
    const textField: FieldMeta = {
      key: "title",
      label: "Title",
      type: "text",
      required: true,
      optional: false,
    };

    it("generates correct id for nested paths", () => {
      render(
        <FormField
          field={textField}
          value="Test"
          onChange={() => {}}
          errors={[]}
          path="settings.display"
        />
      );

      const input = screen.getByLabelText(/Title/);
      expect(input).toHaveAttribute("id", "pz-field-settings-display-title");
    });

    it("filters errors by path", () => {
      const errors: FieldError[] = [
        { path: "settings.display.title", message: "Title is required" },
        { path: "other.field", message: "Other error" },
      ];

      render(
        <FormField
          field={textField}
          value=""
          onChange={() => {}}
          errors={errors}
          path="settings.display"
        />
      );

      expect(screen.getByText("Title is required")).toBeInTheDocument();
      expect(screen.queryByText("Other error")).not.toBeInTheDocument();
    });
  });
});
