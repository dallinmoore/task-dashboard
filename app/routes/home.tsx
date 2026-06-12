import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";

import type { Route } from "./+types/home";
import { getUser } from "../auth.server";
import {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getBoard,
  moveTask,
  updateTask,
} from "../tasks.server";
import { useUser } from "../hooks/use-user";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type Priority,
  type SerializedProject,
  type SerializedTask,
  type Status,
  isStatus,
} from "../types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Task board" },
    { name: "description", content: "Track your projects and tasks." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = getUser(request);
  const url = new URL(request.url);
  const projectId = url.searchParams.get("project");
  const { projects, tasks } = await getBoard(user.email, projectId);
  return { projects, tasks, activeProjectId: projectId };
}

export async function action({ request }: Route.ActionArgs) {
  const user = getUser(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const userEmail = user.email;

  switch (intent) {
    case "create-task":
      await createTask({
        userEmail,
        title: String(form.get("title") ?? ""),
        priority: String(form.get("priority") ?? "medium"),
        dueDate: form.get("dueDate"),
        projectId: String(form.get("projectId") ?? "") || null,
      });
      break;

    case "move-task": {
      const status = String(form.get("status") ?? "");
      if (isStatus(status)) {
        await moveTask({ userEmail, id: String(form.get("id") ?? ""), status });
      }
      break;
    }

    case "update-task":
      await updateTask({
        userEmail,
        id: String(form.get("id") ?? ""),
        title: String(form.get("title") ?? ""),
        notes: String(form.get("notes") ?? ""),
        priority: String(form.get("priority") ?? "medium"),
        status: String(form.get("status") ?? "todo"),
        dueDate: form.get("dueDate"),
        projectId: String(form.get("projectId") ?? "") || null,
      });
      break;

    case "delete-task":
      await deleteTask({ userEmail, id: String(form.get("id") ?? "") });
      break;

    case "create-project":
      await createProject({
        userEmail,
        name: String(form.get("name") ?? ""),
        color: String(form.get("color") ?? "#5b5bd6"),
      });
      break;

    case "delete-project":
      await deleteProject({ userEmail, id: String(form.get("id") ?? "") });
      break;
  }

  return { ok: true };
}

// --- Presentation tokens (literal classes so Tailwind keeps them) -----------

const STATUS_DOT: Record<Status, string> = {
  todo: "bg-slate-400",
  doing: "bg-amber-500",
  done: "bg-emerald-500",
};

const PRIORITY_BAR: Record<Priority, string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

const PROJECT_COLORS = [
  "#5b5bd6",
  "#0ea5e9",
  "#059669",
  "#d97706",
  "#e11d48",
  "#7c3aed",
  "#0891b2",
  "#64748b",
];

function formatDue(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// --- Page -------------------------------------------------------------------

export default function Home() {
  const { projects, tasks, activeProjectId } = useLoaderData<typeof loader>();
  const user = useUser();

  const [editing, setEditing] = useState<SerializedTask | null>(null);
  const [showProjects, setShowProjects] = useState(false);

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);

  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const total = tasks.length;
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && t.dueDate < today,
  ).length;
  const donePct = total === 0 ? 0 : Math.round((counts.done / total) * 100);

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#16181d]">
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Task board</h1>
            <p className="mt-0.5 text-sm text-[#6b7280]">
              Signed in as {user.email}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <Stat label="To do" value={counts.todo} dot={STATUS_DOT.todo} />
            <Stat label="In progress" value={counts.doing} dot={STATUS_DOT.doing} />
            <Stat label="Done" value={counts.done} dot={STATUS_DOT.done} />
            {overdue > 0 && (
              <Stat label="Overdue" value={overdue} dot="bg-rose-500" alert />
            )}
          </div>
        </header>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e6e8ec]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${donePct}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-medium tabular-nums text-[#6b7280]">
            {donePct}%
          </span>
        </div>

        {/* Project filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <ProjectChip to="?" label="All tasks" active={!activeProjectId} />
          {projects.map((p) => (
            <ProjectChip
              key={p.id}
              to={`?project=${p.id}`}
              label={p.name}
              color={p.color}
              active={activeProjectId === p.id}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowProjects((v) => !v)}
            className="ml-1 rounded-full border border-dashed border-[#cdd1d8] px-3 py-1 text-sm text-[#6b7280] transition hover:border-[#5b5bd6] hover:text-[#5b5bd6]"
          >
            {showProjects ? "Done" : "+ Project"}
          </button>
        </div>

        {showProjects && (
          <ProjectManager projects={projects} />
        )}

        {/* New task composer */}
        <TaskComposer projects={projects} activeProjectId={activeProjectId} />

        {/* Board */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STATUSES.map((status) => {
            const column = tasks.filter((t) => t.status === status);
            return (
              <div
                key={status}
                className="rounded-xl border border-[#e6e8ec] bg-white/60 p-3"
              >
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                  <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
                  <span className="text-xs tabular-nums text-[#9ca3af]">
                    {column.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {column.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-[#aab0ba]">
                      Nothing here yet.
                    </p>
                  )}
                  {column.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      project={
                        task.projectId ? projectsById.get(task.projectId) : undefined
                      }
                      today={today}
                      onEdit={() => setEditing(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {editing && (
        <EditDialog
          task={editing}
          projects={projects}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

// --- Components -------------------------------------------------------------

function Stat({
  label,
  value,
  dot,
  alert,
}: {
  label: string;
  value: number;
  dot: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-sm tabular-nums">
        <span className={`font-semibold ${alert ? "text-rose-600" : ""}`}>
          {value}
        </span>{" "}
        <span className="text-[#6b7280]">{label}</span>
      </span>
    </div>
  );
}

function ProjectChip({
  to,
  label,
  color,
  active,
}: {
  to: string;
  label: string;
  color?: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-[#16181d] bg-[#16181d] text-white"
          : "border-[#e6e8ec] bg-white text-[#374151] hover:border-[#cdd1d8]"
      }`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </Link>
  );
}

function ProjectManager({ projects }: { projects: SerializedProject[] }) {
  const fetcher = useFetcher();
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      formRef.current?.reset();
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="mb-5 rounded-xl border border-[#e6e8ec] bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">Projects</h3>

      {projects.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1.5">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="flex-1">{p.name}</span>
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="delete-project" />
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="rounded px-2 py-0.5 text-xs text-[#9ca3af] transition hover:bg-rose-50 hover:text-rose-600"
                >
                  Remove
                </button>
              </fetcher.Form>
            </li>
          ))}
        </ul>
      )}

      <fetcher.Form
        ref={formRef}
        method="post"
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="intent" value="create-project" />
        <input type="hidden" name="color" value={color} />
        <input
          name="name"
          required
          placeholder="New project name"
          className="min-w-[10rem] flex-1 rounded-lg border border-[#e6e8ec] px-3 py-1.5 text-sm outline-none focus:border-[#5b5bd6]"
        />
        <div className="flex items-center gap-1">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Use color ${c}`}
              className={`h-5 w-5 rounded-full transition ${
                color === c ? "ring-2 ring-[#16181d] ring-offset-1" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#16181d] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#2b2f37]"
        >
          Add project
        </button>
      </fetcher.Form>
    </div>
  );
}

function TaskComposer({
  projects,
  activeProjectId,
}: {
  projects: SerializedProject[];
  activeProjectId: string | null;
}) {
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      formRef.current?.reset();
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-[#e6e8ec] bg-white p-3"
    >
      <input type="hidden" name="intent" value="create-task" />
      <input
        name="title"
        required
        placeholder="Add a task…"
        className="min-w-[12rem] flex-1 rounded-lg border border-transparent bg-[#f6f7f9] px-3 py-2 text-sm outline-none focus:border-[#5b5bd6] focus:bg-white"
      />
      <select
        name="priority"
        defaultValue="medium"
        className="rounded-lg border border-[#e6e8ec] bg-white px-2 py-2 text-sm outline-none focus:border-[#5b5bd6]"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>
      <input
        type="date"
        name="dueDate"
        className="rounded-lg border border-[#e6e8ec] bg-white px-2 py-2 text-sm text-[#374151] outline-none focus:border-[#5b5bd6]"
      />
      <select
        name="projectId"
        defaultValue={activeProjectId ?? ""}
        className="rounded-lg border border-[#e6e8ec] bg-white px-2 py-2 text-sm outline-none focus:border-[#5b5bd6]"
      >
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={fetcher.state !== "idle"}
        className="rounded-lg bg-[#5b5bd6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4a4ac2] disabled:opacity-60"
      >
        Add task
      </button>
    </fetcher.Form>
  );
}

function TaskCard({
  task,
  project,
  today,
  onEdit,
}: {
  task: SerializedTask;
  project?: SerializedProject;
  today: string;
  onEdit: () => void;
}) {
  const moveFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  const index = STATUSES.indexOf(task.status);
  const prev = index > 0 ? STATUSES[index - 1] : null;
  const next = index < STATUSES.length - 1 ? STATUSES[index + 1] : null;
  const overdue = task.status !== "done" && task.dueDate && task.dueDate < today;
  const busy = deleteFetcher.state !== "idle";

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border border-[#e6e8ec] bg-white p-3 shadow-sm transition ${
        busy ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_BAR[task.priority]}`}
        title={`${PRIORITY_LABEL[task.priority]} priority`}
      />
      <div className="pl-1.5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={`text-left text-sm font-medium leading-snug ${
              task.status === "done" ? "text-[#9ca3af] line-through" : ""
            }`}
          >
            {task.title}
          </button>
          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="delete-task" />
            <input type="hidden" name="id" value={task.id} />
            <button
              type="submit"
              aria-label="Delete task"
              className="shrink-0 rounded p-0.5 text-[#c2c7d0] opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 3l8 8M11 3l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </deleteFetcher.Form>
        </div>

        {(task.dueDate || project) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  overdue ? "font-medium text-rose-600" : "text-[#6b7280]"
                }`}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <rect
                    x="1.5"
                    y="2.5"
                    width="9"
                    height="8"
                    rx="1.5"
                    stroke="currentColor"
                  />
                  <path d="M1.5 5h9M4 1.5v2M8 1.5v2" stroke="currentColor" />
                </svg>
                {formatDue(task.dueDate)}
              </span>
            )}
            {project && (
              <span className="flex items-center gap-1 text-[#6b7280]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </span>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-1">
          {prev ? (
            <MoveButton id={task.id} status={prev} fetcher={moveFetcher} dir="left">
              {STATUS_LABEL[prev]}
            </MoveButton>
          ) : (
            <span className="flex-1" />
          )}
          {next && (
            <MoveButton id={task.id} status={next} fetcher={moveFetcher} dir="right">
              {STATUS_LABEL[next]}
            </MoveButton>
          )}
        </div>
      </div>
    </div>
  );
}

function MoveButton({
  id,
  status,
  fetcher,
  dir,
  children,
}: {
  id: string;
  status: Status;
  fetcher: ReturnType<typeof useFetcher>;
  dir: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <fetcher.Form method="post" className={dir === "right" ? "ml-auto" : ""}>
      <input type="hidden" name="intent" value="move-task" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#6b7280] transition hover:bg-[#f1f2f4] hover:text-[#16181d]"
      >
        {dir === "left" && <span aria-hidden>←</span>}
        {children}
        {dir === "right" && <span aria-hidden>→</span>}
      </button>
    </fetcher.Form>
  );
}

function EditDialog({
  task,
  projects,
  onClose,
}: {
  task: SerializedTask;
  projects: SerializedProject[];
  onClose: () => void;
}) {
  const fetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const submitting = fetcher.state !== "idle";

  // Close once a save or delete round-trip completes.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) onClose();
  }, [fetcher.state, fetcher.data, onClose]);
  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data) onClose();
  }, [deleteFetcher.state, deleteFetcher.data, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Edit task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-[#9ca3af] transition hover:bg-[#f1f2f4] hover:text-[#16181d]"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <fetcher.Form method="post" className="flex flex-col gap-3">
          <input type="hidden" name="intent" value="update-task" />
          <input type="hidden" name="id" value={task.id} />

          <label className="block text-xs font-medium text-[#6b7280]">
            Title
            <input
              name="title"
              required
              defaultValue={task.title}
              className="mt-1 w-full rounded-lg border border-[#e6e8ec] px-3 py-2 text-sm text-[#16181d] outline-none focus:border-[#5b5bd6]"
            />
          </label>

          <label className="block text-xs font-medium text-[#6b7280]">
            Notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={task.notes ?? ""}
              placeholder="Add details…"
              className="mt-1 w-full resize-none rounded-lg border border-[#e6e8ec] px-3 py-2 text-sm text-[#16181d] outline-none focus:border-[#5b5bd6]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#6b7280]">
              Status
              <select
                name="status"
                defaultValue={task.status}
                className="mt-1 w-full rounded-lg border border-[#e6e8ec] bg-white px-2 py-2 text-sm text-[#16181d] outline-none focus:border-[#5b5bd6]"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#6b7280]">
              Priority
              <select
                name="priority"
                defaultValue={task.priority}
                className="mt-1 w-full rounded-lg border border-[#e6e8ec] bg-white px-2 py-2 text-sm text-[#16181d] outline-none focus:border-[#5b5bd6]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#6b7280]">
              Due date
              <input
                type="date"
                name="dueDate"
                defaultValue={task.dueDate ?? ""}
                className="mt-1 w-full rounded-lg border border-[#e6e8ec] bg-white px-2 py-2 text-sm text-[#16181d] outline-none focus:border-[#5b5bd6]"
              />
            </label>
            <label className="block text-xs font-medium text-[#6b7280]">
              Project
              <select
                name="projectId"
                defaultValue={task.projectId ?? ""}
                className="mt-1 w-full rounded-lg border border-[#e6e8ec] bg-white px-2 py-2 text-sm text-[#16181d] outline-none focus:border-[#5b5bd6]"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                deleteFetcher.submit(
                  { intent: "delete-task", id: task.id },
                  { method: "post" },
                )
              }
              className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f1f2f4]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#5b5bd6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4a4ac2] disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
