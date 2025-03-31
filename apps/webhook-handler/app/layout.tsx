import React from 'react';
import { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Ghost Meilisearch',
  description: 'A powerful search integration for Ghost CMS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/styles.css" />
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #15171a;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
          header {
            margin-bottom: 40px;
            text-align: center;
          }
          
          h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
          }
          
          .subtitle {
            font-size: 1.2rem;
            color: #738a94;
          }
          
          .search-trigger {
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            background-color: #f5f5f5;
            border: 1px solid #dae0e5;
            border-radius: 4px;
            font-size: 14px;
            color: #15171a;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .search-trigger:hover {
            background-color: #ebeef0;
            border-color: #c5d2db;
          }
          
          .search-trigger svg {
            margin-right: 8px;
          }
          
          .demo-section {
            margin-bottom: 40px;
          }
          
          .demo-section h2 {
            font-size: 1.8rem;
            margin-bottom: 20px;
          }
          
          .demo-section p {
            margin-bottom: 20px;
          }
          
          .keyboard-shortcuts {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
          }
          
          .keyboard-shortcut {
            display: flex;
            align-items: center;
          }
          
          .kbd {
            display: inline-block;
            padding: 4px 8px;
            font-size: 14px;
            line-height: 1;
            color: #738a94;
            background-color: #f5f5f5;
            border: 1px solid #dae0e5;
            border-radius: 3px;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
            margin-right: 8px;
          }
          
          .plus {
            margin: 0 8px;
            color: #738a94;
          }
          
          .config-example {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 4px;
            overflow-x: auto;
          }
          
          pre {
            margin: 0;
            font-family: monospace;
          }
          
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #212b36;
              color: #fff;
            }
            
            .subtitle {
              color: #8b9cad;
            }
            
            .search-trigger {
              background-color: #2c3642;
              border-color: #394351;
              color: #fff;
            }
            
            .search-trigger:hover {
              background-color: #394351;
              border-color: #4a5567;
            }
            
            .kbd {
              color: #8b9cad;
              background-color: #2c3642;
              border-color: #394351;
            }
            
            .plus {
              color: #8b9cad;
            }
            
            .config-example {
              background-color: #2c3642;
            }
          }
        `}</style>
      </head>
      <body>
        {children}
        
        <Script id="meilisearch-config" strategy="afterInteractive">
          {`
            window.__MS_SEARCH_CONFIG__ = {
              meilisearchHost: "https://meilisearch.fanyangmeng.blog/",
              meilisearchApiKey: "2f7dda2f9e23c3a842ecde52401cb088d76d0f6bae28b523b9717f293705aaa6",
              indexName: "ghost_posts",
              theme: "system",
              enableHighlighting: true,
              enableAiSearch: true,
              aiSearchEmbedder: "ghost-posts-openai",
              aiSearchLimit: 3
            };
          `}
        </Script>
        <Script src="/search.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
} 