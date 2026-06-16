import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BookButton from "../BookButton";

export default function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="blog-prose max-w-3xl mx-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("/")) {
              return (
                <Link href={href} className="site-link font-semibold">
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} className="site-link font-semibold" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          h2: ({ children }) => (
            <h2 className="font-bold text-brand text-2xl mt-10 mb-4 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-bold text-brand text-lg mt-6 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-600 leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2 mb-6">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-gray-600 leading-relaxed">
              <span className="text-accent mt-0.5 shrink-0">•</span>
              <span>{children}</span>
            </li>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      <div className="my-10 text-center">
        <BookButton />
      </div>
    </div>
  );
}
