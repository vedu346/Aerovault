"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type KnowledgeItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
};

type FormState = {
  question: string;
  answer: string;
  category: string;
};

const EMPTY_FORM: FormState = {
  question: "",
  answer: "",
  category: "general",
};

export function AiTrainingManagement() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai-knowledge", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load knowledge");
      }

      setItems(data.items || []);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to load AI knowledge");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    const question = form.question.trim();
    const answer = form.answer.trim();
    const category = form.category.trim() || "general";

    if (!question || !answer) {
      alert("Question and answer are required.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/admin/ai-knowledge/${editingId}`
        : "/api/admin/ai-knowledge";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, answer, category }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to save knowledge");
      }

      resetForm();
      await loadKnowledge();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Unable to save knowledge");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this knowledge item?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/ai-knowledge/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete knowledge");
      }

      if (editingId === id) {
        resetForm();
      }

      await loadKnowledge();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Unable to delete knowledge");
    }
  };

  const startEdit = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category || "general",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/30 bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">
            {isEditing ? "Edit AI Knowledge" : "Add AI Knowledge"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Question</label>
            <Input
              value={form.question}
              onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
              placeholder="Example: What is the baggage allowance?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Answer</label>
            <textarea
              value={form.answer}
              onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
              placeholder="Provide the answer the assistant should learn."
              className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-slate-950"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <Input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="general"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEditing ? "Save Changes" : "Add Knowledge"}
            </Button>
            {isEditing && (
              <Button variant="outline" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/30 bg-white/95 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-slate-500">
              No training entries found. Add your first knowledge record above.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{item.question}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {item.category || "general"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.answer}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => startEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-rose-600" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
