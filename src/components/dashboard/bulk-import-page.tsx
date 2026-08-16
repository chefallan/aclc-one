"use client";

import * as React from "react";
import { Upload, Download, CircleCheckBig, TriangleAlert, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

type Row = Record<string, string>;

const COLUMNS = ["firstName", "lastName", "email", "studentNumber", "sectionId", "programId"];

export function BulkImportPage() {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<Row[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [missing, setMissing] = React.useState<string[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  function selectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result ?? "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const cols = lines[0]?.split(",").map((h) => h.trim()) ?? [];

      setHeaders(cols);
      setMissing(COLUMNS.filter((c) => !cols.includes(c)));
      setTotalRows(Math.max(0, lines.length - 1));
      setPreview(
        lines.slice(1, 6).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          return Object.fromEntries(cols.map((c, i) => [c, values[i] ?? ""]));
        })
      );
    };
    reader.readAsText(selected);
  }

  function clearFile() {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setMissing([]);
    setTotalRows(0);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function runImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/students/import", { method: "POST", body });
      const data = await res.json();

      setResult(
        data.success
          ? {
              imported: data.imported ?? 0,
              failed: data.failed ?? 0,
              errors: data.errors ?? [],
            }
          : {
              imported: 0,
              failed: totalRows,
              errors: [data.error ?? "The import didn't run. Nothing was saved."],
            }
      );
    } catch {
      setResult({
        imported: 0,
        failed: totalRows,
        errors: ["Couldn't reach the server. Nothing was saved — try again."],
      });
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = `${COLUMNS.join(",")}\nJuan,Dela Cruz,juan.delacruz@student.aclc.edu.ph,02-2223-04891,,\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="eyebrow">Students</p>
        <h1 className="mt-1 text-2xl font-semibold">Import from CSV</h1>
        <p className="mt-1 text-sm text-content-muted">
          Nothing is saved until you press import. The preview below is checked first.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Start from the template</CardTitle>
          <CardDescription>
            Six columns. <span className="data">sectionId</span> and{" "}
            <span className="data">programId</span> may be left blank and assigned later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your file</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileRef}
            id="csv"
            type="file"
            accept=".csv,text/csv"
            onChange={selectFile}
            className="sr-only"
          />

          {file ? (
            <div className="flex items-center gap-3 rounded-field border border-hairline p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="data text-xs text-content-faint">
                  {totalRows} rows · {Math.round(file.size / 1024)} KB
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="size-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          ) : (
            <Button variant="outline" block onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Choose a CSV file
            </Button>
          )}

          {missing.length > 0 && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2.5 rounded-field border border-absent-500/40 bg-absent-50 px-3.5 py-3 text-sm text-absent-700 dark:bg-absent-900/30 dark:text-absent-200"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                This file is missing{" "}
                <span className="data font-medium">{missing.join(", ")}</span>. Add the column
                heading and upload again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              First {preview.length} of <span className="data">{totalRows}</span> rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-y border-hairline bg-surface-sunk text-left">
                    {headers.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 font-mono text-[0.66rem] font-medium uppercase tracking-[0.12em] text-content-faint"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="data px-4 py-2.5 text-xs">
                          {row[h] || <span className="text-content-faint">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card
          className={
            result.failed > 0 && result.imported === 0
              ? "border-absent-500/50"
              : "border-present-500/40"
          }
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              {result.imported > 0 ? (
                <CircleCheckBig className="mt-0.5 size-5 shrink-0 text-present-600" />
              ) : (
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-absent-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {result.imported > 0
                    ? `${result.imported} students imported`
                    : "Nothing was imported"}
                </p>
                {result.failed > 0 && (
                  <p className="mt-0.5 text-sm text-content-muted">
                    <span className="data">{result.failed}</span> rows were rejected and not saved.
                  </p>
                )}

                {result.errors.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {result.errors.slice(0, 12).map((err, i) => (
                      <li key={i} className="flex gap-2 text-sm text-absent-700 dark:text-absent-300">
                        <Badge variant="destructive" className="shrink-0">
                          Row {i + 1}
                        </Badge>
                        <span>{err}</span>
                      </li>
                    ))}
                    {result.errors.length > 12 && (
                      <li className="text-xs text-content-faint">
                        …and {result.errors.length - 12} more.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={runImport}
        disabled={!file || importing || missing.length > 0}
        block
        size="lg"
      >
        {importing ? "Importing…" : `Import ${totalRows || ""} students`.trim()}
      </Button>
    </div>
  );
}
