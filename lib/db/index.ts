import { sql } from '@vercel/postgres';

// ============================================
// 彩票类型相关操作
// ============================================

export interface LotteryType {
    id: number;
    code: string;
    name: string;
    category: 'sports' | 'welfare';
    main_count: number;
    main_range_start: number;
    main_range_end: number;
    extra_count: number;
    extra_range_start: number;
    extra_range_end: number;
    draw_time: string;
    draw_days: string;
    is_active: boolean;
}

export async function getLotteryTypes(): Promise<LotteryType[]> {
    const { rows } = await sql<LotteryType>`
        SELECT * FROM lottery_types WHERE is_active = TRUE ORDER BY category, id
    `;
    return rows;
}

export async function getLotteryTypeByCode(code: string): Promise<LotteryType | null> {
    const { rows } = await sql<LotteryType>`
        SELECT * FROM lottery_types WHERE code = ${code} AND is_active = TRUE
    `;
    return rows[0] || null;
}

// ============================================
// 开奖结果相关操作
// ============================================

export interface LotteryResult {
    id: number;
    lottery_code: string;
    issue: string;
    draw_date: Date;
    draw_date_time: string | null;  // 完整日期时间 YYYY-MM-DD HH:mm:ss
    main_numbers: string;
    extra_numbers: string | null;
    prize_pool: number | null;
    total_sales: number | null;
    raw_data: Record<string, unknown> | null;
    created_at: Date;
}

export interface LotteryResultInput {
    lottery_code: string;
    issue: string;
    draw_date: string;
    draw_date_time?: string;  // 完整日期时间 YYYY-MM-DD HH:mm:ss
    main_numbers: string;
    extra_numbers?: string;
    prize_pool?: number;
    total_sales?: number;
    raw_data?: Record<string, unknown>;
}

// 批量插入开奖结果（忽略重复，或更新 draw_date_time）
export async function batchInsertLotteryResults(results: LotteryResultInput[]): Promise<number> {
    if (results.length === 0) return 0;

    let insertedCount = 0;

    for (const result of results) {
        try {
            await sql`
                INSERT INTO lottery_results (
                    lottery_code, issue, draw_date, draw_date_time, main_numbers, extra_numbers, 
                    prize_pool, total_sales, raw_data
                ) VALUES (
                    ${result.lottery_code},
                    ${result.issue},
                    ${result.draw_date},
                    ${result.draw_date_time || null},
                    ${result.main_numbers},
                    ${result.extra_numbers || null},
                    ${result.prize_pool || null},
                    ${result.total_sales || null},
                    ${result.raw_data ? JSON.stringify(result.raw_data) : null}
                )
                ON CONFLICT (lottery_code, issue) DO UPDATE SET
                    draw_date_time = COALESCE(EXCLUDED.draw_date_time, lottery_results.draw_date_time),
                    prize_pool = COALESCE(EXCLUDED.prize_pool, lottery_results.prize_pool),
                    total_sales = COALESCE(EXCLUDED.total_sales, lottery_results.total_sales),
                    raw_data = COALESCE(EXCLUDED.raw_data, lottery_results.raw_data),
                    updated_at = NOW()
            `;
            insertedCount++;
        } catch (error) {
            console.error(`Failed to insert result for ${result.lottery_code} ${result.issue}:`, error);
        }
    }

    return insertedCount;
}

