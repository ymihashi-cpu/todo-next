"use client";

import { useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import {
  deleteTodo,
  parseTags,
  toggleTodo,
  updateTodo,
  type Priority,
  type Todo,
} from "@/lib/todo-store";

export type DropPlace = "before" | "after";

const PRIORITY_BADGE: Record<Priority, { label: string; className: string }> = {
  high: { label: "高", className: "border-red-500 text-red-600 dark:text-red-400" },
  medium: { label: "中", className: "border-amber-500 text-amber-600 dark:text-amber-400" },
  low: { label: "低", className: "border-zinc-400 text-zinc-500" },
};

function todayString() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatDue(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  return y === new Date().getFullYear() ? `${m}/${d}` : `${y}/${m}/${d}`;
}

function placeFromY(el: Element, clientY: number): DropPlace {
  const rect = el.getBoundingClientRect();
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

type Props = {
  todo: Todo;
  canReorder: boolean;
  dragging: boolean;
  dropPlace: DropPlace | null;
  onDragStart: () => void;
  onDragOver: (place: DropPlace) => void;
  onDragOverItem: (id: string, place: DropPlace) => void;
  onDragEnd: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
};

export default function TodoItem({
  todo,
  canReorder,
  dragging,
  dropPlace,
  onDragStart,
  onDragOver,
  onDragOverItem,
  onDragEnd,
  onKeyDown,
}: Props) {
  const [editing, setEditing] = useState(false);

  const today = todayString();
  const overdue = !todo.completed && todo.due !== null && todo.due < today;
  const dueToday = !todo.completed && todo.due === today;
  const badge = PRIORITY_BADGE[todo.priority];
  const draggable = canReorder && !editing;

  // マウス:行全体を HTML5 ドラッグ
  function handleDragStart(e: DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", todo.id);
    onDragStart();
  }
  function handleDragOver(e: DragEvent) {
    if (!canReorder) return;
    e.preventDefault();
    onDragOver(placeFromY(e.currentTarget, e.clientY));
  }

  // タッチ:左端のつまみをポインターイベントでドラッグ
  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "mouse" || !canReorder) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragStart();
  }
  function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "mouse" || !dragging) return;
    const li = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-todo-id]");
    if (li?.dataset.todoId) onDragOverItem(li.dataset.todoId, placeFromY(li, e.clientY));
  }
  function handlePointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "mouse" || !dragging) return;
    onDragEnd();
  }

  return (
    <li
      data-todo-id={todo.id}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onKeyDown={editing ? undefined : onKeyDown}
      className={`relative border-b border-l-4 border-b-zinc-200 last:border-b-0 dark:border-b-zinc-800 ${
        overdue ? "border-l-red-500" : dueToday ? "border-l-amber-400" : "border-l-transparent"
      } ${dragging ? "opacity-40" : ""}`}
    >
      {dropPlace && (
        <span
          className={`pointer-events-none absolute inset-x-0 h-0.5 bg-blue-500 ${
            dropPlace === "before" ? "-top-px" : "-bottom-px"
          }`}
        />
      )}

      {editing ? (
        <EditForm todo={todo} onClose={() => setEditing(false)} />
      ) : (
        <div className="flex items-center gap-3 py-3 pr-3 pl-2">
          <button
            type="button"
            aria-label="ドラッグして並び替え"
            disabled={!canReorder}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="cursor-grab touch-none px-1 text-zinc-400 select-none disabled:cursor-default disabled:opacity-30"
          >
            ⠿
          </button>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
            aria-label={`「${todo.title}」を完了にする`}
            className="size-4 shrink-0 accent-blue-600"
          />
          <span
            className={`shrink-0 rounded-full border px-1.5 text-xs leading-5 ${badge.className}`}
            title={`優先度 ${badge.label}`}
          >
            {badge.label}
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`break-all ${todo.completed ? "text-zinc-400 line-through" : ""}`}
            >
              {todo.title}
            </span>
            {todo.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-zinc-100 px-1.5 text-xs leading-5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                #{tag}
              </span>
            ))}
          </div>
          {todo.due && (
            <span
              className={`shrink-0 rounded-full border px-2 text-xs leading-5 ${
                overdue
                  ? "border-red-500 text-red-600 dark:text-red-400"
                  : dueToday
                    ? "border-amber-500 text-amber-600 dark:text-amber-400"
                    : "border-zinc-300 text-zinc-500 dark:border-zinc-600"
              }`}
            >
              {overdue ? "期限切れ " : dueToday ? "今日 " : "期限 "}
              {formatDue(todo.due)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 px-1 text-sm text-zinc-500 hover:text-blue-600"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => deleteTodo(todo.id)}
            className="shrink-0 px-1 text-sm text-zinc-500 hover:text-red-600"
          >
            削除
          </button>
        </div>
      )}
    </li>
  );
}

const editField =
  "rounded border border-zinc-300 bg-white px-2 py-1 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900";

function EditForm({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const [title, setTitle] = useState(todo.title);
  const [tagText, setTagText] = useState(todo.tags.join(" "));
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [due, setDue] = useState(todo.due ?? "");

  function save() {
    const t = title.trim();
    if (!t) return;
    updateTodo(todo.id, { title: t, tags: parseTags(tagText), priority, due: due || null });
    onClose();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="flex flex-col gap-2 p-3"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="タイトル"
        className={editField}
      />
      <div className="flex flex-wrap gap-2">
        <input
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          placeholder="タグ(スペース区切り)"
          aria-label="タグ"
          className={`${editField} min-w-0 flex-1 basis-32`}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          aria-label="優先度"
          className={editField}
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
          className={editField}
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
