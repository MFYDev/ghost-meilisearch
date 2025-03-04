import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Ghost Meilisearch Webhook Handler</h1>
      <p className="text-lg">
        This service handles webhooks from Ghost CMS and updates the Meilisearch index accordingly.
      </p>
      <p className="mt-4 text-sm text-gray-500">
        The webhook endpoint is available at <code>/api/webhook</code>
      </p>
    </main>
  );
} 