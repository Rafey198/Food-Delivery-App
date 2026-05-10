import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toasts } from '@/components/Toasts';
import { SupportWidget } from '@/components/SupportWidget';

export const metadata: Metadata = {
  title: 'FoodPilot — Order food, fast',
  description:
    'Order from the best local restaurants with AI-powered recommendations, live tracking, and transparent fees.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <Providers>
          {children}
          <Toasts />
          <SupportWidget />
        </Providers>
      </body>
    </html>
  );
}
