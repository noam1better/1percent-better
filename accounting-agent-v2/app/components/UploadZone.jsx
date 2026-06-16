'use client';

import { useState, useRef } from 'react';

const ACCEPTED = '.csv,.xlsx,.xls,.pdf';

export default function UploadZone({ onResult, onError, onLoading }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  async function processFile(file) {
    if (!file) return;
    setFileName(file.name);
    onLoading(true);
    onError(null);
    onResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        onError(data.error || 'Analysis failed');
      } else {
        onResult(data);
      }
    } catch (err) {
      onError(err.message);
    } finally {
      onLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
        ${dragging
          ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
          : 'border-gray-700 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-900'
        }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => processFile(e.target.files?.[0])}
      />

      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-colors
          ${dragging ? 'bg-indigo-500/20' : 'bg-gray-800'}`}>
          {dragging ? '📂' : '📁'}
        </div>

        {fileName ? (
          <p className="text-gray-300 font-medium">{fileName}</p>
        ) : (
          <>
            <p className="text-gray-200 font-semibold text-lg">
              Drop your financial file here
            </p>
            <p className="text-gray-500 text-sm">CSV, Excel (.xlsx/.xls), or PDF</p>
          </>
        )}

        <div className="flex gap-2 mt-1">
          {['CSV', 'XLSX', 'XLS', 'PDF'].map((f) => (
            <span key={f} className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 text-xs font-mono">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
