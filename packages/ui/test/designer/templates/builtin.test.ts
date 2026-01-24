/**
 * Built-in Templates Tests (PZ-106)
 *
 * Tests for the pre-built form templates.
 */

import { describe, expect, it } from "vitest";
import {
  generalApplicationTemplate,
  raidRecruitmentTemplate,
  casualJoinTemplate,
  builtInTemplates,
  getBuiltInTemplate,
  getBuiltInTemplatesByCategory,
} from "../../../src/designer/templates";

describe("Built-in Templates", () => {
  describe("generalApplicationTemplate", () => {
    it("has correct metadata", () => {
      expect(generalApplicationTemplate.metadata.id).toBe("general-application");
      expect(generalApplicationTemplate.metadata.name).toBe("General Application");
      expect(generalApplicationTemplate.metadata.category).toBe("guild");
      expect(generalApplicationTemplate.metadata.isBuiltIn).toBe(true);
      expect(generalApplicationTemplate.metadata.icon).toBe("file-text");
    });

    it("has correct form title and description", () => {
      expect(generalApplicationTemplate.title).toBe("Guild Application");
      expect(generalApplicationTemplate.description).toBeTruthy();
    });

    it("has required fields", () => {
      const fieldLabels = generalApplicationTemplate.fields.map((f) => f.label);

      expect(fieldLabels).toContain("Character Name");
      expect(fieldLabels).toContain("Server/Realm");
      expect(fieldLabels).toContain("Class");
      expect(fieldLabels).toContain("Primary Role");
      expect(fieldLabels).toContain("Available Days");
      expect(fieldLabels).toContain("Why do you want to join?");
    });

    it("has 6 fields", () => {
      expect(generalApplicationTemplate.fields).toHaveLength(6);
    });

    it("character name field is required", () => {
      const charField = generalApplicationTemplate.fields.find(
        (f) => f.label === "Character Name"
      );
      expect(charField?.required).toBe(true);
      expect(charField?.inputType).toBe("text");
    });

    it("class field has options", () => {
      const classField = generalApplicationTemplate.fields.find((f) => f.label === "Class");
      expect(classField?.inputType).toBe("select");
      expect(classField?.options).toBeDefined();
      expect(classField?.options?.length).toBeGreaterThan(0);
    });

    it("role field has tank, healer, and dps options", () => {
      const roleField = generalApplicationTemplate.fields.find(
        (f) => f.label === "Primary Role"
      );
      expect(roleField?.options).toBeDefined();

      const values = roleField?.options?.map((o) => o.value) ?? [];
      expect(values).toContain("tank");
      expect(values).toContain("healer");
      expect(values).toContain("melee_dps");
      expect(values).toContain("ranged_dps");
    });

    it("schedule field uses multiselect for days", () => {
      const scheduleField = generalApplicationTemplate.fields.find(
        (f) => f.label === "Available Days"
      );
      expect(scheduleField?.inputType).toBe("multiselect");
      expect(scheduleField?.options).toHaveLength(7);
    });
  });

  describe("raidRecruitmentTemplate", () => {
    it("has correct metadata", () => {
      expect(raidRecruitmentTemplate.metadata.id).toBe("raid-recruitment");
      expect(raidRecruitmentTemplate.metadata.name).toBe("Raid Recruitment");
      expect(raidRecruitmentTemplate.metadata.category).toBe("recruitment");
      expect(raidRecruitmentTemplate.metadata.isBuiltIn).toBe(true);
    });

    it("includes raid-specific fields", () => {
      const fieldLabels = raidRecruitmentTemplate.fields.map((f) => f.label);

      expect(fieldLabels).toContain("Raid Experience");
      expect(fieldLabels).toContain("Warcraft Logs Link");
      expect(fieldLabels).toContain("Mythic+ Score");
      expect(fieldLabels).toContain("Raid Availability");
    });

    it("has more fields than general application", () => {
      expect(raidRecruitmentTemplate.fields.length).toBeGreaterThan(
        generalApplicationTemplate.fields.length
      );
    });

    it("logs link field is optional", () => {
      const logsField = raidRecruitmentTemplate.fields.find(
        (f) => f.label === "Warcraft Logs Link"
      );
      expect(logsField?.required).toBe(false);
    });

    it("mythic plus score uses number input", () => {
      const scoreField = raidRecruitmentTemplate.fields.find(
        (f) => f.label === "Mythic+ Score"
      );
      expect(scoreField?.inputType).toBe("number");
      expect(scoreField?.required).toBe(false);
    });

    it("raid experience uses textarea", () => {
      const expField = raidRecruitmentTemplate.fields.find(
        (f) => f.label === "Raid Experience"
      );
      expect(expField?.inputType).toBe("textarea");
      expect(expField?.required).toBe(true);
    });
  });

  describe("casualJoinTemplate", () => {
    it("has correct metadata", () => {
      expect(casualJoinTemplate.metadata.id).toBe("casual-join");
      expect(casualJoinTemplate.metadata.name).toBe("Casual Join");
      expect(casualJoinTemplate.metadata.category).toBe("social");
      expect(casualJoinTemplate.metadata.isBuiltIn).toBe(true);
    });

    it("has fewer required fields", () => {
      const requiredFields = casualJoinTemplate.fields.filter((f) => f.required);
      expect(requiredFields.length).toBeLessThan(
        generalApplicationTemplate.fields.filter((f) => f.required).length
      );
    });

    it("includes games played field", () => {
      const gamesField = casualJoinTemplate.fields.find(
        (f) => f.label === "Games You Play"
      );
      expect(gamesField).toBeDefined();
      expect(gamesField?.inputType).toBe("multiselect");
      expect(gamesField?.options?.length).toBeGreaterThan(0);
    });

    it("includes about yourself field", () => {
      const aboutField = casualJoinTemplate.fields.find(
        (f) => f.label === "Tell us about yourself"
      );
      expect(aboutField).toBeDefined();
      expect(aboutField?.inputType).toBe("textarea");
    });

    it("character name is optional", () => {
      const charField = casualJoinTemplate.fields.find(
        (f) => f.label === "Character Name"
      );
      expect(charField?.required).toBe(false);
    });

    it("includes discord username field", () => {
      const discordField = casualJoinTemplate.fields.find(
        (f) => f.label === "Discord Username"
      );
      expect(discordField).toBeDefined();
      expect(discordField?.inputType).toBe("text");
      expect(discordField?.required).toBe(false);
    });
  });

  describe("builtInTemplates", () => {
    it("contains all three templates", () => {
      expect(builtInTemplates).toHaveLength(3);
    });

    it("includes general application", () => {
      expect(builtInTemplates).toContain(generalApplicationTemplate);
    });

    it("includes raid recruitment", () => {
      expect(builtInTemplates).toContain(raidRecruitmentTemplate);
    });

    it("includes casual join", () => {
      expect(builtInTemplates).toContain(casualJoinTemplate);
    });

    it("all templates have unique IDs", () => {
      const ids = builtInTemplates.map((t) => t.metadata.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all templates are marked as built-in", () => {
      for (const template of builtInTemplates) {
        expect(template.metadata.isBuiltIn).toBe(true);
      }
    });
  });

  describe("getBuiltInTemplate", () => {
    it("returns general application by id", () => {
      const template = getBuiltInTemplate("general-application");
      expect(template).toBe(generalApplicationTemplate);
    });

    it("returns raid recruitment by id", () => {
      const template = getBuiltInTemplate("raid-recruitment");
      expect(template).toBe(raidRecruitmentTemplate);
    });

    it("returns casual join by id", () => {
      const template = getBuiltInTemplate("casual-join");
      expect(template).toBe(casualJoinTemplate);
    });

    it("returns undefined for unknown id", () => {
      const template = getBuiltInTemplate("unknown-template");
      expect(template).toBeUndefined();
    });

    it("returns undefined for empty id", () => {
      const template = getBuiltInTemplate("");
      expect(template).toBeUndefined();
    });
  });

  describe("getBuiltInTemplatesByCategory", () => {
    it("returns guild templates", () => {
      const templates = getBuiltInTemplatesByCategory("guild");
      expect(templates).toContain(generalApplicationTemplate);
      expect(templates.every((t) => t.metadata.category === "guild")).toBe(true);
    });

    it("returns recruitment templates", () => {
      const templates = getBuiltInTemplatesByCategory("recruitment");
      expect(templates).toContain(raidRecruitmentTemplate);
      expect(templates.every((t) => t.metadata.category === "recruitment")).toBe(true);
    });

    it("returns social templates", () => {
      const templates = getBuiltInTemplatesByCategory("social");
      expect(templates).toContain(casualJoinTemplate);
      expect(templates.every((t) => t.metadata.category === "social")).toBe(true);
    });

    it("returns empty array for custom category", () => {
      const templates = getBuiltInTemplatesByCategory("custom");
      expect(templates).toHaveLength(0);
    });
  });
});

describe("Template Field Validation", () => {
  it("all template fields have valid input types", () => {
    const validInputTypes = [
      "text",
      "textarea",
      "number",
      "checkbox",
      "select",
      "multiselect",
      "date",
      "file",
    ];

    for (const template of builtInTemplates) {
      for (const field of template.fields) {
        expect(validInputTypes).toContain(field.inputType);
      }
    }
  });

  it("all template fields have labels", () => {
    for (const template of builtInTemplates) {
      for (const field of template.fields) {
        expect(field.label).toBeTruthy();
        expect(typeof field.label).toBe("string");
      }
    }
  });

  it("select/multiselect fields have options", () => {
    for (const template of builtInTemplates) {
      for (const field of template.fields) {
        if (field.inputType === "select" || field.inputType === "multiselect") {
          expect(field.options).toBeDefined();
          expect(Array.isArray(field.options)).toBe(true);
          expect(field.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("all options have value and label", () => {
    for (const template of builtInTemplates) {
      for (const field of template.fields) {
        if (field.options) {
          for (const option of field.options) {
            expect(option.value).toBeTruthy();
            expect(option.label).toBeTruthy();
          }
        }
      }
    }
  });
});
