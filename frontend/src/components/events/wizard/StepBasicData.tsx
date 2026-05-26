/**
 * Step 1: Grunddaten — name, slug, color, icon, description, template toggle.
 */
import { useEffect } from 'react';
import { useEventWizardStore } from '@/store/eventWizardStore';
import { WizardStep1Schema } from '@/schemas/eventWizard';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';
import SlugEditor from './SlugEditor';
import MarkdownEditor from '@/components/MarkdownEditor';

export default function StepBasicData() {
  const { data, updateStep1, setStepValid } = useEventWizardStore();

  // Validate on every relevant change
  useEffect(() => {
    const result = WizardStep1Schema.safeParse({
      name: data.name,
      slug: data.slug,
      color: data.color,
      icon: data.icon,
      description: data.description,
      is_template: data.is_template,
    });
    setStepValid(0, result.success);
  }, [data.name, data.slug, data.color, data.icon, data.description, data.is_template, setStepValid]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Grunddaten</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Gib deinem Event einen Namen und wähle Farbe und Icon.
        </p>
      </div>

      {/* Event name */}
      <div>
        <label className="block text-sm font-medium mb-1">Event-Name *</label>
        <input
          type="text"
          placeholder="z.B. Sommerlager 2026"
          value={data.name}
          onChange={(e) => updateStep1({ name: e.target.value })}
          className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          autoFocus
        />
        {data.name.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">Pflichtfeld</p>
        )}
      </div>

      {/* Slug editor */}
      <SlugEditor
        name={data.name}
        slug={data.slug}
        onSlugChange={(slug) => updateStep1({ slug })}
      />

      {/* Color picker */}
      <ColorPicker
        value={data.color || 'blue'}
        onChange={(color) => updateStep1({ color })}
      />

      {/* Icon picker */}
      <IconPicker
        value={data.icon || 'tent'}
        onChange={(icon) => updateStep1({ icon })}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Beschreibung</label>
        <MarkdownEditor
          value={data.description || ''}
          onChange={(val) => updateStep1({ description: val })}
          placeholder="Kurze Beschreibung des Events..."
          height={150}
          preview="edit"
        />
      </div>

      {/* Template toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={data.is_template || false}
          onChange={(e) => updateStep1({ is_template: e.target.checked })}
          className="rounded"
        />
        <span>Als Vorlage speichern</span>
        <span className="text-xs text-muted-foreground">(kann als Basis für zukünftige Events dienen)</span>
      </label>
    </div>
  );
}
