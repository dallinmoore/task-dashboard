// Shared, client-safe types. No server-only imports here so this can be used
// in both loaders/actions and components.

export const STATUSES = ["todo", "doing", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Human-facing labels for each column / status value. */
export const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** A task as sent to the browser — dates are ISO strings, never Date objects. */
export interface SerializedTask {
  id: string;
  title: string;
  notes: string | null;
  status: Status;
  priority: Priority;
  dueDate: string | null; // ISO date (yyyy-mm-dd) or null
  position: number;
  projectId: string | null;
  createdAt: string;
}

export interface SerializedProject {
  id: string;
  name: string;
  color: string;
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}
