import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("favale-ia-markdown prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Customiza os componentes de markdown
          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 last:mb-0 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 last:mb-0 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono border">
                  {children}
                </code>
              );
            }
            return (
              <code className={className}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted/80 p-4 rounded-lg overflow-x-auto text-sm mb-3 last:mb-0 border">
              {children}
            </pre>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-foreground">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-3 bg-muted/40 rounded-r mb-3 last:mb-0 italic">
              {children}
            </blockquote>
          ),
          // Adiciona suporte para bullet points personalizados
          text: ({ children }) => {
            if (typeof children === 'string') {
              // Substitui • por bullet points estilizados
              return children.replace(/•/g, '•');
            }
            return children;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
