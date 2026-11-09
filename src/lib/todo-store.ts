export type Priority = "high" | "medium" | "low";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  tags: string[];
  priority: Priority;
  /** YYYY-MM-DD(ローカル日付)。未設定なら null */
  due: string | null;
};

export type TodoInput = Pick<Todo, "title" | "tags" | "priority" | "due">;

const STORAGE_KEY = "todo-next:todos";
const EMPTY: Todo[] = [];
const PRIORITIES: Priority[] = ["high", "medium", "low"];

let cache: Todo[] | null = null;
const listeners = new Set<() => void>();

/** 旧バージョンのデータ(tags などが無い)も読めるように補完する */
function normalize(raw: unknown): Todo | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<Todo>;
  if (typeof t.id !== "string" || typeof t.title !== "string") return null;
  return {
    id: t.id,
    title: t.title,
    completed: Boolean(t.completed),
    createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    tags: Array.isArray(t.tags) ? t.tags.filter((x) => typeof x === "string") : [],
    priority: PRIORITIES.includes(t.priority as Priority) ? (t.priority as Priority) : "medium",
    due: typeof t.due === "string" && t.due ? t.due : null,
  };
}

function load(): Todo[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((t): t is Todo => t !== null);
  } catch {
    return [];
  }
}

function save(todos: Todo[]) {
  cache = todos;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // ストレージが使えない環境ではメモリ上のみで保持
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): Todo[] {
  if (cache === null) cache = load();
  return cache;
}

export function getServerSnapshot(): Todo[] {
  return EMPTY;
}

/** "a b  #c" → ["a", "b", "c"](重複除去) */
export function parseTags(text: string): string[] {
  const tags = text
    .split(/[\s　]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
  return [...new Set(tags)];
}

export function addTodo(input: TodoInput) {
  const todo: Todo = {
    id: crypto.randomUUID(),
    completed: false,
    createdAt: Date.now(),
    ...input,
  };
  save([...getSnapshot(), todo]);
}

export function updateTodo(id: string, patch: Partial<TodoInput>) {
  save(getSnapshot().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function toggleTodo(id: string) {
  save(
    getSnapshot().map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    ),
  );
}

export function deleteTodo(id: string) {
  save(getSnapshot().filter((t) => t.id !== id));
}

export function setAllCompleted(completed: boolean) {
  save(getSnapshot().map((t) => ({ ...t, completed })));
}

/** id の項目を targetId の前/後ろへ移動する(手動並び順) */
export function moveTodo(id: string, targetId: string, place: "before" | "after") {
  if (id === targetId) return;
  const todos = getSnapshot();
  const item = todos.find((t) => t.id === id);
  if (!item) return;
  const rest = todos.filter((t) => t.id !== id);
  const targetIndex = rest.findIndex((t) => t.id === targetId);
  if (targetIndex < 0) return;
  const index = place === "before" ? targetIndex : targetIndex + 1;
  save([...rest.slice(0, index), item, ...rest.slice(index)]);
}
