import { NextResponse } from 'next/server';
import { 
    initializeDatabase, 
    batchInsertLotteryResults, 
    getSyncStatus, 
    updateSyncStatus,
    getLatestResult,
    type LotteryResultInput 
} from '@/lib/db';
import { fetchLotteryHistory, fetchAllHistory, type LotteryDrawData } from '@/lib/lottery-api';

// 配置：当前启用同步的彩种
const ENABLED_LOTTERY_CODES = ['dlt']; // 目前只同步大乐透

// 历史数据同步配置
const HISTORY_SYNC_CONFIG = {
    maxPagesPerSync: 10,  // 每次同步最多获取多少页历史数据
    pageSize: 50,         // 每页数据量
    incrementalLimit: 20, // 增量同步时获取的数据量
};

/**
 * 将 API 数据转换为数据库格式
 */
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
 * 同步单个彩种的数据
 */
async function syncLotteryData(lotteryCode: string): Promise<{
    success: boolean;
    inserted: number;
    mode: 'history' | 'incremental';
    error?: string;
}> {
    // 获取同步状态
    let syncStatus = await getSyncStatus(lotteryCode);
    
    // 判断是否需要进行历史数据同步
    const needHistorySync = !syncStatus?.is_history_complete;
    
    if (needHistorySync) {
        // 历史数据同步模式
        console.log(`[${lotteryCode}] Starting history sync...`);
        
        // 计算从哪一页开始获取
        const startPage = syncStatus?.sync_count 
            ? Math.floor(syncStatus.sync_count / HISTORY_SYNC_CONFIG.pageSize) + 1 
            : 1;
        
        const result = await fetchAllHistory(
            lotteryCode, 
            startPage + HISTORY_SYNC_CONFIG.maxPagesPerSync - 1,
            HISTORY_SYNC_CONFIG.pageSize
        );
        
        if (!result.success && result.data.length === 0) {
            return { 
                success: false, 
                inserted: 0, 
                mode: 'history',
                error: result.error 
            };
        }
        
        // 插入数据
        const dbData = transformToDbFormat(result.data);
        const insertedCount = await batchInsertLotteryResults(dbData);
        
        // 检查是否所有历史数据都已同步
        // 如果返回的数据量小于预期，说明已经没有更多历史数据
        const isHistoryComplete = result.data.length < HISTORY_SYNC_CONFIG.maxPagesPerSync * HISTORY_SYNC_CONFIG.pageSize;
        
        // 更新同步状态
        const latestIssue = result.data[0]?.issue;
        const oldestIssue = result.data[result.data.length - 1]?.issue;
        
        await updateSyncStatus(lotteryCode, {
            last_synced_issue: latestIssue,
            last_synced_date: result.data[0]?.drawDate ? new Date(result.data[0].drawDate) : undefined,
            oldest_synced_issue: oldestIssue,
            is_history_complete: isHistoryComplete,
        });
        
        console.log(`[${lotteryCode}] History sync completed. Inserted: ${insertedCount}, History complete: ${isHistoryComplete}`);
        
        return { 
            success: true, 
            inserted: insertedCount, 
            mode: 'history' 
        };
    } else {
        // 增量同步模式 - 只获取最新数据
        console.log(`[${lotteryCode}] Starting incremental sync...`);
        
        const result = await fetchLotteryHistory(
            lotteryCode, 
            1, 
            HISTORY_SYNC_CONFIG.incrementalLimit
        );
        
        if (!result.success) {
            return { 
                success: false, 
                inserted: 0, 
                mode: 'incremental',
                error: result.error 
            };
        }
        
        // 插入数据（重复数据会被忽略）
        const dbData = transformToDbFormat(result.data);
        const insertedCount = await batchInsertLotteryResults(dbData);
        
        // 更新同步状态
        if (result.data.length > 0) {
            await updateSyncStatus(lotteryCode, {
                last_synced_issue: result.data[0].issue,
                last_synced_date: new Date(result.data[0].drawDate),
            });
        }
        
        console.log(`[${lotteryCode}] Incremental sync completed. New records: ${insertedCount}`);
        
        return { 
            success: true, 
            inserted: insertedCount, 
            mode: 'incremental' 
        };
    }
}

/**
 * Cron Job 入口
 * 每天凌晨 3 点执行
 */
export async function GET(request: Request) {
    // 验证 Cron Secret（生产环境需要）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // 如果设置了 CRON_SECRET，则验证
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== Lottery Sync Cron Job Started ===');
    console.log(`Time: ${new Date().toISOString()}`);
    
    const results: Record<string, {
        success: boolean;
        inserted: number;
        mode: string;
        error?: string;
    }> = {};

    try {
        // 初始化数据库（确保表存在）
        await initializeDatabase();
        console.log('Database initialized');

        // 同步所有启用的彩种
        for (const lotteryCode of ENABLED_LOTTERY_CODES) {
            console.log(`\nSyncing ${lotteryCode}...`);
            results[lotteryCode] = await syncLotteryData(lotteryCode);
        }

        console.log('\n=== Lottery Sync Cron Job Completed ===');
        console.log('Results:', JSON.stringify(results, null, 2));

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results,
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({
            success: false,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            results,
        }, { status: 500 });
    }
}

// 支持手动触发（开发调试用）
export async function POST(request: Request) {
    return GET(request);
}
