"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Camera, CircleCheckBig, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES = [
  { value: "TASK", label: "Task" },
  { value: "TRAINING", label: "Training" },
  { value: "MEETING", label: "Meeting" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "BREAK", label: "Break" },
  { value: "OTHER", label: "Other" },
];

function NewLogForm() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    taskDescription: "",
    learningDescription: "",
    taskCategory: "TASK",
    timestamp: new Date().toISOString().slice(0, 16),
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function choosePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sessionId) {
      setError("This log isn't attached to a work session. Open it from your time-in screen.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          workSessionId: sessionId,
          timestamp: new Date(form.timestamp).toISOString(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          data.error ??
            "Unable to save your log. Your entry is still on this screen — try again in a moment."
        );
        return;
      }

      // The photo is a second request against the created log. If it fails the
      // log still stands, and the student is told exactly what is missing.
      if (photo && data.data?.id) {
        const body = new FormData();
        body.append("photo", photo);
        body.append("takenAt", new Date(photo.lastModified).toISOString());

        const upload = await fetch(`/api/activity-logs/${data.data.id}/photos`, {
          method: "POST",
          body,
        });

        if (!upload.ok) {
          const uploadBody = await upload.json().catch(() => ({}));
          setError(
            uploadBody.error ??
              "Your log saved, but the photo didn't upload. Open the log to add it again."
          );
          setLoading(false);
          return;
        }
      }

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      setError("You appear to be offline. Your entry stays on this screen until it sends.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-present-50 text-present-600 dark:bg-present-700/25 dark:text-present-50">
          <CircleCheckBig className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold">Log recorded</h1>
        <p className="mt-1 text-sm text-content-muted">Taking you back to your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header>
        <p className="eyebrow">Work immersion</p>
        <h1 className="mt-1 text-2xl font-semibold">New activity log</h1>
        <p className="mt-1 text-sm text-content-muted">
          What you did, what you learned, and a photo if you have one.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-field border border-absent-500/40 bg-absent-50 px-3.5 py-3 text-sm text-absent-700 dark:bg-absent-900/30 dark:text-absent-200"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-1.5">
              <label htmlFor="taskDescription" className="text-sm font-medium">
                What did you work on?
              </label>
              <Textarea
                id="taskDescription"
                value={form.taskDescription}
                onChange={(e) => setForm({ ...form, taskDescription: e.target.value })}
                placeholder="Assisted with computer maintenance and network troubleshooting."
                rows={4}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="learningDescription" className="text-sm font-medium">
                What did you learn?
              </label>
              <Textarea
                id="learningDescription"
                value={form.learningDescription}
                onChange={(e) => setForm({ ...form, learningDescription: e.target.value })}
                placeholder="Optional, but it's what your final report is built from."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="taskCategory" className="text-sm font-medium">
                  Category
                </label>
                <select
                  id="taskCategory"
                  value={form.taskCategory}
                  onChange={(e) => setForm({ ...form, taskCategory: e.target.value })}
                  className="h-11 w-full rounded-field border border-hairline-strong bg-surface px-3 text-base text-content focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/25 sm:text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="timestamp" className="text-sm font-medium">
                  Time
                </label>
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={form.timestamp}
                  onChange={(e) => setForm({ ...form, timestamp: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium">Photo evidence</p>
            <p className="mt-0.5 text-xs text-content-muted">
              Stored privately. Only you, your instructor, and your supervisor can open it.
            </p>

            <input
              ref={fileRef}
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              onChange={choosePhoto}
              className="sr-only"
            />

            {preview ? (
              <div className="mt-3 flex items-center gap-3 rounded-field border border-hairline p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Photo you selected"
                  className="size-16 rounded-[0.5rem] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{photo?.name}</p>
                  <p className="data text-xs text-content-faint">
                    {photo ? `${Math.round(photo.size / 1024)} KB` : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={clearPhoto}>
                  <X className="size-4" />
                  <span className="sr-only">Remove photo</span>
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                block
                className="mt-3"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="size-4" />
                Add a photo
              </Button>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} block size="lg">
          {loading ? "Saving…" : "Submit log"}
        </Button>
      </form>
    </div>
  );
}

export default function NewLogPage() {
  return (
    <Suspense
      fallback={<p className="py-16 text-center text-sm text-content-muted">Loading…</p>}
    >
      <NewLogForm />
    </Suspense>
  );
}
