import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Nav from "@/components/Nav";
import { PwaInstall } from "@/components/PwaInstall";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="pb-20 md:ml-56 md:pb-8">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">{children}</div>
      </main>
      <PwaInstall />
    </div>
  );
}
