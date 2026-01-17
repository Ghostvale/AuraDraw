import { NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * 检查环境变量配置状态（调试用）
 * GET /api/admin/check
 */
export async function GET() {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const cronSecret = process.env.CRON_SECRET;
    const postgresUrl = process.env.POSTGRES_URL;

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        env: {
            ADMIN_PASSWORD: adminPassword ? `已配置 (${adminPassword.length}字符)` : '❌ 未配置',
            CRON_SECRET: cronSecret ? `已配置 (${cronSecret.length}字符)` : '❌ 未配置',
            POSTGRES_URL: postgresUrl ? '已配置' : '❌ 未配置',
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL ? '是' : '否',
        },
    });
}
