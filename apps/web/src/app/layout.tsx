import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { UserWidget } from '@/components/UserWidget';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'BosDB - Browser-based Database Manager',
    description: 'Production-grade web-based database management tool',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    {children}
                    <UserWidget />
                </Providers>
            </body>
        </html>
    );
}
