import { describe, expect, it } from "vitest";
import {
  LayoutTypeSchema,
  FieldWidthSchema,
  ComparisonOperatorSchema,
  VisibilityConditionSchema,
  LogicalOperatorSchema,
  ConditionGroupSchema,
  VisibilityRulesSchema,
  FieldLayoutSchema,
  FieldGroupSchema,
  FormLayoutSchema,
} from "../../src/layout";

describe("Layout Types Schemas", () => {
  describe("LayoutTypeSchema", () => {
    it("accepts valid layout types", () => {
      expect(LayoutTypeSchema.parse("single-column")).toBe("single-column");
      expect(LayoutTypeSchema.parse("two-column")).toBe("two-column");
    });

    it("rejects invalid layout types", () => {
      expect(() => LayoutTypeSchema.parse("three-column")).toThrow();
      expect(() => LayoutTypeSchema.parse("")).toThrow();
      expect(() => LayoutTypeSchema.parse(123)).toThrow();
    });
  });

  describe("FieldWidthSchema", () => {
    it("accepts valid field widths", () => {
      expect(FieldWidthSchema.parse("full")).toBe("full");
      expect(FieldWidthSchema.parse("half")).toBe("half");
    });

    it("rejects invalid field widths", () => {
      expect(() => FieldWidthSchema.parse("quarter")).toThrow();
      expect(() => FieldWidthSchema.parse("")).toThrow();
    });
  });

  describe("ComparisonOperatorSchema", () => {
    it("accepts all valid comparison operators", () => {
      const operators = [
        "equals",
        "notEquals",
        "contains",
        "notContains",
        "greaterThan",
        "lessThan",
        "greaterThanOrEquals",
        "lessThanOrEquals",
        "isEmpty",
        "isNotEmpty",
        "matches",
      ];

      for (const op of operators) {
        expect(ComparisonOperatorSchema.parse(op)).toBe(op);
      }
    });

    it("rejects invalid comparison operators", () => {
      expect(() => ComparisonOperatorSchema.parse("==")).toThrow();
      expect(() => ComparisonOperatorSchema.parse("like")).toThrow();
    });
  });

  describe("VisibilityConditionSchema", () => {
    it("accepts valid visibility conditions", () => {
      const condition = {
        fieldId: "country",
        operator: "equals",
        value: "USA",
      };
      const result = VisibilityConditionSchema.parse(condition);
      expect(result.fieldId).toBe("country");
      expect(result.operator).toBe("equals");
      expect(result.value).toBe("USA");
    });

    it("accepts conditions without value (for isEmpty/isNotEmpty)", () => {
      const condition = {
        fieldId: "email",
        operator: "isEmpty",
      };
      const result = VisibilityConditionSchema.parse(condition);
      expect(result.value).toBeUndefined();
    });

    it("accepts numeric values", () => {
      const condition = {
        fieldId: "age",
        operator: "greaterThan",
        value: 18,
      };
      const result = VisibilityConditionSchema.parse(condition);
      expect(result.value).toBe(18);
    });

    it("accepts boolean values", () => {
      const condition = {
        fieldId: "isActive",
        operator: "equals",
        value: true,
      };
      const result = VisibilityConditionSchema.parse(condition);
      expect(result.value).toBe(true);
    });

    it("accepts null values", () => {
      const condition = {
        fieldId: "status",
        operator: "equals",
        value: null,
      };
      const result = VisibilityConditionSchema.parse(condition);
      expect(result.value).toBeNull();
    });

    it("rejects empty fieldId", () => {
      const condition = {
        fieldId: "",
        operator: "equals",
        value: "test",
      };
      expect(() => VisibilityConditionSchema.parse(condition)).toThrow();
    });
  });

  describe("LogicalOperatorSchema", () => {
    it("accepts valid logical operators", () => {
      expect(LogicalOperatorSchema.parse("and")).toBe("and");
      expect(LogicalOperatorSchema.parse("or")).toBe("or");
    });

    it("rejects invalid logical operators", () => {
      expect(() => LogicalOperatorSchema.parse("xor")).toThrow();
      expect(() => LogicalOperatorSchema.parse("not")).toThrow();
    });
  });

  describe("ConditionGroupSchema", () => {
    it("accepts valid condition groups", () => {
      const group = {
        operator: "and",
        conditions: [
          { fieldId: "country", operator: "equals", value: "USA" },
          { fieldId: "age", operator: "greaterThan", value: 18 },
        ],
      };
      const result = ConditionGroupSchema.parse(group);
      expect(result.operator).toBe("and");
      expect(result.conditions).toHaveLength(2);
    });

    it("accepts nested condition groups", () => {
      const group = {
        operator: "or",
        conditions: [
          { fieldId: "status", operator: "equals", value: "active" },
          {
            operator: "and",
            conditions: [
              { fieldId: "role", operator: "equals", value: "admin" },
              { fieldId: "verified", operator: "equals", value: true },
            ],
          },
        ],
      };
      const result = ConditionGroupSchema.parse(group);
      expect(result.operator).toBe("or");
      expect(result.conditions).toHaveLength(2);
    });

    it("accepts empty conditions array", () => {
      const group = {
        operator: "and",
        conditions: [],
      };
      const result = ConditionGroupSchema.parse(group);
      expect(result.conditions).toHaveLength(0);
    });
  });

  describe("VisibilityRulesSchema", () => {
    it("accepts a single condition", () => {
      const rules = {
        fieldId: "showDetails",
        operator: "equals",
        value: true,
      };
      const result = VisibilityRulesSchema.parse(rules);
      expect(result).toHaveProperty("fieldId");
    });

    it("accepts a condition group", () => {
      const rules = {
        operator: "and",
        conditions: [
          { fieldId: "a", operator: "equals", value: 1 },
          { fieldId: "b", operator: "equals", value: 2 },
        ],
      };
      const result = VisibilityRulesSchema.parse(rules);
      expect(result).toHaveProperty("operator");
    });
  });

  describe("FieldLayoutSchema", () => {
    it("accepts minimal field layout", () => {
      const layout = { fieldId: "name" };
      const result = FieldLayoutSchema.parse(layout);
      expect(result.fieldId).toBe("name");
      expect(result.width).toBeUndefined();
      expect(result.order).toBeUndefined();
    });

    it("accepts full field layout", () => {
      const layout = {
        fieldId: "firstName",
        width: "half",
        order: 1,
        className: "custom-field",
        visibleWhen: {
          fieldId: "showName",
          operator: "equals",
          value: true,
        },
      };
      const result = FieldLayoutSchema.parse(layout);
      expect(result.fieldId).toBe("firstName");
      expect(result.width).toBe("half");
      expect(result.order).toBe(1);
      expect(result.className).toBe("custom-field");
      expect(result.visibleWhen).toBeDefined();
    });

    it("rejects negative order", () => {
      const layout = {
        fieldId: "name",
        order: -1,
      };
      expect(() => FieldLayoutSchema.parse(layout)).toThrow();
    });

    it("rejects non-integer order", () => {
      const layout = {
        fieldId: "name",
        order: 1.5,
      };
      expect(() => FieldLayoutSchema.parse(layout)).toThrow();
    });
  });

  describe("FieldGroupSchema", () => {
    it("accepts minimal field group", () => {
      const group = {
        id: "personal",
        fieldIds: ["firstName", "lastName"],
      };
      const result = FieldGroupSchema.parse(group);
      expect(result.id).toBe("personal");
      expect(result.fieldIds).toEqual(["firstName", "lastName"]);
    });

    it("accepts full field group", () => {
      const group = {
        id: "address",
        header: "Address Information",
        description: "Enter your mailing address",
        fieldIds: ["street", "city", "state", "zip"],
        collapsible: true,
        defaultCollapsed: false,
        className: "address-group",
        visibleWhen: {
          fieldId: "hasAddress",
          operator: "equals",
          value: true,
        },
      };
      const result = FieldGroupSchema.parse(group);
      expect(result.header).toBe("Address Information");
      expect(result.description).toBe("Enter your mailing address");
      expect(result.collapsible).toBe(true);
      expect(result.defaultCollapsed).toBe(false);
    });

    it("accepts empty fieldIds array", () => {
      const group = {
        id: "empty",
        fieldIds: [],
      };
      const result = FieldGroupSchema.parse(group);
      expect(result.fieldIds).toHaveLength(0);
    });

    it("rejects empty group id", () => {
      const group = {
        id: "",
        fieldIds: ["field1"],
      };
      expect(() => FieldGroupSchema.parse(group)).toThrow();
    });
  });

  describe("FormLayoutSchema", () => {
    it("accepts empty layout (defaults)", () => {
      const layout = {};
      const result = FormLayoutSchema.parse(layout);
      expect(result.type).toBe("single-column");
    });

    it("accepts minimal layout with type", () => {
      const layout = { type: "two-column" };
      const result = FormLayoutSchema.parse(layout);
      expect(result.type).toBe("two-column");
    });

    it("accepts full form layout", () => {
      const layout = {
        type: "two-column",
        defaultFieldWidth: "half",
        gap: "1rem",
        groupGap: "2rem",
        className: "my-form",
        fields: [
          { fieldId: "name", width: "full", order: 1 },
          { fieldId: "email", width: "half", order: 2 },
        ],
        groups: [
          {
            id: "contact",
            header: "Contact Info",
            fieldIds: ["phone", "email"],
          },
        ],
      };
      const result = FormLayoutSchema.parse(layout);
      expect(result.type).toBe("two-column");
      expect(result.defaultFieldWidth).toBe("half");
      expect(result.gap).toBe("1rem");
      expect(result.groupGap).toBe("2rem");
      expect(result.fields).toHaveLength(2);
      expect(result.groups).toHaveLength(1);
    });

    it("accepts layout without fields or groups", () => {
      const layout = {
        type: "single-column",
        gap: "0.5rem",
      };
      const result = FormLayoutSchema.parse(layout);
      expect(result.fields).toBeUndefined();
      expect(result.groups).toBeUndefined();
    });
  });
});
