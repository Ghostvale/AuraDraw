import { NextRequest, NextResponse } from 'next/server';
import { getLotteryResults, getResultsCount, getLatestResult } from '@/lib/db';

/**
 * 查询彩票历史开奖数据 API
 * 
 * GET /api/lottery/history?code=dlt&limit=10&offset=0
 * GET /api/lottery/history?code=dlt&issue=2026001
 * GET /api/lottery/history?code=dlt&startDate=2026-01-01&endDate=2026-01-14
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    
    const code = searchParams.get('code');
    const issue = searchParams.get('issue');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!code) {
        return NextResponse.json(
            { success: false, error: '缺少彩种代码参数 (code)' },
            { status: 400 }
        );
    }

    try {
        // 获取数据
        const results = await getLotteryResults(code, {
            limit: Math.min(limit, 100), // 最多返回100条
            offset,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            issue: issue || undefined,
        });

        // 获取总数（仅在分页查询时）
        let total = results.length;
        if (!issue) {
            total = await getResultsCount(code);
        }

        // 格式化返回数据
        const formattedResults = results.map(r => {
            // 格式化日期时间为 YYYY-MM-DD HH:mm:ss 格式
            let formattedDateTime = r.draw_date_time;
            if (!formattedDateTime && r.draw_date) {
                // 如果没有完整时间，使用日期 + 默认时间
                const dateStr = r.draw_date instanceof Date 
                    ? r.draw_date.toISOString().split('T')[0]
                    : String(r.draw_date).split('T')[0];
                formattedDateTime = `${dateStr} 21:30:00`;
            }
            
            return {
                issue: r.issue,
                drawDate: formattedDateTime || r.draw_date,  // 使用完整日期时间
                mainNumbers: r.main_numbers.split(',').map(n => n.trim()),
                extraNumbers: r.extra_numbers?.split(',').map(n => n.trim()) || [],
                prizePool: r.prize_pool,
                totalSales: r.total_sales,
            };
        });

        return NextResponse.json({
            success: true,
            data: formattedResults,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + results.length < total,
            },
        });
    } catch (error) {
        console.error('Failed to fetch lottery history:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : '查询失败' 
            },
            { status: 500 }
        );
    }
}
