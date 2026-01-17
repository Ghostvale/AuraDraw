import { NextRequest, NextResponse } from 'next/server';
import { getLatestResult } from '@/lib/db';

/**
 * 获取最新一期开奖数据 API
 * 
 * GET /api/lottery/latest?code=dlt
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json(
            { success: false, error: '缺少彩种代码参数 (code)' },
            { status: 400 }
        );
    }

    try {
        const result = await getLatestResult(code);

        if (!result) {
            return NextResponse.json({
                success: true,
                data: null,
                message: '暂无开奖数据',
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                issue: result.issue,
                drawDate: result.draw_date,
                mainNumbers: result.main_numbers.split(',').map(n => n.trim()),
                extraNumbers: result.extra_numbers?.split(',').map(n => n.trim()) || [],
                prizePool: result.prize_pool,
                totalSales: result.total_sales,
            },
        });
    } catch (error) {
        console.error('Failed to fetch latest lottery result:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : '查询失败' 
            },
            { status: 500 }
        );
    }
}
