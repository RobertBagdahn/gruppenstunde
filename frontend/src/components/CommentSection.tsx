import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateContentComment } from '@/api/contentInteractions';
import type { ContentComment } from '@/schemas/content';

interface CommentSectionProps {
  contentType: string;
  contentId: number;
  apiBase: string;
  comments: ContentComment[] | undefined;
}

export default function CommentSection({ contentType, contentId, apiBase, comments }: CommentSectionProps) {
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const createComment = useCreateContentComment(contentType, contentId, apiBase);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    createComment.mutate(
      { text: text.trim(), author_name: authorName.trim() || undefined },
      {
        onSuccess: () => {
          setText('');
          setAuthorName('');
        },
      },
    );
  }

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
        <span className="material-symbols-outlined text-primary">forum</span>
        Kommentare
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6 space-y-3 bg-card rounded-xl border p-5">
        <input
          type="text"
          placeholder="Dein Name (optional)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <textarea
          placeholder="Schreibe einen Kommentar..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg border text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!text.trim() || createComment.isPending}
          className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-lg text-sm font-medium hover:shadow-glow disabled:opacity-50 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          {createComment.isPending ? 'Wird gesendet...' : 'Kommentar senden'}
        </button>
        {createComment.isSuccess && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
            Dein Kommentar wurde eingereicht und wird nach Prüfung angezeigt.
          </p>
        )}
      </form>

      {/* Comment List */}
      {comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">person</span>
                  {comment.user_id ? (
                    <Link
                      to={`/profile/name/${comment.user_id}`}
                      className="text-primary hover:underline"
                    >
                      {comment.author_name}
                    </Link>
                  ) : (
                    comment.author_name
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
              <p className="text-sm text-foreground/85">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
          Noch keine Kommentare. Sei der Erste!
        </p>
      )}
    </section>
  );
}
