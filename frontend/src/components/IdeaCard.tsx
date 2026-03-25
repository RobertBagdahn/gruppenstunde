import { Link } from 'react-router-dom';
import type { IdeaListItem } from '@/schemas/idea';
import { DIFFICULTY_OPTIONS, EXECUTION_TIME_OPTIONS, IDEA_TYPE_OPTIONS } from '@/schemas/idea';

interface IdeaCardProps {
  idea: IdeaListItem;
}

export default function IdeaCard({ idea }: IdeaCardProps) {
  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === idea.difficulty)?.label ?? idea.difficulty;
  const timeLabel =
    EXECUTION_TIME_OPTIONS.find((t) => t.value === idea.execution_time)?.label ??
    idea.execution_time;
  const typeOpt = IDEA_TYPE_OPTIONS.find((o) => o.value === idea.idea_type);

  return (
    <Link
      to={`/idea/${idea.slug}`}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border/50 hover:border-primary/40 hover:shadow-colorful"
    >
      {/* Image with gradient overlay */}
      <div className="relative overflow-hidden">
        <img
          src={idea.image_url || '/images/inspi_flying.png'}
          alt={idea.title}
          loading="lazy"
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-[hsl(142,60%,42%)]/10" />
        {/* Like badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold text-rose-500 shadow-md">
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          {idea.like_score}
        </div>
        {/* Type badge (only for non-idea types) */}
        {typeOpt && idea.idea_type !== 'idea' && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold text-violet-600 shadow-md">
            <span className="material-symbols-outlined text-[14px]">{typeOpt.icon}</span>
            {typeOpt.label}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-extrabold text-base group-hover:text-primary transition-colors line-clamp-2">
          {idea.title}
        </h3>

        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{idea.summary}</p>

        {/* Tags – more colorful */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {idea.tags.slice(0, 3).map((tag, index) => {
            const tagColors = [
              'bg-primary/15 text-primary border border-primary/20',
              'bg-[hsl(174,60%,41%)]/15 text-[hsl(174,60%,41%)] border border-[hsl(174,60%,41%)]/20',
              'bg-accent/15 text-accent border border-accent/20',
              'bg-violet-500/15 text-violet-600 border border-violet-500/20',
              'bg-rose-500/15 text-rose-600 border border-rose-500/20',
            ];
            return (
              <span
                key={tag.id}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tagColors[index % tagColors.length]}`}
              >
                {tag.icon && <span className="material-symbols-outlined text-[14px] mr-1">{tag.icon}</span>}
                {tag.name}
              </span>
            );
          })}
          {idea.tags.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30 px-2.5 py-0.5 text-xs font-bold">
              +{idea.tags.length - 3}
            </span>
          )}
        </div>

        {/* Meta info – with colored icon badges */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-[hsl(174,60%,41%)]/10 rounded-full px-2.5 py-1">
            <span className="material-symbols-outlined text-[16px] text-[hsl(174,60%,41%)]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            {timeLabel}
          </span>
          <span className="flex items-center gap-1.5 bg-accent/10 rounded-full px-2.5 py-1">
            <span className="material-symbols-outlined text-[16px] text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>signal_cellular_alt</span>
            {difficultyLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
