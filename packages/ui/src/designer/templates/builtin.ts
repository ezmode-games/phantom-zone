/**
 * Built-in Form Templates (PZ-106)
 *
 * Pre-built templates for common guild application needs.
 */

import type { FormTemplate, TemplateField } from "./types";

// -----------------------------------------------------------------------------
// Common Field Definitions
// -----------------------------------------------------------------------------

const characterNameField: TemplateField = {
  inputType: "text",
  label: "Character Name",
  name: "characterName",
  placeholder: "Enter your main character name",
  helpText: "Your primary character that you'll be playing",
  required: true,
};

const serverField: TemplateField = {
  inputType: "text",
  label: "Server/Realm",
  name: "server",
  placeholder: "e.g., Area 52, Illidan, Stormrage",
  helpText: "The server your character is on",
  required: true,
};

const classField: TemplateField = {
  inputType: "select",
  label: "Class",
  name: "class",
  helpText: "Select your character class",
  required: true,
  options: [
    { value: "warrior", label: "Warrior" },
    { value: "paladin", label: "Paladin" },
    { value: "hunter", label: "Hunter" },
    { value: "rogue", label: "Rogue" },
    { value: "priest", label: "Priest" },
    { value: "shaman", label: "Shaman" },
    { value: "mage", label: "Mage" },
    { value: "warlock", label: "Warlock" },
    { value: "monk", label: "Monk" },
    { value: "druid", label: "Druid" },
    { value: "demon_hunter", label: "Demon Hunter" },
    { value: "death_knight", label: "Death Knight" },
    { value: "evoker", label: "Evoker" },
  ],
};

const roleField: TemplateField = {
  inputType: "select",
  label: "Primary Role",
  name: "role",
  helpText: "The role you prefer to play",
  required: true,
  options: [
    { value: "tank", label: "Tank" },
    { value: "healer", label: "Healer" },
    { value: "melee_dps", label: "Melee DPS" },
    { value: "ranged_dps", label: "Ranged DPS" },
  ],
};

const scheduleField: TemplateField = {
  inputType: "multiselect",
  label: "Available Days",
  name: "schedule",
  helpText: "Select all days you're typically available to play",
  required: true,
  options: [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ],
};

const whyJoinField: TemplateField = {
  inputType: "textarea",
  label: "Why do you want to join?",
  name: "whyJoin",
  placeholder: "Tell us about yourself and why you'd like to join our guild",
  helpText: "Help us get to know you better",
  required: true,
};

// -----------------------------------------------------------------------------
// General Application Template
// -----------------------------------------------------------------------------

/**
 * General Application template for guild recruitment.
 * Fields: Character, Server, Class, Role, Schedule, Why Join
 */
