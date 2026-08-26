/** Converts a persisted deadline into the browser-local value used by an HTML date input. */
export function getWorkspaceTaskDueDateInput(dueAt: Date | string | null | undefined): string {
  if (!dueAt) return "";
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a date-input value as the start of that local calendar day before tRPC serializes it to UTC. */
export function parseWorkspaceTaskDueDate(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/** Allows a deadline update only when the local date input represents a changed, valid value. */
export function canSaveWorkspaceTaskDueDate({ initialDueAt, draftDate, isSaving }: { initialDueAt: Date | string | null | undefined; draftDate: string; isSaving: boolean }): boolean {
  if (isSaving || getWorkspaceTaskDueDateInput(initialDueAt) === draftDate) return false;
  return draftDate === "" || parseWorkspaceTaskDueDate(draftDate) !== null;
}

/** Formats the persisted deadline for the active interface locale without changing its stored value. */
export function formatWorkspaceTaskDueDate(dueAt: Date | string, language: "ar" | "en"): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", { dateStyle: "medium" }).format(new Date(dueAt));
}
