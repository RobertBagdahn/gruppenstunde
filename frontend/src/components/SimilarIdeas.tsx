import { Link } from 'react-router-dom';
import { useSimilarIdeas } from '@/api/ideas';

interface SimilarIdeasProps {
  ideaId: number;
}

export default function SimilarIdeas({ ideaId }: SimilarIdeasProps) {
  const { data: similar } = useSimilarIdeas(ideaId);

  if (!similar || similar.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
        <span className="material-symbols-outlined text-[hsl(174,60%,41%)]">auto_awesome</span>
        Ähnliche Ideen
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {similar.map((item) => (
          <Link
            key={item.id}
            to={`/idea/${item.slug}`}
            className="group block rounded-xl bg-card border overflow-hidden card-hover"
          >
            <div className="relative overflow-hidden">
              <img
                src={item.image_url || '/images/inspi_flying.png'}
                alt={item.title}
                loading="lazy"
                className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
