import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  height?: number;
  preview?: 'edit' | 'preview' | 'live';
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  height = 300,
  preview = 'live',
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? '')}
        preview={preview}
        height={height}
        textareaProps={{
          placeholder: placeholder ?? 'Schreibe hier in Markdown...',
        }}
        visibleDragbar={false}
      />
    </div>
  );
}
