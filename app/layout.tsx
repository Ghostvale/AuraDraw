import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { ThemeToggle } from '@/components/ThemeToggle';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'AuraDraw - 大气随机工具平台',
    description: '使用大气随机数生成真随机数，支持随机数生成、彩票号码等多种场景',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN">
            <body className={outfit.className}>
                <ThemeToggle />
                {children}
            </body>
        </html>
    );
}
