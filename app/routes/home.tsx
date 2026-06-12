import type { Route } from "./+types/home";
import { useUser } from "../hooks/use-user";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Template Application" },
    { name: "description", content: "A starter template application." },
  ];
}

export default function Home() {
  // The signed-in user comes from the root loader (Traefik in prod, the dev
  // fallback locally). See CLAUDE.md → "Authenticated user".
  const user = useUser();
  const name = user.email.split("@")[0];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-semibold">Hello {name} 👋</h1>
      <p className="text-gray-500">This is a template application.</p>
      <p className="text-sm text-gray-400">Signed in as {user.email}</p>
    </main>
  );
}
