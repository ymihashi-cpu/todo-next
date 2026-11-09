import TodoApp from "./todo-app";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-4 py-16 dark:bg-black">
      <h1 className="text-4xl font-bold tracking-tight">TODO リスト</h1>
      <TodoApp />
      <p className="text-xs text-zinc-500">
        ダブルクリックで編集 ・ データはブラウザに保存されます
      </p>
    </main>
  );
}
