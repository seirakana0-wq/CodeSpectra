import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeReview AI — Instant AI Code Review',
  description:
    'Paste a GitHub repo, PR, or file URL. Get an instant AI code review covering security, performance, and architecture. No login. No tracking.',
  openGraph: {
    title: 'CodeReview AI',
    description: 'Instant AI code review. Paste URL, get verdict.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink text-bone antialiased">
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
