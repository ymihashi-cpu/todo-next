"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  addTodo,
  clearCompleted,
  deleteTodo,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  toggleAll,
  toggleTodo,
  updateTodo,
  type Todo,
} from "@/lib/todo-store";

type Filter = "all" | "active" | "completed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "active", label: "未完了" },
  { value: "completed", label: "完了済み" },
];

export default function TodoApp() {
  const todos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - activeCount;
  const visible = todos.filter((t) =>
    filter === "all" ? true : filter === "active" ? !t.completed : t.completed,
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;
    addTodo(title);
    setInput("");
  }

  return (
    <div className="w-full max-w-xl rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
      <form onSubmit={handleSubmit} className="flex gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={toggleAll}
          disabled={todos.length === 0}
          aria-label="すべて完了/未完了を切り替え"
          className="rounded-lg px-2 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 dark:hover:text-zinc-200"
        >
          ✓
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="やることを入力..."
          aria-label="新しいTODO"
          className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          追加
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="p-8 text-center text-zinc-500">TODOはまだありません 🎉</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {visible.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
          {visible.length === 0 && (
            <li className="p-6 text-center text-sm text-zinc-500">該当するTODOはありません</li>
          )}
        </ul>
      )}

      {todos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
          <span>残り {activeCount} 件</span>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`rounded-md px-2 py-1 ${
                  filter === f.value
                    ? "bg-blue-600/10 font-medium text-blue-600 dark:text-blue-400"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={clearCompleted}
            disabled={completedCount === 0}
            className="hover:text-red-600 disabled:invisible"
          >
            完了済みを削除
          </button>
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  function commit() {
    const title = draft.trim();
    if (title) updateTodo(todo.id, title);
    else deleteTodo(todo.id);
    setEditing(false);
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => toggleTodo(todo.id)}
        aria-label={`「${todo.title}」を完了にする`}
        className="size-5 accent-blue-600"
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(todo.title);
              setEditing(false);
            }
          }}
          className="flex-1 rounded border border-blue-500 bg-transparent px-2 py-1 outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => {
            setDraft(todo.title);
            setEditing(true);
          }}
          title="ダブルクリックで編集"
          className={`flex-1 cursor-text break-all ${
            todo.completed ? "text-zinc-400 line-through" : ""
          }`}
        >
          {todo.title}
        </span>
      )}
      <button
        onClick={() => deleteTodo(todo.id)}
        aria-label={`「${todo.title}」を削除`}
        className="rounded px-2 text-zinc-400 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}
