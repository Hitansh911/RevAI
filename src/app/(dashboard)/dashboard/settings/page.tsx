"use client";

import { useState, useEffect } from "react";
import { Sparkles, Save, Loader2, Plus, Minus, Trash } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { getBusinessProfile, saveBusinessProfile } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCategoryTheme } from "@/context/CategoryContext";
import type { BusinessCategory } from "@/types";
import { SUBCATEGORY_OPTIONS } from "@/types";

const CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "restaurant", label: "Food & Hospitality" },
  { value: "teaching_session", label: "Education & Training" },
];

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [questions, setQuestions] = useState<any[]>([]);
  const [sessionTopic, setSessionTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(5);
  const { theme, setCategory: setContextCategory } = useCategoryTheme();
  const isTeaching = category === "teaching_session";

  // Category-aware defaults
  const CATEGORY_DEFAULTS: Record<string, { placeholder: string; count: number }> = {
    restaurant: { placeholder: "e.g., Cafe Bruno, Downtown Grill... Describe the dining vibe.", count: 5 },
    teaching_session: { placeholder: "e.g., Advanced React Boot Camp, Physics 101... Describe the session topic.", count: 10 },
  };

  const activePlaceholder = CATEGORY_DEFAULTS[category]?.placeholder ?? "Describe your business context...";

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const biz = await getBusinessProfile(user.id);
        if (biz) {
          setBusinessName(biz.name);
          setCategory(biz.category);
          if (biz.questions) {
            setQuestions(biz.questions as any[]);
          }
        }
      } catch (e) {
        console.error("Failed to load business", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleGenerateQuestions = async () => {
    const topic = sessionTopic || businessName;
    if (!topic) return alert("Please enter a topic or business name first.");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: sessionTopic, category, questionCount }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate");
      }
      
      if (data.questions) {
        setQuestions(data.questions);
      } else {
        throw new Error("Failed to generate");
      }
    } catch (e: any) {
      alert(e.message || "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await saveBusinessProfile(user.id, businessName, category, questions);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save business", e);
      alert("Failed to save settings. Please try again.");
    }
  };

  const addManualQuestion = () => {
    setQuestions([...questions, { id: "q" + Date.now(), text: "", type: "rating" }]);
  };

  const updateQuestion = (index: number, text: string) => {
    const newQs = [...questions];
    newQs[index].text = text;
    setQuestions(newQs);
  };

  const removeQuestion = (index: number) => {
    const newQs = [...questions];
    newQs.splice(index, 1);
    setQuestions(newQs);
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Setup & Settings</h1>
        <p className="text-slate-500 text-sm">{theme.settingsSubtext}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Basic Information</h2>
            <p className="text-slate-500 text-sm">{isTeaching ? "Tell us about your class or session." : "Tell us about your restaurant or food business."}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-base font-semibold text-slate-900">{isTeaching ? "Instructor / Session Name" : "Business Name"}</Label>
              <Input
                id="name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. John's React Masterclass"
                className="h-12 border-[#E2E0E8] focus-visible:ring-[#4a47d2] rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-slate-900">Category</Label>
              <Select value={category} onValueChange={(val) => { setCategory(val); setContextCategory(val); }}>
                <SelectTrigger className="h-12 border-[#E2E0E8] focus-visible:ring-[#4a47d2] rounded-xl">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="py-2.5">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#E2E0E8] shadow-[0px_10px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Custom Questionnaire</h2>
            <p className="text-slate-500 text-sm">Configure the questions you want to ask your customers or students.</p>
          </div>
          
            <div className="space-y-8">
              
              <div className="bg-[#f0f0ff] p-5 rounded-xl border border-[#e2dfff] space-y-3">
                <Label className="text-[#0c006b] font-bold">Generate Questions with AI</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                    className="bg-white border-[#e2dfff] focus-visible:ring-[#4a47d2]"
                    placeholder={activePlaceholder}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-[#e2dfff] rounded-lg px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setQuestionCount(Math.max(2, questionCount - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f0f0ff] text-[#4a47d2] transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-[#0c006b] min-w-[24px] text-center">{questionCount}</span>
                      <button
                        type="button"
                        onClick={() => setQuestionCount(Math.min(20, questionCount + 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f0f0ff] text-[#4a47d2] transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleGenerateQuestions}
                      disabled={generating || !sessionTopic}
                      className="bg-[#4a47d2] hover:bg-[#332dbc] text-white min-w-[120px]"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      {`Generate ${questionCount}`}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-[#E2E0E8] space-y-3">
                <Label className="text-slate-900 font-bold">Import Questions (PDF, Word, or Google Form Link)</Label>
                <div className="flex flex-col gap-3">
                  <Input
                    type="url"
                    id="gform-url"
                    className="bg-white border-[#E2E0E8] focus-visible:ring-[#4a47d2]"
                    placeholder="Paste Google Form link..."
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="file"
                      id="doc-upload"
                      accept=".pdf,.doc,.docx"
                      className="bg-white border-[#E2E0E8] file:text-slate-700 cursor-pointer"
                    />
                    <Button
                      type="button"
                      disabled={generating}
                      onClick={async () => {
                        const urlInput = document.getElementById("gform-url") as HTMLInputElement;
                        const fileInput = document.getElementById("doc-upload") as HTMLInputElement;
                        
                        const url = urlInput?.value;
                        const file = fileInput?.files?.[0];

                        if (!url && !file) return alert("Please provide a URL or upload a file.");

                        setGenerating(true);
                        try {
                          const formData = new FormData();
                          if (url) formData.append("googleFormUrl", url);
                          if (file) formData.append("file", file);

                          const res = await fetch("/api/extract-questions", {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed to extract");
                          
                          if (data.questions && data.questions.length > 0) {
                            setQuestions((prev) => [...prev, ...data.questions]);
                            if (urlInput) urlInput.value = "";
                            if (fileInput) fileInput.value = "";
                          } else {
                            alert("No questions found.");
                          }
                        } catch (e: any) {
                          alert(e.message || "Failed to import questions.");
                        } finally {
                          setGenerating(false);
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Import"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Current Questions</h3>
                  <Badge variant="secondary">{questions.length} total</Badge>
                </div>
                <Separator />
                
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id || i} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <Badge variant="outline" className="h-10 px-3 bg-muted text-muted-foreground shrink-0 rounded-md">
                        Q{i + 1}
                      </Badge>
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestion(i, e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex w-full sm:w-auto gap-2">
                        <Select
                          value={q.type}
                          onValueChange={(val) => {
                            const newQs = [...questions];
                            newQs[i].type = val;
                            setQuestions(newQs);
                          }}
                        >
                          <SelectTrigger className="w-[140px] bg-muted/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rating">1-5 Rating</SelectItem>
                            <SelectItem value="text">Text Answer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(i)} className="text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0">
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addManualQuestion}
                    className="text-[#4a47d2] hover:text-[#332dbc] hover:bg-[#e2dfff] w-full sm:w-auto mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Question Manually
                  </Button>
                </div>
              </div>
            </div>
          </section>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-gray-900 hover:bg-black text-white"
        >
          {saved ? "Saved successfully!" : (
            <>
              <Save className="w-4 h-4 mr-2" /> Save Settings
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