export const generalApplicationTemplate: FormTemplate = {
  metadata: {
    id: "general-application",
    name: "General Application",
    description: "A versatile application form suitable for most guilds. Collects character info, role preferences, and availability.",
    category: "guild",
    icon: "file-text",
    isBuiltIn: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  title: "Guild Application",
  description: "Apply to join our guild! Please fill out all required fields.",
  fields: [
    characterNameField,
    serverField,
    classField,
    roleField,
    scheduleField,
    whyJoinField,
  ],
};

// -----------------------------------------------------------------------------
// Raid Recruitment Template
// -----------------------------------------------------------------------------

const raidExperienceField: TemplateField = {
  inputType: "textarea",
  label: "Raid Experience",
  name: "raidExperience",
  placeholder: "List your previous raid experience and progression",
  helpText: "Include bosses killed, difficulty levels (Normal/Heroic/Mythic), and any notable achievements",
  required: true,
};

const logsLinkField: TemplateField = {
  inputType: "text",
  label: "Warcraft Logs Link",
  name: "logsLink",
  placeholder: "https://www.warcraftlogs.com/character/...",
  helpText: "Link to your Warcraft Logs profile (optional but highly recommended)",
  required: false,
};

const mythicPlusScoreField: TemplateField = {
  inputType: "number",
  label: "Mythic+ Score",
  name: "mythicPlusScore",
  placeholder: "e.g., 2500",
  helpText: "Your current Mythic+ rating (Raider.IO score)",
  required: false,
  config: {
    min: 0,
    max: 5000,
  },
};

const raidTimesField: TemplateField = {
  inputType: "textarea",
  label: "Raid Availability",
  name: "raidTimes",
  placeholder: "e.g., Tues/Wed/Thurs 8pm-11pm EST",
  helpText: "Our raid times are [times]. Can you make these consistently?",
  required: true,
};

/**
 * Raid Recruitment template for competitive guilds.
 * Fields: All general fields + Raid Experience, Logs Link, M+ Score
 */
export const raidRecruitmentTemplate: FormTemplate = {
  metadata: {
    id: "raid-recruitment",
    name: "Raid Recruitment",
    description: "Detailed application for raiding guilds. Includes performance metrics and raid experience.",
    category: "recruitment",
    icon: "swords",
    isBuiltIn: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  title: "Raid Team Application",
  description: "Apply to join our raid team! We review all applications and logs carefully.",
  fields: [
    characterNameField,
    serverField,
    classField,
    roleField,
    raidExperienceField,
    logsLinkField,
    mythicPlusScoreField,
    raidTimesField,
    whyJoinField,
  ],
};

// -----------------------------------------------------------------------------
// Casual Join Template
// -----------------------------------------------------------------------------

const gamesPlayedField: TemplateField = {
  inputType: "multiselect",
  label: "Games You Play",
  name: "gamesPlayed",
  helpText: "Select all games you're currently playing",
  required: true,
  options: [
    { value: "wow_retail", label: "WoW Retail" },
    { value: "wow_classic", label: "WoW Classic" },
    { value: "ff14", label: "Final Fantasy XIV" },
    { value: "eso", label: "Elder Scrolls Online" },
    { value: "gw2", label: "Guild Wars 2" },
    { value: "lost_ark", label: "Lost Ark" },
    { value: "other", label: "Other" },
  ],
};

const aboutYourselfField: TemplateField = {
  inputType: "textarea",
  label: "Tell us about yourself",
  name: "aboutYourself",
  placeholder: "What do you enjoy doing in-game? What are you looking for in a guild?",
  helpText: "We're a casual community, so no pressure! Just tell us a bit about yourself.",
  required: true,
};

const discordUsernameField: TemplateField = {
  inputType: "text",
  label: "Discord Username",
  name: "discordUsername",
  placeholder: "username#1234 or just username",
  helpText: "So we can reach out to you",
  required: false,
};

/**
 * Casual Join template for social/casual guilds.
 * Fields: Character, Server, Games, About Yourself
 */
export const casualJoinTemplate: FormTemplate = {
  metadata: {
    id: "casual-join",
    name: "Casual Join",
    description: "Simple form for casual/social guilds. Low barrier to entry, focused on getting to know new members.",
    category: "social",
    icon: "users",
    isBuiltIn: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  title: "Join Our Community",
  description: "Welcome! We're happy you're interested in joining. Just fill out this quick form.",
  fields: [
    { ...characterNameField, helpText: "Your in-game name (optional if you play multiple games)", required: false },
    { ...serverField, required: false, helpText: "If applicable" },
    gamesPlayedField,
    aboutYourselfField,
    discordUsernameField,
  ],
};

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

/**
 * All built-in templates.
 */
export const builtInTemplates: FormTemplate[] = [
  generalApplicationTemplate,
  raidRecruitmentTemplate,
  casualJoinTemplate,
];

/**
 * Get a built-in template by ID.
 */
export function getBuiltInTemplate(id: string): FormTemplate | undefined {
  return builtInTemplates.find((t) => t.metadata.id === id);
}

/**
 * Get built-in templates by category.
 */
export function getBuiltInTemplatesByCategory(category: FormTemplate["metadata"]["category"]): FormTemplate[] {
  return builtInTemplates.filter((t) => t.metadata.category === category);
}
