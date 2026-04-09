/**
 * ContentComments — Generic comment section with threaded replies.
 * Works with any content type.
 */
import { useState } from 'react';
import type { ContentComment } from '@/schemas/content';

interface ContentCommentsProps {
  /** Comments from the API (top-level with nested replies) */
  comments: ContentComment[];
  /** Callback when a new comment is submitted */
  onSubmit: (data: { text: string; author_name?: string; parent_id?: number | null }) => void;
  /** Whether the submit mutation is pending */
  isPending?: boolean;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
}

function CommentItem({
  comment,
  depth,
  onReply,
}: {
  comment: ContentComment;
  depth: number;
  onReply: (parentId: number) => void;
}) {
  const timeAgo = formatTimeAgo(comment.created_at);

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-border/40 pl-4' : ''}>
      <div className="py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-foreground">
            {comment.user_display_name || comment.author_name || 'Anonym'}
          </span>
          <span className="text-muted-foreground text-xs">{timeAgo}</span>
          {comment.status === 'pending' && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
              Ausstehend
            </span>
          )}
        </div>
        <p className="text-sm text-foreground mt-1">{comment.text}</p>
        <button
          type="button"
          onClick={() => onReply(comment.id)}
          className="text-xs text-muted-foreground hover:text-primary mt-1 font-semibold"
        >
          Antworten
        </button>
      </div>

      {comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          onReply={onReply}
        />
      ))}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContentComments({
  comments,
  onSubmit,
  isPending = false,
  isAuthenticated = false,
}: ContentCommentsProps) {
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSubmit({
      text: text.trim(),
      author_name: isAuthenticated ? undefined : authorName.trim() || undefined,
      parent_id: replyTo,
    });
    setText('');
    setReplyTo(null);
  };

  const handleReply = (parentId: number) => {
    setReplyTo(parentId);
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">
        Kommentare
        {comments.length > 0 && (
          <span className="text-muted-foreground font-normal ml-2">({comments.length})</span>
        )}
      </h3>

      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-1 mb-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              onReply={handleReply}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-6">
          Noch keine Kommentare. Schreibe den ersten!
        </p>
      )}

      {/* Reply indicator */}
      {replyTo !== null && (
        <div className="flex items-center gap-2 mb-2 text-sm text-primary">
          <span className="material-symbols-outlined text-[16px]">reply</span>
          <span>Antwort auf Kommentar</span>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isAuthenticated && (
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Dein Name (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Schreibe einen Kommentar..."
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isAuthenticated
              ? 'Dein Kommentar wird sofort veroeffentlicht.'
              : 'Anonyme Kommentare werden nach Pruefung freigeschaltet.'}
          </p>
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">send</span>
            )}
            Senden
          </button>
        </div>
      </form>
    </div>
  );
}
