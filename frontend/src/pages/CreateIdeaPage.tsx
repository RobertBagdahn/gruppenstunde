import { useState } from 'react';
import { useImproveText, useSuggestTags } from '@/api/ai';
import { useTags, useScoutLevels } from '@/api/tags';
import { IDEA_TYPE_OPTIONS } from '@/schemas/idea';

export default function CreateIdeaPage() {
  const [title, setTitle] = useState('');
  const [ideaType, setIdeaType] = useState('idea');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [costsRating, setCostsRating] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedScoutIds, setSelectedScoutIds] = useState<number[]>([]);

  const { data: allTags } = useTags();
  const { data: scoutLevels } = useScoutLevels();
  const improveText = useImproveText();
  const suggestTags = useSuggestTags();

  function handleImprove(field: string, text: string, setter: (v: string) => void) {
    improveText.mutate(
      { text, field },
      { onSuccess: (data) => setter(data.improved_text) },
    );
  }

  function handleSuggestTags() {
    suggestTags.mutate(
      { title, description },
      {
        onSuccess: (data) => {
          setSelectedTagIds((prev) => [...new Set([...prev, ...data.tag_ids])]);
        },
      },
    );
  }

  function toggleTag(id: number) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleScoutLevel(id: number) {
    setSelectedScoutIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      title,
      idea_type: ideaType,
      summary,
      description,
      difficulty,
      costs_rating: costsRating,
      execution_time: executionTime,
      tag_ids: selectedTagIds,
      scout_level_ids: selectedScoutIds,
    };

    const res = await fetch('/api/ideas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      window.location.href = `/idea/${data.slug}`;
    }
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex justify-center mb-6">
        <img src="/images/inspi_creativ.png" alt="Kreativ" className="h-96 w-auto" />
      </div>
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary text-white">
          <span className="material-symbols-outlined text-[24px]">add_circle</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Neue Idee erstellen</h1>
          <p className="text-sm text-muted-foreground">Teile deine Idee mit der Community</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Idea Type Selection */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
            <span className="material-symbols-outlined text-violet-500 text-[18px]">category</span>
            Was möchtest du erstellen?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {IDEA_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIdeaType(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  ideaType === opt.value
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <span className={`material-symbols-outlined text-[32px] ${
                  ideaType === opt.value ? 'text-primary' : 'text-muted-foreground'
                }`}>{opt.icon}</span>
                <span className={`font-semibold text-sm ${
                  ideaType === opt.value ? 'text-primary' : 'text-foreground'
                }`}>{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">title</span>
            Titel
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button
              type="button"
              onClick={() => handleImprove('title', title, setTitle)}
              disabled={!title || improveText.isPending}
              className="flex items-center gap-1 px-3 py-2.5 rounded-lg border text-sm bg-secondary/20 hover:bg-secondary/40 disabled:opacity-50 transition-colors text-secondary-foreground"
              title="KI-Verbesserung"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">short_text</span>
            Kurztext
          </label>
          <div className="flex gap-2">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="flex-1 px-4 py-2.5 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => handleImprove('summary', summary, setSummary)}
              disabled={!summary || improveText.isPending}
              className="flex items-center gap-1 px-3 py-2.5 rounded-lg border text-sm bg-secondary/20 hover:bg-secondary/40 disabled:opacity-50 transition-colors self-start text-secondary-foreground"
              title="KI-Verbesserung"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">description</span>
            Beschreibung
          </label>
          <div className="flex gap-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="flex-1 px-4 py-2.5 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => handleImprove('description', description, setDescription)}
              disabled={!description || improveText.isPending}
              className="flex items-center gap-1 px-3 py-2.5 rounded-lg border text-sm bg-secondary/20 hover:bg-secondary/40 disabled:opacity-50 transition-colors self-start text-secondary-foreground"
              title="KI-Verbesserung"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </button>
          </div>
        </div>

        {/* Meta selects */}
        <div className="bg-card rounded-xl border p-5">
          <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
            <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
            Details
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Schwierigkeit</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">–</option>
                <option value="easy">Einfach</option>
                <option value="medium">Mittel</option>
                <option value="hard">Schwer</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kosten</label>
              <select
                value={costsRating}
                onChange={(e) => setCostsRating(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">–</option>
                <option value="free">0 €</option>
                <option value="less_1">{'< 1 €'}</option>
                <option value="1_2">1 – 2 €</option>
                <option value="more_2">{'> 2 €'}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dauer</label>
              <select
                value={executionTime}
                onChange={(e) => setExecutionTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">–</option>
                <option value="less_30">{'< 30 Min'}</option>
                <option value="30_60">30 – 60 Min</option>
                <option value="60_90">60 – 90 Min</option>
                <option value="more_90">{'> 90 Min'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <span className="material-symbols-outlined text-primary text-[18px]">label</span>
              Tags
            </label>
            <button
              type="button"
              onClick={handleSuggestTags}
              disabled={(!title && !description) || suggestTags.isPending}
              className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              {suggestTags.isPending ? 'KI denkt...' : 'Tags vorschlagen'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags?.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium border ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {tag.icon && <span className="mr-1">{tag.icon}</span>}
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scout Levels */}
        {scoutLevels && (
          <div className="bg-card rounded-xl border p-5">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
              <span className="material-symbols-outlined text-blue-500 text-[18px]">groups</span>
              Stufen
            </label>
            <div className="flex flex-wrap gap-2">
              {scoutLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => toggleScoutLevel(level.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    selectedScoutIds.includes(level.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full px-6 py-3 gradient-primary text-white rounded-xl font-medium hover:shadow-glow transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Idee erstellen
        </button>
      </form>
    </div>
  );
}
