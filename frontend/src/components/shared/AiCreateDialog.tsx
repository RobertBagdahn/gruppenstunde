/**
 * AiCreateDialog — Shared dialog for AI-powered entity creation.
 *
 * Provides a simple input form (name/title) and triggers AI creation,
 * then navigates to the created entity.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AiCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  secondaryInputLabel?: string;
  secondaryInputPlaceholder?: string;
  onSubmit: (value: string, secondaryValue?: string) => void;
  isLoading: boolean;
}

export function AiCreateDialog({
  open,
  onOpenChange,
  title,
  description,
  inputLabel,
  inputPlaceholder,
  secondaryInputLabel,
  secondaryInputPlaceholder,
  onSubmit,
  isLoading,
}: AiCreateDialogProps) {
  const [value, setValue] = useState('');
  const [secondaryValue, setSecondaryValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim(), secondaryValue.trim() || undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">{inputLabel}</label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {secondaryInputLabel && (
            <div>
              <label className="text-sm font-medium mb-1 block">{secondaryInputLabel}</label>
              <Input
                value={secondaryValue}
                onChange={(e) => setSecondaryValue(e.target.value)}
                placeholder={secondaryInputPlaceholder}
                disabled={isLoading}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!value.trim() || isLoading}>
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin mr-1">progress_activity</span>
                  Wird erstellt...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm mr-1">auto_fix_high</span>
                  Mit KI erstellen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
