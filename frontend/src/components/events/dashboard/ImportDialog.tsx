/**
 * ImportDialog — Multi-step dialog for importing participants from CSV/Excel.
 * Steps: 1) File upload  2) Preview & validate  3) Import result
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useImportPreview, useImportParticipants } from '@/api/eventDashboard';
import type { ImportPreview, ImportResult } from '@/schemas/event';

interface Props {
  slug: string;
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'result';

export default function ImportDialog({ slug, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const importPreview = useImportPreview(slug);
  const importParticipants = useImportParticipants(slug);

  const handleFile = useCallback(
    (f: File) => {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!validTypes.includes(f.type) && !['csv', 'xls', 'xlsx'].includes(ext ?? '')) {
        toast.error('Nur CSV und Excel-Dateien werden unterstützt');
        return;
      }
      setFile(f);
      importPreview.mutate(f, {
        onSuccess: (data) => {
          setPreview(data);
          setStep('preview');
        },
        onError: (err) => toast.error('Fehler beim Lesen', { description: err.message }),
      });
    },
    [importPreview],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleImport = () => {
    if (!file) return;
    importParticipants.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        setStep('result');
        if (data.error_count === 0) {
          toast.success(`${data.success_count} Teilnehmer importiert`);
        } else {
          toast.warning(`${data.success_count} importiert, ${data.error_count} Fehler`);
        }
      },
      onError: (err) => toast.error('Import fehlgeschlagen', { description: err.message }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            Teilnehmer importieren
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 px-4 py-3 border-b text-xs">
          <StepBadge n={1} label="Datei" active={step === 'upload'} done={step !== 'upload'} />
          <span className="text-muted-foreground">&rarr;</span>
          <StepBadge n={2} label="Vorschau" active={step === 'preview'} done={step === 'result'} />
          <span className="text-muted-foreground">&rarr;</span>
          <StepBadge n={3} label="Ergebnis" active={step === 'result'} done={false} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'upload' && (
            <UploadStep
              isDragOver={isDragOver}
              isPending={importPreview.isPending}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onFileSelect={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          )}

          {step === 'preview' && preview && (
            <PreviewStep preview={preview} fileName={file?.name ?? ''} />
          )}

          {step === 'result' && result && <ResultStep result={result} />}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setPreview(null);
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                Andere Datei
              </button>
              <button
                onClick={handleImport}
                disabled={importParticipants.isPending || (preview?.valid_rows ?? 0) === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {importParticipants.isPending ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    Importieren...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    {preview?.valid_rows ?? 0} Teilnehmer importieren
                  </>
                )}
              </button>
            </>
          )}
          {step === 'result' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white"
            >
              Fertig
            </button>
          )}
          {step === 'upload' && (
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Badge
// ---------------------------------------------------------------------------

function StepBadge({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${
        active
          ? 'bg-violet-100 text-violet-700 font-medium'
          : done
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      {done ? (
        <span className="material-symbols-outlined text-[12px]">check</span>
      ) : (
        <span className="text-[11px] font-bold">{n}</span>
      )}
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Upload Step
// ---------------------------------------------------------------------------

function UploadStep({
  isDragOver,
  isPending,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
}: {
  isDragOver: boolean;
  isPending: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragOver
            ? 'border-violet-400 bg-violet-50'
            : 'border-muted-foreground/20 hover:border-violet-300'
        }`}
      >
        {isPending ? (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-violet-500 animate-spin">
              progress_activity
            </span>
            <p className="text-sm text-muted-foreground">Datei wird gelesen...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-muted-foreground">
              upload_file
            </span>
            <p className="text-sm font-medium">CSV oder Excel-Datei hierher ziehen</p>
            <p className="text-xs text-muted-foreground">oder klicken zum Auswählen</p>
            <label className="mt-2 px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted cursor-pointer transition-colors">
              Datei auswählen
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={onFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Erwartete Spalten:</p>
        <p>
          <code className="bg-muted px-1 rounded">first_name</code>,{' '}
          <code className="bg-muted px-1 rounded">last_name</code>,{' '}
          <code className="bg-muted px-1 rounded">email</code> (optional),{' '}
          <code className="bg-muted px-1 rounded">scout_name</code> (optional),{' '}
          <code className="bg-muted px-1 rounded">booking_option</code> (optional)
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview Step
// ---------------------------------------------------------------------------

function PreviewStep({
  preview,
  fileName,
}: {
  preview: ImportPreview;
  fileName: string;
}) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xl font-bold">{preview.total_rows}</p>
          <p className="text-xs text-muted-foreground">Zeilen gesamt</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-emerald-50">
          <p className="text-xl font-bold text-emerald-600">{preview.valid_rows}</p>
          <p className="text-xs text-muted-foreground">Gültig</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-50">
          <p className="text-xl font-bold text-red-600">{preview.invalid_rows}</p>
          <p className="text-xs text-muted-foreground">Fehler</p>
        </div>
      </div>

      {/* File info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="material-symbols-outlined text-[14px]">description</span>
        {fileName}
        <span>&middot;</span>
        Spalten: {preview.columns.join(', ')}
      </div>

      {/* Column Mappings */}
      {preview.suggested_mappings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Erkannte Zuordnungen:</p>
          <div className="flex flex-wrap gap-2">
            {preview.suggested_mappings.map((m, i) => (
              <span
                key={i}
                className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-full"
              >
                {m.source_column} &rarr; {m.target_field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preview Rows */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Vorschau (erste {preview.preview_rows.length} Zeilen):
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">#</th>
                  {preview.columns.map((col) => (
                    <th key={col} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                      {col}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview_rows.map((row) => (
                  <tr
                    key={row.row_number}
                    className={row.is_valid ? '' : 'bg-red-50'}
                  >
                    <td className="px-2 py-1.5 text-muted-foreground">{row.row_number}</td>
                    {preview.columns.map((col) => (
                      <td key={col} className="px-2 py-1.5 max-w-[120px] truncate">
                        {row.data[col] ?? ''}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      {row.is_valid ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">check</span>
                          OK
                        </span>
                      ) : (
                        <span className="text-red-600" title={row.errors.join(', ')}>
                          {row.errors[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result Step
// ---------------------------------------------------------------------------

function ResultStep({ result }: { result: ImportResult }) {
  return (
    <div className="space-y-4 text-center py-4">
      <span
        className={`material-symbols-outlined text-5xl ${
          result.error_count === 0 ? 'text-emerald-500' : 'text-amber-500'
        }`}
      >
        {result.error_count === 0 ? 'check_circle' : 'warning'}
      </span>

      <div>
        <p className="text-lg font-semibold">Import abgeschlossen</p>
        <p className="text-sm text-muted-foreground mt-1">
          {result.success_count} von {result.total_processed} Teilnehmern erfolgreich importiert
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        <div className="p-3 rounded-lg bg-emerald-50 text-center">
          <p className="text-xl font-bold text-emerald-600">{result.success_count}</p>
          <p className="text-xs text-muted-foreground">Erfolgreich</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 text-center">
          <p className="text-xl font-bold text-red-600">{result.error_count}</p>
          <p className="text-xs text-muted-foreground">Fehler</p>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="text-left max-w-sm mx-auto">
          <p className="text-xs font-medium text-muted-foreground mb-1">Fehlerdetails:</p>
          <div className="border rounded-lg p-3 bg-red-50 max-h-32 overflow-y-auto space-y-1">
            {result.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-700">
                {err}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
