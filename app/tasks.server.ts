/**
 * Server-only data layer for the task board.
 *
 * Every function is scoped to a `userEmail` so people only ever see and touch
 * their own data (the authenticated identity comes from `getUser`, see
 * CLAUDE.md → "Authenticated user"). The `.server.ts` suffix keeps this and the
 * Prisma client out of the browser bundle.
 */
import { db } from "./db.server";
import {
  type Priority,
  type SerializedProject,
  type SerializedTask,
  type Status,
  isPriority,
  isStatus,
} from "./types";

/** Convert a `yyyy-mm-dd` form value to a Date (UTC midnight) or null. */
function parseDueDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convert a stored Date back to the `yyyy-mm-dd` a date input expects. */
function formatDueDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  position: number;
  projectId: string | null;
  createdAt: Date;
}

function serializeTask(task: TaskRow): SerializedTask {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    status: isStatus(task.status) ? task.status : "todo",
    priority: isPriority(task.priority) ? task.priority : "medium",
    dueDate: formatDueDate(task.dueDate),
    position: task.position,
    projectId: task.projectId,
    createdAt: task.createdAt.toISOString(),
  };
}

/** Load the board: the user's projects plus their tasks (optionally filtered). */
export async function getBoard(
  userEmail: string,
  projectId?: string | null,
): Promise<{ projects: SerializedProject[]; tasks: SerializedTask[] }> {
  const [projects, tasks] = await Promise.all([
    db.project.findMany({
      where: { userEmail },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true },
    }),
    db.task.findMany({
      where: {
        userEmail,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    projects: projects as SerializedProject[],
    tasks: (tasks as TaskRow[]).map(serializeTask),
  };
}

export async function createTask(input: {
  userEmail: string;
  title: string;
  priority: string;
  dueDate: FormDataEntryValue | null;
  projectId: string | null;
}): Promise<void> {
  const title = input.title.trim();
  if (!title) return;

  await db.task.create({
    data: {
      title,
      priority: isPriority(input.priority) ? input.priority : "medium",
      dueDate: parseDueDate(input.dueDate),
      projectId: input.projectId || null,
      status: "todo",
      userEmail: input.userEmail,
    },
  });
}

/** Move a task to a different status column. */
export async function moveTask(input: {
  userEmail: string;
  id: string;
  status: Status;
}): Promise<void> {
  await db.task.updateMany({
    where: { id: input.id, userEmail: input.userEmail },
    data: { status: input.status },
  });
}

/** Edit a task's fields. Only provided values change. */
export async function updateTask(input: {
  userEmail: string;
  id: string;
  title?: string;
  notes?: string | null;
  priority?: string;
  status?: string;
  dueDate?: FormDataEntryValue | null;
  projectId?: string | null;
}): Promise<void> {
  const data: Record<string, unknown> = {};

  if (typeof input.title === "string" && input.title.trim()) {
    data.title = input.title.trim();
  }
  if (input.notes !== undefined) {
    data.notes = input.notes && input.notes.trim() ? input.notes.trim() : null;
  }
  if (input.priority !== undefined && isPriority(input.priority)) {
    data.priority = input.priority;
  }
  if (input.status !== undefined && isStatus(input.status)) {
    data.status = input.status;
  }
  if (input.dueDate !== undefined) {
    data.dueDate = parseDueDate(input.dueDate);
  }
  if (input.projectId !== undefined) {
    data.projectId = input.projectId || null;
  }

  if (Object.keys(data).length === 0) return;

  await db.task.updateMany({
    where: { id: input.id, userEmail: input.userEmail },
    data,
  });
}

export async function deleteTask(input: {
  userEmail: string;
  id: string;
}): Promise<void> {
  await db.task.deleteMany({
    where: { id: input.id, userEmail: input.userEmail },
  });
}

export async function createProject(input: {
  userEmail: string;
  name: string;
  color: string;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) return;

  await db.project.create({
    data: {
      name,
      color: /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : "#5b5bd6",
      userEmail: input.userEmail,
    },
  });
}

export async function deleteProject(input: {
  userEmail: string;
  id: string;
}): Promise<void> {
  // Tasks keep existing; their projectId is set null by the FK (onDelete: SetNull).
  await db.project.deleteMany({
    where: { id: input.id, userEmail: input.userEmail },
  });
}
