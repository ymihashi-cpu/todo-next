"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  addTodo,
  getServerSnapshot,
  getSnapshot,
  moveTodo,
  parseTags,
  setAllCompleted,
  subscribe,
  type Priority,
  type Todo,
} from "@/lib/todo-store";
import TodoItem, { type DropPlace } from "./todo-item";

type Filter = "all" | "active" | "completed";
type Sort = "manual" | "due" | "priority" | "created";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "active", label: "未完了" },
  { value: "completed", label: "完了" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "manual", label: "手動" },
  { value: "due", label: "期限順" },
  { value: "priority", label: "優先度順" },
  { value: "created", label: "新しい順" },
];

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const fieldClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900";

function sortTodos(todos: Todo[], sort: Sort): Todo[] {
  if (sort === "manual") return todos;
  const order = new Map(todos.map((t, i) => [t.id, i]));
  const byManual = (a: Todo, b: Todo) => order.get(a.id)! - order.get(b.id)!;
  return [...todos].sort((a, b) => {
    if (sort === "due") {
      if (a.due !== b.due) {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due < b.due ? -1 : 1;
      }
      return byManual(a, b);
    }
    if (sort === "priority") {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byManual(a, b);
    }
    return b.createdAt - a.createdAt;
  });
}

export default function TodoApp() {
  const todos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [title, setTitle] = useState("");
  const [tagText, setTagText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("manual");

  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; place: DropPlace } | null>(null);

  const activeCount = todos.filter((t) => !t.completed).length;
  const allDone = todos.length > 0 && activeCount === 0;
  const canReorder = sort === "manual";

  const q = query.trim().toLowerCase().replace(/^#/, "");
  const visible = sortTodos(todos, sort).filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    addTodo({ title: t, tags: parseTags(tagText), priority, due: due || null });
    setTitle("");
    setTagText("");
    setPriority("medium");
    setDue("");
  }

  function finishDrag() {
    if (dragId && drop) moveTodo(dragId, drop.id, drop.place);
    setDragId(null);
    setDrop(null);
  }

  function handleItemKeyDown(e: KeyboardEvent, index: number) {
    if (!e.altKey || !canReorder) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const id = visible[index].id;
    if (e.key === "ArrowUp" && index > 0) moveTodo(id, visible[index - 1].id, "before");
    if (e.key === "ArrowDown" && index < visible.length - 1)
      moveTodo(id, visible[index + 1].id, "after");
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-5">
      <h1 className="text-3xl font-bold tracking-tight">ToDo</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="やることを入力して Enter"
          aria-label="やること"
          className={`${fieldClass} py-3`}
        />
        <div className="flex flex-wrap gap-2">
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="タグ(スペース区切り)"
            aria-label="タグ"
            className={`${fieldClass} min-w-0 flex-1 basis-40`}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            aria-label="優先度"
            className={fieldClass}
          >
            <option value="high">優先度 高</option>
            <option value="medium">優先度 中</option>
            <option value="low">優先度 低</option>
          </select>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label="期限"
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトルやタグで検索"
            aria-label="検索"
            className={`${fieldClass} w-full`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allDone}
              disabled={todos.length === 0}
              onChange={() => setAllCompleted(!allDone)}
              className="size-4 accent-blue-600"
            />
            すべて完了
          </label>
          <label className="flex items-center gap-2">
            並び順
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`rounded-full border px-3 py-1 ${
                  filter === f.value
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="border-t border-zinc-200 dark:border-zinc-800">
          {visible.map((todo, i) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              canReorder={canReorder}
              dragging={dragId === todo.id}
              dropPlace={drop?.id === todo.id && dragId !== todo.id ? drop.place : null}
              onDragStart={() => setDragId(todo.id)}
              onDragOver={(place) => setDrop({ id: todo.id, place })}
              onDragOverItem={(id, place) => setDrop({ id, place })}
              onDragEnd={finishDrag}
              onKeyDown={(e) => handleItemKeyDown(e, i)}
            />
          ))}
          {visible.length === 0 && (
            <li className="p-6 text-center text-sm text-zinc-500">
              {todos.length === 0 ? "やることはまだありません" : "該当するやることはありません"}
            </li>
          )}
        </ul>

        <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          残り {activeCount} 件 / 全 {todos.length} 件
        </div>
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          {canReorder
            ? "ドラッグ(スマホでは左端のつまみ)、または Alt + ↑ ↓ キーで並び替えできます。"
            : "並び順が「手動」のときにドラッグで並び替えできます。"}
        </p>
      </section>
    </div>
  );
}
