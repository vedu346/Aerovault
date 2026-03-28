import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { AiTrainingManagement } from "@/components/admin/ai-training-management";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    if (profile?.role === "flight_company") {
      redirect("/airline/dashboard");
    }

    redirect("/user");
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-bg-2.jpg')" }}
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />

      <Navbar />
      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-lg">
          AI Training Center
        </h1>
        <p className="mb-8 text-sm text-white/80">
          Manage Q&A knowledge to continuously train the AeroVault AI assistant.
        </p>

        <AiTrainingManagement />
      </main>
    </div>
  );
}
