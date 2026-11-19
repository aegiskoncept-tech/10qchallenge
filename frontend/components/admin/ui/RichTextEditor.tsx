'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Code,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Eraser,
  Eye,
} from 'lucide-react';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter detailed course description, curriculum breakdown, and learning objectives...',
  minHeight = '240px',
  className = '',
}) => {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Synchronize incoming value into contentEditable when not in source mode
  useEffect(() => {
    if (!isSourceMode && editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isSourceMode]);

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (isSourceMode) return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      editorRef.current.focus();
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInsertLink = () => {
    if (isSourceMode) return;
    const url = prompt('Enter Web Link URL (e.g. https://... or /course-detail/...):', 'https://');
    if (url && url !== 'https://') {
      executeCommand('createLink', url);
    }
  };

  const handleInsertImage = () => {
    if (isSourceMode) return;
    const url = prompt('Enter Image Web URL or server path (e.g. /uploads/courses/banner.png):', '/uploads/courses/');
    if (url) {
      executeCommand('insertImage', url);
    }
  };

  const handleInsertTable = () => {
    if (isSourceMode) {
      const tableHtml = `\n<table class="w-full border-collapse border border-slate-300 my-4">\n  <thead>\n    <tr class="bg-slate-100">\n      <th class="border border-slate-300 p-2 text-left font-bold">Module</th>\n      <th class="border border-slate-300 p-2 text-left font-bold">Duration</th>\n      <th class="border border-slate-300 p-2 text-left font-bold">Topics</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class="border border-slate-300 p-2">Physics Part 1</td>\n      <td class="border border-slate-300 p-2">20 Hours</td>\n      <td class="border border-slate-300 p-2">Mechanics & Fluids</td>\n    </tr>\n  </tbody>\n</table>\n`;
      onChange(value + tableHtml);
    } else {
      const tableHtml = `<table style="width:100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin: 12px 0;"><thead><tr style="background:#f1f5f9;"><th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Module</th><th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Duration</th><th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Topics Covered</th></tr></thead><tbody><tr><td style="border: 1px solid #cbd5e1; padding: 8px;">Physics Part 1</td><td style="border: 1px solid #cbd5e1; padding: 8px;">20 Hours</td><td style="border: 1px solid #cbd5e1; padding: 8px;">Mechanics & Fluids</td></tr></tbody></table>`;
      executeCommand('insertHTML', tableHtml);
    }
  };

  return (
    <div className={`border border-[#E3E8F0] rounded-xl overflow-hidden bg-white shadow-subtle ${className}`}>
      {/* Formatting Toolbar */}
      <div className="bg-[#F8FAFC] border-b border-[#E3E8F0] p-2 flex flex-wrap items-center gap-1 text-[#172B4D] select-none">
        {/* Source / WYSIWYG Toggle */}
        <button
          type="button"
          onClick={() => setIsSourceMode(!isSourceMode)}
          className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors ${
            isSourceMode ? 'bg-[#14233F] text-white' : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Toggle Source HTML View"
        >
          {isSourceMode ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
          <span>{isSourceMode ? 'Visual View' : 'Source'}</span>
        </button>

        <span className="w-px h-4 bg-slate-300 mx-0.5" />

        {/* Undo / Redo */}
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('undo')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Undo"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('redo')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Redo"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-0.5" />

        {/* Heading Levels */}
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('formatBlock', '<h3>')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-0.5" />

        {/* Inline Formatting */}
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('bold')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors font-bold"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('italic')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors italic"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('underline')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors underline"
          title="Underline"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('strikeThrough')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-0.5" />

        {/* Lists */}
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-0.5" />

        {/* Alignments */}
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('justifyLeft')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Align Left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('justifyCenter')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Align Center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('justifyRight')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Align Right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('justifyFull')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Justify"
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-300 mx-0.5" />

        {/* Insert Elements */}
        <button
          type="button"
          disabled={isSourceMode}
          onClick={handleInsertLink}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Insert Link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={handleInsertImage}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors"
          title="Insert Image"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleInsertTable}
          className="p-1.5 hover:bg-slate-200 rounded cursor-pointer transition-colors"
          title="Insert Table"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={isSourceMode}
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-40 rounded cursor-pointer transition-colors ml-auto"
          title="Clear Formatting"
        >
          <Eraser className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Editor Body */}
      {isSourceMode ? (
        <textarea
          rows={10}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter raw HTML code here..."
          className="w-full p-4 font-mono text-xs bg-slate-900 text-amber-300 focus:outline-none resize-y leading-relaxed"
          style={{ minHeight }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="p-4 text-xs font-normal focus:outline-none text-slate-800 leading-relaxed overflow-y-auto prose prose-sm max-w-none"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      {/* Brand Accent Bottom Strip */}
      <div className="h-1.5 bg-[#1455C0] w-full" />
    </div>
  );
};
