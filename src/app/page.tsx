import TodoApp from "./todo-app";

export default function Home() {
  return (
    <main className="flex flex-1 justify-center bg-zinc-100 px-4 py-10 dark:bg-black">
      <TodoApp />
    </main>
  );
}
