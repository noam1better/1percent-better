import './globals.css';

export const metadata = {
  title: 'Accounting Agent v2',
  description: 'AI-powered financial analysis with hallucination-proof validation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
