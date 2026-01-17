import { NextRequest, NextResponse } from 'next/server';
import { 
    initializeDatabase, 
    batchInsertLotteryResults, 
    getSyncStatus, 
    updateSyncStatus,
    getResultsCount,
    type LotteryResultInput 
} from '@/lib/db';
import { fetchLotteryHistory, type LotteryDrawData } from '@/lib/lottery-api';

// 验证管理员 token
function verifyAdminToken(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!authHeader || !adminPassword) return false;
    
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [password] = decoded.split(':');
        return password === adminPassword;
    } catch {
        return false;
    }
}

// 转换数据格式
function transformToDbFormat(data: LotteryDrawData[]): LotteryResultInput[] {
    return data.map(item => ({
        lottery_code: item.lotteryCode,
        issue: item.issue,
        draw_date: item.drawDate,
        main_numbers: item.mainNumbers,
        extra_numbers: item.extraNumbers || undefined,
        prize_pool: item.prizePool || undefined,
        total_sales: item.totalSales || undefined,
        raw_data: item.rawData as unknown as Record<string, unknown>,
    }));
}

/**
 * 获取同步状态
 * GET /api/admin/sync?action=status&code=dlt
 */
export async function GET(request: NextRequest) {
    if (!verifyAdminToken(request)) {
        return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const code = searchParams.get('code') || 'dlt';

    try {
        if (action === 'status') {
            const syncStatus = await getSyncStatus(code);
            const count = await getResultsCount(code);
            
            return NextResponse.json({
                success: true,
                data: {
                    syncStatus,
                    recordCount: count,
                },
            });
        }

        return NextResponse.json({
            success: false,
            error: '未知操作',
        }, { status: 400 });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '操作失败',
        }, { status: 500 });
    }
}

/**
 * 执行同步操作
 * POST /api/admin/sync
 * body: { action: 'init' | 'sync', code?: string, page?: number, limit?: number }
 */
export async function POST(request: NextRequest) {
    if (!verifyAdminToken(request)) {
        return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action, code = 'dlt', page = 1, limit = 50 } = body;

        if (action === 'init') {
            // 初始化数据库
            await initializeDatabase();
            return NextResponse.json({
                success: true,
                message: '数据库初始化成功',
            });
        }

        if (action === 'sync') {
            // 同步数据
            console.log(`[Admin] Syncing ${code}, page ${page}, limit ${limit}`);
            
            const result = await fetchLotteryHistory(code, page, limit);
            
            if (!result.success) {
                return NextResponse.json({
                    success: false,
                    error: result.error || '获取数据失败',
                    apiError: true,
                });
            }

            if (result.data.length === 0) {
                return NextResponse.json({
                    success: true,
                    message: '没有更多数据',
                    inserted: 0,
                    fetched: 0,
                });
            }

            // 插入数据库
            const dbData = transformToDbFormat(result.data);
            const insertedCount = await batchInsertLotteryResults(dbData);

            // 更新同步状态
            const latestIssue = result.data[0]?.issue;
            const oldestIssue = result.data[result.data.length - 1]?.issue;
            
            await updateSyncStatus(code, {
                last_synced_issue: latestIssue,
                last_synced_date: result.data[0]?.drawDate ? new Date(result.data[0].drawDate) : undefined,
                oldest_synced_issue: oldestIssue,
                is_history_complete: result.data.length < limit,
            });

            return NextResponse.json({
                success: true,
                message: `同步完成`,
                fetched: result.data.length,
                inserted: insertedCount,
                latestIssue,
                oldestIssue,
                hasMore: result.data.length >= limit,
            });
        }

        if (action === 'reset') {
            // 重置同步状态（不删除数据）
            await updateSyncStatus(code, {
                is_history_complete: false,
            });
            return NextResponse.json({
                success: true,
                message: '同步状态已重置',
            });
        }

        return NextResponse.json({
            success: false,
            error: '未知操作',
        }, { status: 400 });
    } catch (error) {
        console.error('[Admin] Sync error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '操作失败',
        }, { status: 500 });
    }
}
