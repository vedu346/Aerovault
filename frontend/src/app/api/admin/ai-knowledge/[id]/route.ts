import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type KnowledgePayload = {
  question?: string;
  answer?: string;
  category?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return auth.error;
    }

    const { id } = await params;
    const body = (await req.json()) as KnowledgePayload;
    const question = body.question?.trim();
    const answer = body.answer?.trim();
    const category = body.category?.trim() || "general";

    if (!question || !answer) {
      return NextResponse.json(
        { error: "question and answer are required" },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from("ai_knowledge")
      .update({ question, answer, category })
      .eq("id", id)
      .select("id, question, answer, category, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("PUT /api/admin/ai-knowledge/:id failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return auth.error;
    }

    const { id } = await params;

    const { error } = await auth.supabase.from("ai_knowledge").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/ai-knowledge/:id failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