// 查询开奖结果
export async function getLotteryResults(
    lotteryCode: string,
    options: {
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
        issue?: string;
    } = {}
): Promise<LotteryResult[]> {
    const { limit = 10, offset = 0, startDate, endDate, issue } = options;

    // 如果指定了期号，精确查询
    if (issue) {
        const { rows } = await sql<LotteryResult>`
            SELECT * FROM lottery_results 
            WHERE lottery_code = ${lotteryCode} AND issue = ${issue}
        `;
        return rows;
    }

    // 如果指定了日期范围
    if (startDate && endDate) {
        const { rows } = await sql<LotteryResult>`
            SELECT * FROM lottery_results 
            WHERE lottery_code = ${lotteryCode} 
              AND draw_date >= ${startDate}
              AND draw_date <= ${endDate}
            ORDER BY draw_date DESC, issue DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        return rows;
    }

    // 默认查询最近N期
    const { rows } = await sql<LotteryResult>`
        SELECT * FROM lottery_results 
        WHERE lottery_code = ${lotteryCode}
        ORDER BY draw_date DESC, issue DESC
        LIMIT ${limit} OFFSET ${offset}
    `;
    return rows;
}

// 获取最新一期
export async function getLatestResult(lotteryCode: string): Promise<LotteryResult | null> {
    const { rows } = await sql<LotteryResult>`
        SELECT * FROM lottery_results 
        WHERE lottery_code = ${lotteryCode}
        ORDER BY draw_date DESC, issue DESC
        LIMIT 1
    `;
    return rows[0] || null;
}

// 获取总记录数
export async function getResultsCount(lotteryCode: string): Promise<number> {
    const { rows } = await sql<{ count: string }>`
        SELECT COUNT(*) as count FROM lottery_results WHERE lottery_code = ${lotteryCode}
    `;
    return parseInt(rows[0]?.count || '0', 10);
}

// ============================================
// 同步状态相关操作
// ============================================

export interface SyncStatus {
    id: number;
    lottery_code: string;
    last_synced_issue: string | null;
    last_synced_date: Date | null;
    oldest_synced_issue: string | null;
    is_history_complete: boolean;
    last_sync_at: Date | null;
    sync_count: number;
}

export async function getSyncStatus(lotteryCode: string): Promise<SyncStatus | null> {
    const { rows } = await sql<SyncStatus>`
        SELECT * FROM sync_status WHERE lottery_code = ${lotteryCode}
    `;
    return rows[0] || null;
}

export async function updateSyncStatus(
    lotteryCode: string,
    update: Partial<Omit<SyncStatus, 'id' | 'lottery_code' | 'created_at'>>
): Promise<void> {
    const { rows } = await sql<SyncStatus>`
        SELECT * FROM sync_status WHERE lottery_code = ${lotteryCode}
    `;

    // 将 Date 转换为 ISO 字符串
    const lastSyncedDate = update.last_synced_date 
        ? (update.last_synced_date instanceof Date 
            ? update.last_synced_date.toISOString().split('T')[0] 
            : update.last_synced_date)
        : null;

    if (rows.length === 0) {
        await sql`
            INSERT INTO sync_status (lottery_code, last_synced_issue, last_synced_date, oldest_synced_issue, is_history_complete, last_sync_at, sync_count)
            VALUES (${lotteryCode}, ${update.last_synced_issue || null}, ${lastSyncedDate}, ${update.oldest_synced_issue || null}, ${update.is_history_complete || false}, NOW(), 1)
        `;
    } else {
        await sql`
            UPDATE sync_status SET
                last_synced_issue = COALESCE(${update.last_synced_issue || null}, last_synced_issue),
                last_synced_date = COALESCE(${lastSyncedDate}, last_synced_date),
                oldest_synced_issue = COALESCE(${update.oldest_synced_issue || null}, oldest_synced_issue),
                is_history_complete = COALESCE(${update.is_history_complete}, is_history_complete),
                last_sync_at = NOW(),
                sync_count = sync_count + 1,
                updated_at = NOW()
            WHERE lottery_code = ${lotteryCode}
        `;
    }
}

// ============================================
// 数据库初始化
// ============================================

export async function initializeDatabase(): Promise<void> {
    // 创建彩种配置表
    await sql`
        CREATE TABLE IF NOT EXISTS lottery_types (
            id SERIAL PRIMARY KEY,
            code VARCHAR(20) NOT NULL UNIQUE,
            name VARCHAR(50) NOT NULL,
            category VARCHAR(20) NOT NULL,
            main_count INT NOT NULL,
            main_range_start INT NOT NULL DEFAULT 1,
            main_range_end INT NOT NULL,
            extra_count INT DEFAULT 0,
            extra_range_start INT DEFAULT 1,
            extra_range_end INT DEFAULT 0,
            draw_time VARCHAR(100),
            draw_days VARCHAR(50),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // 创建开奖记录表
    await sql`
        CREATE TABLE IF NOT EXISTS lottery_results (
            id SERIAL PRIMARY KEY,
            lottery_code VARCHAR(20) NOT NULL,
            issue VARCHAR(30) NOT NULL,
            draw_date DATE NOT NULL,
            draw_date_time VARCHAR(30),
            main_numbers VARCHAR(100) NOT NULL,
            extra_numbers VARCHAR(50),
            prize_pool BIGINT,
            total_sales BIGINT,
            raw_data JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(lottery_code, issue)
        )
    `;
    
    // 为旧表添加 draw_date_time 列（如果不存在）
    try {
        await sql`ALTER TABLE lottery_results ADD COLUMN IF NOT EXISTS draw_date_time VARCHAR(30)`;
    } catch {
        // 忽略错误（列可能已存在）
    }

    // 创建同步状态表
    await sql`
        CREATE TABLE IF NOT EXISTS sync_status (
            id SERIAL PRIMARY KEY,
            lottery_code VARCHAR(20) NOT NULL UNIQUE,
            last_synced_issue VARCHAR(30),
            last_synced_date DATE,
            oldest_synced_issue VARCHAR(30),
            is_history_complete BOOLEAN DEFAULT FALSE,
            last_sync_at TIMESTAMP,
            sync_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // 创建索引
    await sql`CREATE INDEX IF NOT EXISTS idx_lottery_results_code_date ON lottery_results(lottery_code, draw_date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lottery_results_code_issue ON lottery_results(lottery_code, issue DESC)`;

    // 初始化彩种数据
    const lotteryTypes = [
        { code: 'dlt', name: '大乐透', category: 'sports', main_count: 5, main_start: 1, main_end: 35, extra_count: 2, extra_start: 1, extra_end: 12, draw_time: '每周一、三、六 21:30', draw_days: '1,3,6' },
        { code: 'ssq', name: '双色球', category: 'welfare', main_count: 6, main_start: 1, main_end: 33, extra_count: 1, extra_start: 1, extra_end: 16, draw_time: '每周二、四、日 21:15', draw_days: '0,2,4' },
        { code: 'pl3', name: '排列3', category: 'sports', main_count: 3, main_start: 0, main_end: 9, extra_count: 0, extra_start: 0, extra_end: 0, draw_time: '每天 21:30', draw_days: '0,1,2,3,4,5,6' },
        { code: 'pl5', name: '排列5', category: 'sports', main_count: 5, main_start: 0, main_end: 9, extra_count: 0, extra_start: 0, extra_end: 0, draw_time: '每天 21:30', draw_days: '0,1,2,3,4,5,6' },
        { code: 'qxc', name: '七星彩', category: 'sports', main_count: 7, main_start: 0, main_end: 9, extra_count: 0, extra_start: 0, extra_end: 0, draw_time: '每周二、五、日 21:30', draw_days: '0,2,5' },
        { code: 'fc3d', name: '福彩3D', category: 'welfare', main_count: 3, main_start: 0, main_end: 9, extra_count: 0, extra_start: 0, extra_end: 0, draw_time: '每天 21:15', draw_days: '0,1,2,3,4,5,6' },
        { code: 'qlc', name: '七乐彩', category: 'welfare', main_count: 7, main_start: 1, main_end: 30, extra_count: 1, extra_start: 1, extra_end: 30, draw_time: '每周一、三、五 21:15', draw_days: '1,3,5' },
    ];

    for (const lt of lotteryTypes) {
        await sql`
            INSERT INTO lottery_types (code, name, category, main_count, main_range_start, main_range_end, extra_count, extra_range_start, extra_range_end, draw_time, draw_days)
            VALUES (${lt.code}, ${lt.name}, ${lt.category}, ${lt.main_count}, ${lt.main_start}, ${lt.main_end}, ${lt.extra_count}, ${lt.extra_start}, ${lt.extra_end}, ${lt.draw_time}, ${lt.draw_days})
            ON CONFLICT (code) DO NOTHING
        `;

        await sql`
            INSERT INTO sync_status (lottery_code)
            VALUES (${lt.code})
            ON CONFLICT (lottery_code) DO NOTHING
        `;
    }
}
