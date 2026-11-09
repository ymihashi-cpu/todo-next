export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

const STORAGE_KEY = "todo-next:todos";
const EMPTY: Todo[] = [];

let cache: Todo[] | null = null;
const listeners = new Set<() => void>();

function load(): Todo[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Todo[]) : [];
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

export function addTodo(title: string) {
  const todo: Todo = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: Date.now(),
  };
  save([todo, ...getSnapshot()]);
}

export function toggleTodo(id: string) {
  save(
    getSnapshot().map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    ),
  );
}

export function updateTodo(id: string, title: string) {
  save(getSnapshot().map((t) => (t.id === id ? { ...t, title } : t)));
}

export function deleteTodo(id: string) {
  save(getSnapshot().filter((t) => t.id !== id));
}

export function clearCompleted() {
  save(getSnapshot().filter((t) => !t.completed));
}

export function toggleAll() {
  const todos = getSnapshot();
  const allDone = todos.length > 0 && todos.every((t) => t.completed);
  save(todos.map((t) => ({ ...t, completed: !allDone })));
}
