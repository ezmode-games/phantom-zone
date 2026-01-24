import { describe, expect, it } from "vitest";
import {
  computeLayout,
  evaluateCondition,
  evaluateVisibilityRules,
  createDefaultLayout,
  createTwoColumnLayout,
  createFieldGroup,
  mergeLayouts,
  getVisibleFieldIds,
  isFieldVisible,
} from "../../src/layout";
import type {
  FormLayout,
  FormValues,
  VisibilityCondition,
  ConditionGroup,
} from "../../src/layout";

describe("Layout Engine", () => {
  describe("evaluateCondition", () => {
    describe("equals operator", () => {
      it("returns true when values match", () => {
        const condition: VisibilityCondition = {
          fieldId: "status",
          operator: "equals",
          value: "active",
        };
        expect(evaluateCondition(condition, { status: "active" })).toBe(true);
      });

      it("returns false when values do not match", () => {
        const condition: VisibilityCondition = {
          fieldId: "status",
          operator: "equals",
          value: "active",
        };
        expect(evaluateCondition(condition, { status: "inactive" })).toBe(false);
      });

      it("handles numeric comparisons", () => {
        const condition: VisibilityCondition = {
          fieldId: "count",
          operator: "equals",
          value: 5,
        };
        expect(evaluateCondition(condition, { count: 5 })).toBe(true);
        expect(evaluateCondition(condition, { count: 6 })).toBe(false);
      });

      it("handles boolean comparisons", () => {
        const condition: VisibilityCondition = {
          fieldId: "enabled",
          operator: "equals",
          value: true,
        };
        expect(evaluateCondition(condition, { enabled: true })).toBe(true);
        expect(evaluateCondition(condition, { enabled: false })).toBe(false);
      });

      it("handles null comparisons", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "equals",
          value: null,
        };
        expect(evaluateCondition(condition, { value: null })).toBe(true);
        expect(evaluateCondition(condition, { value: "something" })).toBe(false);
      });
    });

    describe("notEquals operator", () => {
      it("returns true when values differ", () => {
        const condition: VisibilityCondition = {
          fieldId: "status",
          operator: "notEquals",
          value: "deleted",
        };
        expect(evaluateCondition(condition, { status: "active" })).toBe(true);
      });

      it("returns false when values match", () => {
        const condition: VisibilityCondition = {
          fieldId: "status",
          operator: "notEquals",
          value: "deleted",
        };
        expect(evaluateCondition(condition, { status: "deleted" })).toBe(false);
      });
    });

    describe("contains operator", () => {
      it("returns true when string contains substring", () => {
        const condition: VisibilityCondition = {
          fieldId: "description",
          operator: "contains",
          value: "important",
        };
        expect(
          evaluateCondition(condition, {
            description: "This is an important note",
          })
        ).toBe(true);
      });

      it("returns false when string does not contain substring", () => {
        const condition: VisibilityCondition = {
          fieldId: "description",
          operator: "contains",
          value: "urgent",
        };
        expect(
          evaluateCondition(condition, {
            description: "This is a regular note",
          })
        ).toBe(false);
      });

      it("works with arrays", () => {
        const condition: VisibilityCondition = {
          fieldId: "tags",
          operator: "contains",
          value: "featured",
        };
        expect(
          evaluateCondition(condition, {
            tags: ["new", "featured", "sale"],
          })
        ).toBe(true);
        expect(
          evaluateCondition(condition, {
            tags: ["new", "sale"],
          })
        ).toBe(false);
      });

      it("returns false for non-string/array values", () => {
        const condition: VisibilityCondition = {
          fieldId: "count",
          operator: "contains",
          value: "5",
        };
        expect(evaluateCondition(condition, { count: 5 })).toBe(false);
      });
    });

    describe("notContains operator", () => {
      it("returns true when string does not contain substring", () => {
        const condition: VisibilityCondition = {
          fieldId: "text",
          operator: "notContains",
          value: "error",
        };
        expect(evaluateCondition(condition, { text: "All good!" })).toBe(true);
      });

      it("returns false when string contains substring", () => {
        const condition: VisibilityCondition = {
          fieldId: "text",
          operator: "notContains",
          value: "error",
        };
        expect(
          evaluateCondition(condition, { text: "An error occurred" })
        ).toBe(false);
      });
    });

    describe("greaterThan operator", () => {
      it("returns true when value is greater", () => {
        const condition: VisibilityCondition = {
          fieldId: "age",
          operator: "greaterThan",
          value: 18,
        };
        expect(evaluateCondition(condition, { age: 21 })).toBe(true);
      });

      it("returns false when value is equal", () => {
        const condition: VisibilityCondition = {
          fieldId: "age",
          operator: "greaterThan",
          value: 18,
        };
        expect(evaluateCondition(condition, { age: 18 })).toBe(false);
      });

      it("returns false when value is less", () => {
        const condition: VisibilityCondition = {
          fieldId: "age",
          operator: "greaterThan",
          value: 18,
        };
        expect(evaluateCondition(condition, { age: 16 })).toBe(false);
      });

      it("returns false for non-numeric values", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "greaterThan",
          value: 5,
        };
        expect(evaluateCondition(condition, { value: "ten" })).toBe(false);
      });
    });

    describe("lessThan operator", () => {
      it("returns true when value is less", () => {
        const condition: VisibilityCondition = {
          fieldId: "quantity",
          operator: "lessThan",
          value: 10,
        };
        expect(evaluateCondition(condition, { quantity: 5 })).toBe(true);
      });

      it("returns false when value is equal or greater", () => {
        const condition: VisibilityCondition = {
          fieldId: "quantity",
          operator: "lessThan",
          value: 10,
        };
        expect(evaluateCondition(condition, { quantity: 10 })).toBe(false);
        expect(evaluateCondition(condition, { quantity: 15 })).toBe(false);
      });
    });

    describe("greaterThanOrEquals operator", () => {
      it("returns true when value is greater or equal", () => {
        const condition: VisibilityCondition = {
          fieldId: "score",
          operator: "greaterThanOrEquals",
          value: 70,
        };
        expect(evaluateCondition(condition, { score: 70 })).toBe(true);
        expect(evaluateCondition(condition, { score: 85 })).toBe(true);
      });

      it("returns false when value is less", () => {
        const condition: VisibilityCondition = {
          fieldId: "score",
          operator: "greaterThanOrEquals",
          value: 70,
        };
        expect(evaluateCondition(condition, { score: 65 })).toBe(false);
      });
    });

    describe("lessThanOrEquals operator", () => {
      it("returns true when value is less or equal", () => {
        const condition: VisibilityCondition = {
          fieldId: "price",
          operator: "lessThanOrEquals",
          value: 100,
        };
        expect(evaluateCondition(condition, { price: 100 })).toBe(true);
        expect(evaluateCondition(condition, { price: 50 })).toBe(true);
      });

      it("returns false when value is greater", () => {
        const condition: VisibilityCondition = {
          fieldId: "price",
          operator: "lessThanOrEquals",
          value: 100,
        };
        expect(evaluateCondition(condition, { price: 150 })).toBe(false);
      });
    });

    describe("isEmpty operator", () => {
      it("returns true for null", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "isEmpty",
        };
        expect(evaluateCondition(condition, { value: null })).toBe(true);
      });

      it("returns true for undefined", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "isEmpty",
        };
        expect(evaluateCondition(condition, {})).toBe(true);
      });

      it("returns true for empty string", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "isEmpty",
        };
        expect(evaluateCondition(condition, { value: "" })).toBe(true);
      });

      it("returns true for empty array", () => {
        const condition: VisibilityCondition = {
          fieldId: "items",
          operator: "isEmpty",
        };
        expect(evaluateCondition(condition, { items: [] })).toBe(true);
      });

      it("returns false for non-empty values", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "isEmpty",
        };
        expect(evaluateCondition(condition, { value: "hello" })).toBe(false);
        expect(evaluateCondition(condition, { value: 0 })).toBe(false);
        expect(evaluateCondition(condition, { value: false })).toBe(false);
      });
    });

    describe("isNotEmpty operator", () => {
      it("returns true for non-empty values", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "isNotEmpty",
        };
        expect(evaluateCondition(condition, { value: "hello" })).toBe(true);
        expect(evaluateCondition(condition, { value: ["item"] })).toBe(true);
      });

      it("returns false for empty values", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "isNotEmpty",
        };
        expect(evaluateCondition(condition, { value: null })).toBe(false);
        expect(evaluateCondition(condition, { value: "" })).toBe(false);
        expect(evaluateCondition(condition, { value: [] })).toBe(false);
      });
    });

    describe("matches operator", () => {
      it("returns true when regex matches", () => {
        const condition: VisibilityCondition = {
          fieldId: "email",
          operator: "matches",
          value: "^[a-z]+@[a-z]+\\.[a-z]+$",
        };
        expect(evaluateCondition(condition, { email: "test@example.com" })).toBe(
          true
        );
      });

      it("returns false when regex does not match", () => {
        const condition: VisibilityCondition = {
          fieldId: "email",
          operator: "matches",
          value: "^[a-z]+@[a-z]+\\.[a-z]+$",
        };
        expect(
          evaluateCondition(condition, { email: "invalid-email" })
        ).toBe(false);
      });

      it("returns false for invalid regex", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "matches",
          value: "[invalid(regex",
        };
        expect(evaluateCondition(condition, { value: "test" })).toBe(false);
      });

      it("returns false for non-string values", () => {
        const condition: VisibilityCondition = {
          fieldId: "value",
          operator: "matches",
          value: "\\d+",
        };
        expect(evaluateCondition(condition, { value: 123 })).toBe(false);
      });
    });
  });

  describe("evaluateVisibilityRules", () => {
    it("evaluates a single condition", () => {
      const rules: VisibilityCondition = {
        fieldId: "active",
        operator: "equals",
        value: true,
      };
      expect(evaluateVisibilityRules(rules, { active: true })).toBe(true);
      expect(evaluateVisibilityRules(rules, { active: false })).toBe(false);
    });

    it("evaluates an AND condition group", () => {
      const rules: ConditionGroup = {
        operator: "and",
        conditions: [
          { fieldId: "a", operator: "equals", value: 1 },
          { fieldId: "b", operator: "equals", value: 2 },
        ],
      };
      expect(evaluateVisibilityRules(rules, { a: 1, b: 2 })).toBe(true);
      expect(evaluateVisibilityRules(rules, { a: 1, b: 3 })).toBe(false);
      expect(evaluateVisibilityRules(rules, { a: 0, b: 2 })).toBe(false);
    });

    it("evaluates an OR condition group", () => {
      const rules: ConditionGroup = {
        operator: "or",
        conditions: [
          { fieldId: "role", operator: "equals", value: "admin" },
          { fieldId: "role", operator: "equals", value: "superuser" },
        ],
      };
      expect(evaluateVisibilityRules(rules, { role: "admin" })).toBe(true);
      expect(evaluateVisibilityRules(rules, { role: "superuser" })).toBe(true);
      expect(evaluateVisibilityRules(rules, { role: "user" })).toBe(false);
    });

    it("evaluates nested condition groups", () => {
      const rules: ConditionGroup = {
        operator: "or",
        conditions: [
          { fieldId: "status", operator: "equals", value: "vip" },
          {
            operator: "and",
            conditions: [
              { fieldId: "purchases", operator: "greaterThan", value: 10 },
              { fieldId: "registered", operator: "equals", value: true },
            ],
          },
        ],
      };
      // VIP status grants access
      expect(evaluateVisibilityRules(rules, { status: "vip" })).toBe(true);
      // Non-VIP with enough purchases and registered
      expect(
        evaluateVisibilityRules(rules, {
          status: "regular",
          purchases: 15,
          registered: true,
        })
      ).toBe(true);
      // Non-VIP without enough purchases
      expect(
        evaluateVisibilityRules(rules, {
          status: "regular",
          purchases: 5,
          registered: true,
        })
      ).toBe(false);
    });

    it("handles empty AND group (returns true)", () => {
      const rules: ConditionGroup = {
        operator: "and",
        conditions: [],
      };
      expect(evaluateVisibilityRules(rules, {})).toBe(true);
    });

    it("handles empty OR group (returns false)", () => {
      const rules: ConditionGroup = {
        operator: "or",
        conditions: [],
      };
      expect(evaluateVisibilityRules(rules, {})).toBe(false);
    });
  });

  describe("computeLayout", () => {
    const fieldIds = ["name", "email", "phone", "address", "city", "zip"];

    it("computes default single-column layout", () => {
      const layout: FormLayout = { type: "single-column" };
      const result = computeLayout({
        layout,
        fieldIds,
        values: {},
      });

      expect(result.type).toBe("single-column");
      expect(result.ungroupedFields).toHaveLength(6);
      expect(result.groups).toHaveLength(0);
      // All fields should be visible with full width
      for (const field of result.ungroupedFields) {
        expect(field.visible).toBe(true);
        expect(field.width).toBe("full");
      }
    });

    it("computes two-column layout with default width", () => {
      const layout: FormLayout = {
        type: "two-column",
        defaultFieldWidth: "half",
      };
      const result = computeLayout({
        layout,
        fieldIds,
        values: {},
      });

      expect(result.type).toBe("two-column");
      for (const field of result.ungroupedFields) {
        expect(field.width).toBe("half");
      }
    });

    it("respects individual field widths", () => {
      const layout: FormLayout = {
        type: "two-column",
        defaultFieldWidth: "half",
        fields: [
          { fieldId: "name", width: "full" },
          { fieldId: "address", width: "full" },
        ],
      };
      const result = computeLayout({
        layout,
        fieldIds,
        values: {},
      });

      const nameField = result.ungroupedFields.find(
        (f) => f.fieldId === "name"
      );
      const emailField = result.ungroupedFields.find(
        (f) => f.fieldId === "email"
      );
      const addressField = result.ungroupedFields.find(
        (f) => f.fieldId === "address"
      );

      expect(nameField?.width).toBe("full");
      expect(emailField?.width).toBe("half");
      expect(addressField?.width).toBe("full");
    });

    it("orders fields by explicit order", () => {
      const layout: FormLayout = {
        type: "single-column",
        fields: [
          { fieldId: "zip", order: 0 },
          { fieldId: "name", order: 1 },
          { fieldId: "email", order: 2 },
        ],
      };
      const result = computeLayout({
        layout,
        fieldIds: ["name", "email", "zip"],
        values: {},
      });

      expect(result.ungroupedFields[0].fieldId).toBe("zip");
      expect(result.ungroupedFields[1].fieldId).toBe("name");
      expect(result.ungroupedFields[2].fieldId).toBe("email");
    });

    it("applies conditional visibility", () => {
      const layout: FormLayout = {
        type: "single-column",
        fields: [
          {
            fieldId: "phone",
            visibleWhen: {
              fieldId: "contactMethod",
              operator: "equals",
              value: "phone",
            },
          },
          {
            fieldId: "email",
            visibleWhen: {
              fieldId: "contactMethod",
              operator: "equals",
              value: "email",
            },
          },
        ],
      };

      // Phone selected
      const resultPhone = computeLayout({
        layout,
        fieldIds: ["contactMethod", "phone", "email"],
        values: { contactMethod: "phone" },
      });
      const phoneField = resultPhone.ungroupedFields.find(
        (f) => f.fieldId === "phone"
      );
      const emailField = resultPhone.ungroupedFields.find(
        (f) => f.fieldId === "email"
      );
      expect(phoneField?.visible).toBe(true);
      expect(emailField?.visible).toBe(false);

      // Email selected
      const resultEmail = computeLayout({
        layout,
        fieldIds: ["contactMethod", "phone", "email"],
        values: { contactMethod: "email" },
      });
      const phoneField2 = resultEmail.ungroupedFields.find(
        (f) => f.fieldId === "phone"
      );
      const emailField2 = resultEmail.ungroupedFields.find(
        (f) => f.fieldId === "email"
      );
      expect(phoneField2?.visible).toBe(false);
      expect(emailField2?.visible).toBe(true);
    });

    it("organizes fields into groups", () => {
      const layout: FormLayout = {
        type: "single-column",
        groups: [
          {
            id: "personal",
            header: "Personal Info",
            fieldIds: ["name", "email"],
          },
          {
            id: "address",
            header: "Address",
            fieldIds: ["address", "city", "zip"],
          },
        ],
      };
      const result = computeLayout({
        layout,
        fieldIds,
        values: {},
      });

      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].header).toBe("Personal Info");
      expect(result.groups[0].fields.map((f) => f.fieldId)).toEqual([
        "name",
        "email",
      ]);
      expect(result.groups[1].header).toBe("Address");
      expect(result.groups[1].fields.map((f) => f.fieldId)).toEqual([
        "address",
        "city",
        "zip",
      ]);
      // Only 'phone' is ungrouped
      expect(result.ungroupedFields.map((f) => f.fieldId)).toEqual(["phone"]);
    });

    it("applies group visibility conditions", () => {
      const layout: FormLayout = {
        type: "single-column",
        groups: [
          {
            id: "shipping",
            header: "Shipping Address",
            fieldIds: ["shippingAddress"],
            visibleWhen: {
              fieldId: "needsShipping",
              operator: "equals",
              value: true,
            },
          },
        ],
      };

      const resultVisible = computeLayout({
        layout,
        fieldIds: ["needsShipping", "shippingAddress"],
        values: { needsShipping: true },
      });
      expect(resultVisible.groups[0].visible).toBe(true);

      const resultHidden = computeLayout({
        layout,
        fieldIds: ["needsShipping", "shippingAddress"],
        values: { needsShipping: false },
      });
      expect(resultHidden.groups[0].visible).toBe(false);
    });

    it("sets group visibility based on field visibility", () => {
      const layout: FormLayout = {
        type: "single-column",
        fields: [
          {
            fieldId: "secretField",
            visibleWhen: {
              fieldId: "showSecret",
              operator: "equals",
              value: true,
            },
          },
        ],
        groups: [
          {
            id: "secretGroup",
            header: "Secret Section",
            fieldIds: ["secretField"],
          },
        ],
      };

      // Group hidden when all fields hidden
      const resultHidden = computeLayout({
        layout,
        fieldIds: ["showSecret", "secretField"],
        values: { showSecret: false },
      });
      expect(resultHidden.groups[0].visible).toBe(false);

      // Group visible when at least one field visible
      const resultVisible = computeLayout({
        layout,
        fieldIds: ["showSecret", "secretField"],
        values: { showSecret: true },
      });
      expect(resultVisible.groups[0].visible).toBe(true);
    });

    it("preserves collapsible group settings", () => {
      const layout: FormLayout = {
        type: "single-column",
        groups: [
          {
            id: "advanced",
            header: "Advanced Options",
            fieldIds: ["option1", "option2"],
            collapsible: true,
            defaultCollapsed: true,
          },
        ],
      };
      const result = computeLayout({
        layout,
        fieldIds: ["option1", "option2"],
        values: {},
      });

      expect(result.groups[0].collapsible).toBe(true);
      expect(result.groups[0].defaultCollapsed).toBe(true);
    });

    it("includes CSS styling properties", () => {
      const layout: FormLayout = {
        type: "single-column",
        gap: "1.5rem",
        groupGap: "3rem",
        className: "custom-form",
        fields: [{ fieldId: "name", className: "name-field" }],
        groups: [
          {
            id: "group1",
            fieldIds: ["email"],
            className: "email-group",
          },
        ],
      };
      const result = computeLayout({
        layout,
        fieldIds: ["name", "email"],
        values: {},
      });

      expect(result.gap).toBe("1.5rem");
      expect(result.groupGap).toBe("3rem");
      expect(result.className).toBe("custom-form");
      expect(result.ungroupedFields[0].className).toBe("name-field");
      expect(result.groups[0].className).toBe("email-group");
    });
  });

  describe("createDefaultLayout", () => {
    it("creates a single-column layout", () => {
      const layout = createDefaultLayout(["field1", "field2", "field3"]);
      expect(layout.type).toBe("single-column");
      expect(layout.fields).toHaveLength(3);
    });

    it("orders fields sequentially", () => {
      const layout = createDefaultLayout(["a", "b", "c"]);
      expect(layout.fields?.[0]).toEqual({
        fieldId: "a",
        order: 0,
        width: "full",
      });
      expect(layout.fields?.[1]).toEqual({
        fieldId: "b",
        order: 1,
        width: "full",
      });
      expect(layout.fields?.[2]).toEqual({
        fieldId: "c",
        order: 2,
        width: "full",
      });
    });

    it("handles empty field list", () => {
      const layout = createDefaultLayout([]);
      expect(layout.fields).toHaveLength(0);
    });
  });

  describe("createTwoColumnLayout", () => {
    it("creates a two-column layout", () => {
      const layout = createTwoColumnLayout(
        ["firstName", "lastName", "bio"],
        ["firstName", "lastName"]
      );
      expect(layout.type).toBe("two-column");
    });

    it("sets short fields to half width", () => {
      const layout = createTwoColumnLayout(
        ["firstName", "lastName", "bio"],
        ["firstName", "lastName"]
      );
      const firstNameField = layout.fields?.find(
        (f) => f.fieldId === "firstName"
      );
      const lastNameField = layout.fields?.find(
        (f) => f.fieldId === "lastName"
      );
      const bioField = layout.fields?.find((f) => f.fieldId === "bio");

      expect(firstNameField?.width).toBe("half");
      expect(lastNameField?.width).toBe("half");
      expect(bioField?.width).toBe("full");
    });
  });

  describe("createFieldGroup", () => {
    it("creates a basic field group", () => {
      const group = createFieldGroup("personal", ["name", "email"]);
      expect(group.id).toBe("personal");
      expect(group.fieldIds).toEqual(["name", "email"]);
    });

    it("accepts optional settings", () => {
      const group = createFieldGroup("advanced", ["opt1", "opt2"], {
        header: "Advanced Options",
        description: "Configure advanced settings",
        collapsible: true,
        defaultCollapsed: true,
      });
      expect(group.header).toBe("Advanced Options");
      expect(group.description).toBe("Configure advanced settings");
      expect(group.collapsible).toBe(true);
      expect(group.defaultCollapsed).toBe(true);
    });
  });

  describe("mergeLayouts", () => {
    it("merges layout type", () => {
      const result = mergeLayouts(
        { type: "single-column" },
        { type: "two-column" }
      );
      expect(result.type).toBe("two-column");
    });

    it("merges field layouts", () => {
      const result = mergeLayouts(
        {
          fields: [
            { fieldId: "a", width: "full" },
            { fieldId: "b", width: "full" },
          ],
        },
        {
          fields: [{ fieldId: "a", width: "half" }],
        }
      );
      const fieldA = result.fields?.find((f) => f.fieldId === "a");
      const fieldB = result.fields?.find((f) => f.fieldId === "b");
      expect(fieldA?.width).toBe("half");
      expect(fieldB?.width).toBe("full");
    });

    it("merges field groups", () => {
      const result = mergeLayouts(
        {
          groups: [
            { id: "group1", header: "Old Header", fieldIds: ["a"] },
          ],
        },
        {
          groups: [
            { id: "group1", header: "New Header", fieldIds: ["a", "b"] },
          ],
        }
      );
      expect(result.groups?.[0].header).toBe("New Header");
      expect(result.groups?.[0].fieldIds).toEqual(["a", "b"]);
    });

    it("merges multiple layouts in order", () => {
      const result = mergeLayouts(
        { gap: "1rem" },
        { groupGap: "2rem" },
        { className: "final-class" }
      );
      expect(result.gap).toBe("1rem");
      expect(result.groupGap).toBe("2rem");
      expect(result.className).toBe("final-class");
    });
  });

  describe("getVisibleFieldIds", () => {
    it("returns all visible field IDs in order", () => {
      const layout: FormLayout = {
        type: "single-column",
        fields: [
          {
            fieldId: "hidden",
            visibleWhen: { fieldId: "show", operator: "equals", value: true },
          },
        ],
        groups: [
          { id: "g1", fieldIds: ["a", "b"] },
        ],
      };
      const computed = computeLayout({
        layout,
        fieldIds: ["show", "hidden", "a", "b", "c"],
        values: { show: false },
      });
      const visible = getVisibleFieldIds(computed);
      expect(visible).toContain("a");
      expect(visible).toContain("b");
      expect(visible).toContain("show");
      expect(visible).toContain("c");
      expect(visible).not.toContain("hidden");
    });

    it("excludes fields from hidden groups", () => {
      const layout: FormLayout = {
        type: "single-column",
        groups: [
          {
            id: "secret",
            fieldIds: ["secretField"],
            visibleWhen: {
              fieldId: "showSecret",
              operator: "equals",
              value: true,
            },
          },
        ],
      };
      const computed = computeLayout({
        layout,
        fieldIds: ["showSecret", "secretField"],
        values: { showSecret: false },
      });
      const visible = getVisibleFieldIds(computed);
      expect(visible).not.toContain("secretField");
    });
  });

  describe("isFieldVisible", () => {
    it("returns true for visible ungrouped fields", () => {
      const layout: FormLayout = { type: "single-column" };
      const computed = computeLayout({
        layout,
        fieldIds: ["name"],
        values: {},
      });
      expect(isFieldVisible(computed, "name")).toBe(true);
    });

    it("returns false for hidden fields", () => {
      const layout: FormLayout = {
        type: "single-column",
        fields: [
          {
            fieldId: "hidden",
            visibleWhen: { fieldId: "show", operator: "equals", value: true },
          },
        ],
      };
      const computed = computeLayout({
        layout,
        fieldIds: ["show", "hidden"],
        values: { show: false },
      });
      expect(isFieldVisible(computed, "hidden")).toBe(false);
    });

    it("returns false for non-existent fields", () => {
      const layout: FormLayout = { type: "single-column" };
      const computed = computeLayout({
        layout,
        fieldIds: ["name"],
        values: {},
      });
      expect(isFieldVisible(computed, "nonexistent")).toBe(false);
    });

    it("considers group visibility", () => {
      const layout: FormLayout = {
        type: "single-column",
        groups: [
          {
            id: "hidden-group",
            fieldIds: ["field-in-hidden-group"],
            visibleWhen: {
              fieldId: "showGroup",
              operator: "equals",
              value: true,
            },
          },
        ],
      };
      const computed = computeLayout({
        layout,
        fieldIds: ["showGroup", "field-in-hidden-group"],
        values: { showGroup: false },
      });
      expect(isFieldVisible(computed, "field-in-hidden-group")).toBe(false);
    });
  });
});
