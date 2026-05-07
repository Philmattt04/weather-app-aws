/**
 * ExportPanel component
 *
 * Renders a row of export buttons, one per supported format.
 * Clicking a button calls GET /api/records/export?format=<format>, receives
 * the file as a Blob, then triggers a browser download using a temporary
 * object URL — no server-side file storage required.
 *
 * Supported formats: JSON, CSV, XML, Markdown, PDF
 * All formats are generated server-side in the export route so file creation
 * logic stays in one place and is not duplicated in the browser.
 */

'use client';

import { useState } from 'react';

const FORMATS = [
  { id: 'json', label: 'JSON',     icon: '{ }' },
  { id: 'csv',  label: 'CSV',      icon: '📊'  },
  { id: 'xml',  label: 'XML',      icon: '</>' },
  { id: 'md',   label: 'Markdown', icon: '# ✎' },
  { id: 'pdf',  label: 'PDF',      icon: '📄'  },
] as const;

type Format = (typeof FORMATS)[number]['id'];

export default function ExportPanel() {
  const [loading, setLoading] = useState<Format | null>(null); // which button is mid-request
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: Format) => {
    setLoading(format);
    setError(null);
    try {
      const res = await fetch(`/api/records/export?format=${format}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Export failed');
      }

      // Convert the response to a Blob and create a temporary URL to trigger a download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use .md extension for Markdown so the OS opens it in the right app
      a.download = `weather_records_${new Date().toISOString().slice(0, 10)}.${format === 'md' ? 'md' : format}`;
      a.click();
      URL.revokeObjectURL(url); // immediately release the object URL to free memory
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-white">
      <h3 className="font-semibold mb-4">Export All Records</h3>
      <div className="flex flex-wrap gap-3">
        {FORMATS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => handleExport(id)}
            disabled={loading !== null} // disable all buttons while any export is in progress
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            <span className="font-mono text-xs text-blue-300">{icon}</span>
            {loading === id ? `Exporting…` : label}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-300">⚠️ {error}</p>
      )}
      <p className="mt-3 text-xs text-blue-300/60">Downloads all saved records in the selected format.</p>
    </div>
  );
}
