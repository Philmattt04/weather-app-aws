/**
 * WeatherHistory component
 *
 * Displays all saved weather records from Supabase in a sortable table with
 * inline edit and delete functionality.
 *
 * READ   — records are passed in as props from the parent (loaded via GET /api/records)
 * UPDATE — clicking Edit switches the notes and units cells to inputs; saving calls
 *          PUT /api/records/[id]. If units changed, the component first calls
 *          GET /api/weather-range with the stored lat/lon to re-fetch temperature
 *          data in the new unit, then sends both the new units and the converted
 *          temperature_data together so stored values stay numerically correct.
 * DELETE — clicking Delete shows a confirm dialog then calls DELETE /api/records/[id]
 *
 * State is kept local — updates and deletions are reflected immediately via the
 * onUpdate / onDelete callbacks which let the parent splice the records array.
 */

'use client';

import { useState } from 'react';
import type { WeatherRecord } from '../types/records';

interface Props {
  records: WeatherRecord[];
  onUpdate: (updated: WeatherRecord) => void;
  onDelete: (id: string) => void;
}

// Compute the average of all daily avg temps in a record and format with unit label
function avgTemp(record: WeatherRecord): string {
  const avgs = record.temperature_data.map((d) => d.temp_avg).filter((v) => v != null) as number[];
  if (!avgs.length) return '—';
  const avg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const unit = record.units === 'imperial' ? '°F' : '°C';
  return `${avg.toFixed(1)}${unit}`;
}

export default function WeatherHistory({ records, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editUnits, setEditUnits] = useState<'imperial' | 'metric'>('imperial');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Enter edit mode for a row — seed the form inputs with the current values
  const startEdit = (r: WeatherRecord) => {
    setEditingId(r.id);
    setEditNotes(r.notes);
    setEditUnits(r.units);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const record = records.find((r) => r.id === id)!;
      const body: Record<string, unknown> = { notes: editNotes, units: editUnits };

      // If units changed we must re-fetch temp data in the new unit.
      // Sending only a relabeled unit would show the same numbers with a different symbol,
      // which would be numerically wrong (e.g. 26.9°F displayed as 26.9°C).
      if (editUnits !== record.units) {
        const rangeRes = await fetch(
          `/api/weather-range?lat=${record.latitude}&lon=${record.longitude}&start_date=${record.start_date}&end_date=${record.end_date}&units=${editUnits}`
        );
        const rangeData = await rangeRes.json();
        if (!rangeRes.ok) throw new Error(rangeData.error || 'Failed to convert temperature data');
        body.temperature_data = rangeData.temperature_data; // include reconverted values in the PUT
      }

      const res = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data); // update the row in the parent's state
      setEditingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: string) => {
    // Confirm before a destructive action
    if (!confirm('Delete this record? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      onDelete(id); // remove the row from the parent's state
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (!records.length) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-blue-300">
        No saved records yet. Use the form above to search and save weather data.
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden text-white">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold">Saved Records <span className="text-blue-300 text-sm font-normal">({records.length})</span></h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-blue-200 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Location</th>
              <th className="text-left px-4 py-3">Date Range</th>
              <th className="text-left px-4 py-3">Avg Temp</th>
              <th className="text-left px-4 py-3">Units</th>
              <th className="text-left px-4 py-3">Notes</th>
              <th className="text-left px-4 py-3">Saved</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const isEditing = editingId === r.id;
              const isDeleting = deletingId === r.id;
              return (
                <tr key={r.id} className="border-t border-white/10 hover:bg-white/5 transition">
                  <td className="px-4 py-3 font-medium">
                    {r.city_name}{r.country ? `, ${r.country}` : ''}
                    <p className="text-blue-300 text-xs font-normal">{r.location_query}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs">{r.start_date}</span>
                    <span className="text-blue-400 mx-1">→</span>
                    <span className="text-xs">{r.end_date}</span>
                    <p className="text-blue-300 text-xs">{r.temperature_data.length} days</p>
                  </td>
                  <td className="px-4 py-3 font-mono">{avgTemp(r)}</td>

                  {/* Units cell becomes a select dropdown in edit mode */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        value={editUnits}
                        onChange={(e) => setEditUnits(e.target.value as 'imperial' | 'metric')}
                        className="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="imperial" className="bg-slate-800">Imperial</option>
                        <option value="metric" className="bg-slate-800">Metric</option>
                      </select>
                    ) : (
                      <span className="text-xs text-blue-200 capitalize">{r.units}</span>
                    )}
                  </td>

                  {/* Notes cell becomes a text input in edit mode */}
                  <td className="px-4 py-3 max-w-[180px]">
                    {isEditing ? (
                      <input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Add note…"
                      />
                    ) : (
                      <span className="text-xs text-blue-200 truncate block">{r.notes || '—'}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-blue-300 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>

                  {/* Action buttons swap between Edit/Delete and Save/Cancel */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {isEditing ? (
                      <span className="inline-flex gap-2">
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={saving}
                          className="text-xs bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(r)}
                          className="text-xs bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 px-3 py-1 rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRecord(r.id)}
                          disabled={isDeleting}
                          className="text-xs bg-red-500/30 hover:bg-red-500/50 disabled:opacity-50 text-red-300 px-3 py-1 rounded-lg transition"
                        >
                          {isDeleting ? '…' : 'Delete'}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
