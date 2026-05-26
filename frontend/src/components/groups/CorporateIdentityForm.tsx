/**
 * CorporateIdentityForm — Form for managing a group's corporate identity.
 * Includes color pickers, logo upload, and text fields.
 */
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  useGroupCorporateIdentity,
  useUpdateGroupCorporateIdentity,
  useUploadGroupLogo,
  useDeleteGroupLogo,
} from '@/api/profile';
import type { GroupCorporateIdentityForm as CIFormData } from '@/schemas/profile';
import CorporateIdentityPreview from './CorporateIdentityPreview';

const MAX_LOGO_SIZE = 500 * 1024; // 500KB

interface Props {
  slug: string;
}

export default function CorporateIdentityForm({ slug }: Props) {
  const { data: ci, isLoading, error, refetch } = useGroupCorporateIdentity(slug);
  const updateMutation = useUpdateGroupCorporateIdentity(slug);
  const uploadLogoMutation = useUploadGroupLogo(slug);
  const deleteLogoMutation = useDeleteGroupLogo(slug);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CIFormData>({
    primary_color: '#4a3a6b',
    secondary_color: '#e8e4f0',
    slogan: '',
    greeting_text: '',
    footer_text: '',
    payment_info: '',
    signature_text: '',
  });

  useEffect(() => {
    if (ci) {
      setForm({
        primary_color: ci.primary_color,
        secondary_color: ci.secondary_color,
        slogan: ci.slogan,
        greeting_text: ci.greeting_text,
        footer_text: ci.footer_text,
        payment_info: ci.payment_info,
        signature_text: ci.signature_text,
      });
    }
  }, [ci]);

  const handleChange = (field: keyof CIFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(form, {
      onSuccess: () => toast.success('Corporate Identity gespeichert'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Das Logo darf maximal 500KB gross sein');
      e.target.value = '';
      return;
    }

    uploadLogoMutation.mutate(file, {
      onSuccess: () => toast.success('Logo hochgeladen'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
    e.target.value = '';
  };

  const handleLogoDelete = () => {
    deleteLogoMutation.mutate(undefined, {
      onSuccess: () => toast.success('Logo entfernt'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-8 text-center">
        <span className="material-symbols-outlined text-[48px] text-muted-foreground/40 mb-3 block">
          error
        </span>
        <p className="text-muted-foreground mb-4">Corporate Identity konnte nicht geladen werden.</p>
        <Button onClick={() => refetch()} variant="outline">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Colors */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">palette</span>
          Farben
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Primärfarbe</Label>
            <ColorPicker
              id="primary_color"
              value={form.primary_color}
              onChange={(v) => handleChange('primary_color', v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_color">Sekundärfarbe</Label>
            <ColorPicker
              id="secondary_color"
              value={form.secondary_color}
              onChange={(v) => handleChange('secondary_color', v)}
            />
          </div>
        </div>
      </section>

      {/* Logo */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">image</span>
          Logo
        </h3>

        <div className="flex items-center gap-4">
          {ci?.logo_url ? (
            <div className="relative group">
              <img
                src={ci.logo_url}
                alt="Gruppen-Logo"
                className="w-20 h-20 object-contain rounded-lg border"
                loading="lazy"
              />
              <button
                onClick={handleLogoDelete}
                disabled={deleteLogoMutation.isPending}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Logo entfernen"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-muted-foreground/40">
                add_photo_alternate
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLogoMutation.isPending}
            >
              <span className="material-symbols-outlined text-[16px] mr-1">upload</span>
              {uploadLogoMutation.isPending ? 'Wird hochgeladen...' : 'Logo hochladen'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Max. 500KB, empfohlen 300x300px. PNG, JPEG oder WebP.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleLogoSelect}
        />
      </section>

      {/* Slogan */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">format_quote</span>
          Slogan
        </h3>
        <div className="space-y-2">
          <Label htmlFor="slogan">Slogan / Motto</Label>
          <Input
            id="slogan"
            value={form.slogan}
            onChange={(e) => handleChange('slogan', e.target.value)}
            placeholder="z.B. Allzeit bereit!"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{form.slogan.length}/200 Zeichen</p>
        </div>
      </section>

      {/* Text blocks */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">text_fields</span>
          Textbausteine
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="greeting_text">Anrede</Label>
            <textarea
              id="greeting_text"
              value={form.greeting_text}
              onChange={(e) => handleChange('greeting_text', e.target.value)}
              placeholder="z.B. Liebe Pfadfinderinnen und Pfadfinder,"
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text">Impressum / Kontakt</Label>
            <textarea
              id="footer_text"
              value={form.footer_text}
              onChange={(e) => handleChange('footer_text', e.target.value)}
              placeholder="z.B. Stamm Windrose e.V., Musterstr. 1, 12345 Musterstadt"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_info">Zahlungsdaten</Label>
            <textarea
              id="payment_info"
              value={form.payment_info}
              onChange={(e) => handleChange('payment_info', e.target.value)}
              placeholder="z.B. IBAN: DE89 3704 0044 0532 0130 00, BIC: COBADEFFXXX"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature_text">Unterschrift</Label>
            <textarea
              id="signature_text"
              value={form.signature_text}
              onChange={(e) => handleChange('signature_text', e.target.value)}
              placeholder="z.B. Gut Pfad, eure Stammesführung"
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">preview</span>
          Vorschau
        </h3>
        <CorporateIdentityPreview
          primaryColor={form.primary_color}
          secondaryColor={form.secondary_color}
          logoUrl={ci?.logo_url || ''}
          slogan={form.slogan}
          greetingText={form.greeting_text}
          footerText={form.footer_text}
          paymentInfo={form.payment_info}
          signatureText={form.signature_text}
        />
      </section>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gradient-primary text-white hover:shadow-glow"
        >
          {updateMutation.isPending ? 'Speichern...' : 'Corporate Identity speichern'}
        </Button>
      </div>
    </div>
  );
}
