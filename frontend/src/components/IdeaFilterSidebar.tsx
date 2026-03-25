import { useState } from 'react';
import { useTags, useScoutLevels } from '@/api/tags';
import { useIdeaStore } from '@/store/useIdeaStore';
import {
  DIFFICULTY_OPTIONS,
  COSTS_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  IDEA_TYPE_OPTIONS,
} from '@/schemas/idea';
import type { Tag } from '@/schemas/idea';

/** Build a tree structure from flat tag list */
function buildTagTree(tags: Tag[]): (Tag & { children: Tag[] })[] {
  const map = new Map<number, Tag & { children: Tag[] }>();
  const roots: (Tag & { children: Tag[] })[] = [];

  tags.forEach((t) => map.set(t.id, { ...t, children: [] }));
  tags.forEach((t) => {
    const node = map.get(t.id)!;
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots.sort((a, b) => a.sort_order - b.sort_order);
}

function TagCheckbox({
  tag,
  selectedSlugs,
  onToggle,
  depth = 0,
}: {
  tag: Tag & { children: Tag[] };
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  depth?: number;
}) {
  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <label className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:text-primary">
        <input
          type="checkbox"
          checked={selectedSlugs.includes(tag.slug)}
          onChange={() => onToggle(tag.slug)}
          className="rounded border-muted-foreground"
        />
        {tag.icon && <span className="material-symbols-outlined text-[16px]">{tag.icon}</span>}
        {tag.name}
      </label>
      {tag.children.map((child) => (
        <TagCheckbox
          key={child.id}
          tag={child as Tag & { children: Tag[] }}
          selectedSlugs={selectedSlugs}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function IdeaFilterSidebar() {
  const { filters, setFilter, resetFilters } = useIdeaStore();
  const { data: tags } = useTags();
  const { data: scoutLevels } = useScoutLevels();
  const [mobileOpen, setMobileOpen] = useState(false);

  const tagTree = tags ? buildTagTree(tags) : [];
  const selectedTagSlugs = (filters.tag_slugs as string[]) ?? [];
  const selectedScoutIds = (filters.scout_level_ids as number[]) ?? [];

  function toggleTag(slug: string) {
    const next = selectedTagSlugs.includes(slug)
      ? selectedTagSlugs.filter((x) => x !== slug)
      : [...selectedTagSlugs, slug];
    setFilter('tag_slugs', next.length ? next : undefined);
  }

  function toggleScoutLevel(id: number) {
    const next = selectedScoutIds.includes(id)
      ? selectedScoutIds.filter((x) => x !== id)
      : [...selectedScoutIds, id];
    setFilter('scout_level_ids', next.length ? next : undefined);
  }

  const selectedIdeaTypes: string[] = filters.idea_type ?? IDEA_TYPE_OPTIONS.map((o) => o.value);
  const allTypesSelected = selectedIdeaTypes.length === IDEA_TYPE_OPTIONS.length;

  function toggleIdeaType(value: string) {
    const next = selectedIdeaTypes.includes(value)
      ? selectedIdeaTypes.filter((v) => v !== value)
      : [...selectedIdeaTypes, value];
    setFilter('idea_type', next.length === IDEA_TYPE_OPTIONS.length ? undefined : next.length ? next : undefined);
  }

  const hasActiveFilters = selectedTagSlugs.length > 0 || selectedScoutIds.length > 0 || filters.difficulty || filters.costs_rating || filters.execution_time || (filters.idea_type && !allTypesSelected);

  const activeFilterCount = selectedTagSlugs.length + selectedScoutIds.length + (filters.difficulty ? 1 : 0) + (filters.costs_rating ? 1 : 0) + (filters.execution_time ? 1 : 0) + (filters.idea_type && !allTypesSelected ? filters.idea_type.length : 0);

  return (
    <aside className="w-full md:w-64 shrink-0">
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-card rounded-xl border p-4 mb-2 font-semibold text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
          Filter {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-white text-xs px-1.5">
              {activeFilterCount}
            </span>
          )}
        </span>
        <span className={`material-symbols-outlined text-[20px] transition-transform ${mobileOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden md:block'}`}>
      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              Aktive Filter
            </span>
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-destructive hover:underline">
              <span className="material-symbols-outlined text-[14px]">close</span>
              Löschen
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.idea_type && !allTypesSelected && filters.idea_type.map((val) => {
              const opt = IDEA_TYPE_OPTIONS.find((o) => o.value === val);
              return opt ? (
                <button
                  key={val}
                  onClick={() => toggleIdeaType(val)}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 px-2.5 py-1 text-xs font-medium hover:bg-violet-100 transition-colors"
                >
                  {opt.label}
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              ) : null;
            })}
            {tags && selectedTagSlugs.map((slug) => {
              const tag = tags.find((t) => t.slug === slug);
              return tag ? (
                <button
                  key={slug}
                  onClick={() => toggleTag(slug)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {tag.name}
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              ) : null;
            })}
            {scoutLevels && selectedScoutIds.map((id) => {
              const level = scoutLevels.find((s) => s.id === id);
              return level ? (
                <button
                  key={id}
                  onClick={() => toggleScoutLevel(id)}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  {level.name}
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Idea Type */}
      <div className="bg-card rounded-xl border-l-4 border-l-violet-500 border p-4 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
          <span className="material-symbols-outlined text-violet-500 text-[18px]">category</span>
          <span className="text-violet-600">Typ</span>
        </h3>
        {IDEA_TYPE_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
            <input
              type="checkbox"
              checked={selectedIdeaTypes.includes(opt.value)}
              onChange={() => toggleIdeaType(opt.value)}
              className="rounded border-muted-foreground accent-primary"
            />
            <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
            {opt.label}
          </label>
        ))}
      </div>

      {/* Themen – only topic tags (children of "thema" parent) */}
      {(() => {
        const topicRoot = tagTree.find((t) => t.slug === 'thema');
        const topicChildren = topicRoot?.children ?? [];
        return topicChildren.length > 0 ? (
          <div className="bg-card rounded-xl border-l-4 border-l-primary border p-4 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
              <span className="material-symbols-outlined text-primary text-[18px]">label</span>
              <span className="bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] bg-clip-text text-transparent">Themen</span>
            </h3>
            <div className="max-h-64 overflow-y-auto pr-1">
              {topicChildren.map((tag) => (
                <TagCheckbox key={tag.id} tag={tag as Tag & { children: Tag[] }} selectedSlugs={selectedTagSlugs} onToggle={toggleTag} />
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Other tag categories – each parent with children gets its own box */}
      {tagTree
        .filter((t) => t.slug !== 'thema' && t.children.length > 0)
        .map((category) => (
          <div key={category.id} className="bg-card rounded-xl border-l-4 border-l-primary/60 border p-4 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
              {category.icon && <span className="material-symbols-outlined text-primary/60 text-[18px]">{category.icon}</span>}
              {!category.icon && <span className="material-symbols-outlined text-primary/60 text-[18px]">category</span>}
              <span className="text-primary/80">{category.name}</span>
            </h3>
            <div className="max-h-64 overflow-y-auto pr-1">
              {category.children.map((child) => (
                <TagCheckbox key={child.id} tag={child as Tag & { children: Tag[] }} selectedSlugs={selectedTagSlugs} onToggle={toggleTag} />
              ))}
            </div>
          </div>
        ))}

      {/* Scout Levels */}
      {scoutLevels && (
        <div className="bg-card rounded-xl border-l-4 border-l-blue-500 border p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
            <span className="material-symbols-outlined text-blue-500 text-[18px]">groups</span>
            <span className="text-blue-600">Stufe</span>
          </h3>
          {scoutLevels.map((level) => (
            <label key={level.id} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
              <input
                type="checkbox"
                checked={selectedScoutIds.includes(level.id)}
                onChange={() => toggleScoutLevel(level.id)}
                className="rounded border-muted-foreground accent-primary"
              />
              {level.icon && <span className="material-symbols-outlined text-[16px]">{level.icon}</span>}
              {level.name}
            </label>
          ))}
        </div>
      )}

      {/* Difficulty */}
      <div className="bg-card rounded-xl border-l-4 border-l-accent border p-4 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
          <span className="material-symbols-outlined text-accent text-[18px]">signal_cellular_alt</span>
          <span className="text-accent">Schwierigkeit</span>
        </h3>
        {DIFFICULTY_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
            <input
              type="radio"
              name="difficulty"
              checked={filters.difficulty === opt.value}
              onChange={() => setFilter('difficulty', filters.difficulty === opt.value ? undefined : opt.value)}
              className="border-muted-foreground accent-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Costs */}
      <div className="bg-card rounded-xl border-l-4 border-l-secondary border p-4 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
          <span className="material-symbols-outlined text-secondary text-[18px]">payments</span>
          <span className="text-[hsl(45,93%,45%)]">Kosten</span>
        </h3>
        {COSTS_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
            <input
              type="radio"
              name="costs"
              checked={filters.costs_rating === opt.value}
              onChange={() => setFilter('costs_rating', filters.costs_rating === opt.value ? undefined : opt.value)}
              className="border-muted-foreground accent-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Duration */}
      <div className="bg-card rounded-xl border-l-4 border-l-[hsl(174,60%,41%)] border p-4 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
          <span className="material-symbols-outlined text-[hsl(174,60%,41%)] text-[18px]">schedule</span>
          <span className="text-[hsl(174,60%,41%)]">Dauer</span>
        </h3>
        {EXECUTION_TIME_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
            <input
              type="radio"
              name="duration"
              checked={filters.execution_time === opt.value}
              onChange={() => setFilter('execution_time', filters.execution_time === opt.value ? undefined : opt.value)}
              className="border-muted-foreground accent-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>
      </div>
    </aside>
  );
}
