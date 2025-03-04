import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ghost Meilisearch Webhook Handler',
  description: 'Webhook handler for Ghost-Meilisearch integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 