import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

/**
 * 数据库初始化 API
 * 用于首次部署时创建表结构
 * 
 * POST /api/db/init
 */
export async function POST(request: Request) {
    // 验证管理员密钥
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
    
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await initializeDatabase();
        
        return NextResponse.json({
            success: true,
            message: '数据库初始化成功',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Database initialization failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '初始化失败',
        }, { status: 500 });
    }
}

// GET 方法用于检查数据库状态
export async function GET() {
    return NextResponse.json({
        message: '请使用 POST 方法初始化数据库',
        endpoint: '/api/db/init',
    });
}
