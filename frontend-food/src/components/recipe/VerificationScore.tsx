import { useVerificationStatus } from '@/api/recipes';

interface VerificationScoreProps {
  recipeId: number;
  isOwner: boolean;
  isStaff: boolean;
  isApproved: boolean;
}

export default function VerificationScore({ recipeId, isOwner, isStaff, isApproved }: VerificationScoreProps) {
  const { data: status } = useVerificationStatus(recipeId);

  if (isApproved || !status) return null;
  if (!isOwner && !isStaff) return null;

  const passed = status.rules_passed;
  const total = status.rules_total;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-body font-semibold">Verification-Readiness</span>
        <span className="text-caption text-muted-foreground">{passed}/{total}</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {status.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {status.warnings.map((w, i) => (
            <li key={i} className="text-caption text-muted-foreground flex items-start gap-1">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{String(w.rule_description || w.rule_name || '')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
