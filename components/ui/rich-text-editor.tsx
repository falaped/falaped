"use client"

import { useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Italic, List, ListOrdered } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

/**
 * Converts plain text to a single paragraph HTML for Tiptap.
 * If value looks like HTML (contains '<'), use as-is; otherwise wrap in <p>.
 */
function toEditorContent(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "<p></p>"
  if (trimmed.startsWith("<")) return trimmed
  return "<p>" + trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>"
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "80px",
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const lastEmittedRef = useRef<string>(value)
  const [, setToolbarUpdate] = useState(0)

  const editor = useEditor({
    extensions: [StarterKit],
    content: toEditorContent(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[var(--min-height)] px-3 py-2 text-foreground [&_p]:mb-2 [&_p:last-child]:mb-0",
        ...(placeholder && { "data-placeholder": placeholder }),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      lastEmittedRef.current = html
      onChangeRef.current(html)
    },
  })

  useEffect(() => {
    if (!editor) return
    const handler = () => setToolbarUpdate((n) => n + 1)
    editor.on("selectionUpdate", handler)
    return () => editor.off("selectionUpdate", handler)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const content = toEditorContent(value)
    if (content !== lastEmittedRef.current) {
      lastEmittedRef.current = content
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-md border border-input bg-background text-sm text-muted-foreground",
          className,
        )}
        style={{ minHeight }}
      >
        <div className="px-3 py-2" style={{ minHeight }}>
          {placeholder ?? ""}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
      style={{ minHeight: `var(--min-height, ${minHeight})`, ["--min-height" as string]: minHeight }}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("bold") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("italic") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="rich-text-editor-content" />
    </div>
  )
}
