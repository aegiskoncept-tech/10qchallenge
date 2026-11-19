'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export function MathText({ content, className = '', inline = false }: MathTextProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    try {
      // Replace $$...$$ display math blocks
      let processed = content.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
        } catch {
          return `$$${math}$$`;
        }
      });

      // Replace $...$ and \(...\) inline math
      processed = processed.replace(/(?:\$([^\$]+?)\$|\\\(([\s\S]+?)\\\))/g, (_, m1, m2) => {
        const math = m1 || m2;
        try {
          return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        } catch {
          return `$${math}$`;
        }
      });

      return processed;
    } catch {
      return content;
    }
  }, [content]);

  const Tag = inline ? 'span' : 'div';

  return (
    <Tag
      className={`prose-sm max-w-none break-words text-[#17152A] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
