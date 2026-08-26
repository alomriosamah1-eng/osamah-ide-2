/**
 * @fileoverview Defines the executable workspace destinations exposed by the command palette.
 */

export type CommandPaletteLanguage = "ar" | "en";
export type WorkspaceCommandTarget = "programming" | "presentations" | "mind";

export type WorkspaceCommand = {
  title: string;
  detail: string;
  target: WorkspaceCommandTarget;
  icon: "code" | "presentation" | "mind";
};

const commandsByLanguage: Record<CommandPaletteLanguage, WorkspaceCommand[]> = {
  ar: [
    { title: "فتح مساحة البرمجة", detail: "انتقل إلى المشاريع والملفات والمهام", target: "programming", icon: "code" },
    { title: "فتح استوديو العروض", detail: "انتقل إلى العروض والشرائح المحفوظة", target: "presentations", icon: "presentation" },
    { title: "فتح العقل الثاني", detail: "انتقل إلى الملاحظات والروابط المعرفية", target: "mind", icon: "mind" },
  ],
  en: [
    { title: "Open programming workspace", detail: "Go to projects, files, and tasks", target: "programming", icon: "code" },
    { title: "Open presentation studio", detail: "Go to saved decks and slides", target: "presentations", icon: "presentation" },
    { title: "Open Second Mind", detail: "Go to notes and knowledge links", target: "mind", icon: "mind" },
  ],
};

/** Returns the concrete workspace commands available in the selected UI language. */
export function getWorkspaceCommands(language: CommandPaletteLanguage): WorkspaceCommand[] {
  return commandsByLanguage[language];
}

/** Matches a command query against both its visible title and explanatory detail. */
export function filterWorkspaceCommands(commands: WorkspaceCommand[], query: string): WorkspaceCommand[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return commands;
  return commands.filter(command => `${command.title} ${command.detail}`.toLocaleLowerCase().includes(normalizedQuery));
}
