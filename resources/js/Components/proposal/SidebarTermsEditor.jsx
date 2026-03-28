import React from 'react';
import { FileText } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function SidebarTermsEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    // Tiptap works with HTML internally
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="text-emerald-500" size={18} />
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Terms & Conditions
        </h3>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-t-lg">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`w-7 h-7 rounded flex items-center justify-center font-black text-[12px] transition-all
            ${editor.isActive('bold')
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'}`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`w-7 h-7 rounded flex items-center justify-center font-bold italic text-[12px] transition-all
            ${editor.isActive('italic')
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'}`}
          title="Italic"
        >
          I
        </button>
      </div>

      {/* Editor — user sees formatted text, not tags */}
      <EditorContent
        editor={editor}
        className="w-full min-h-[12rem] px-4 py-3 bg-slate-50 border border-slate-200 border-t-0 rounded-b-lg
          text-[11px] font-medium text-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/20
          focus-within:border-emerald-500 transition-all leading-relaxed outline-none
          [&_.tiptap]:outline-none [&_.tiptap]:min-h-[10rem]"
      />

      <p className="mt-2 text-[10px] text-slate-400 italic">
        Each line is one term. Select text then click B or I to format.
      </p>
    </div>
  );
}