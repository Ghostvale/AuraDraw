import { NextRequest, NextResponse } from 'next/server';
import { getLotteryResults } from '@/lib/db';

/**
 * 大乐透中奖等级判断
 * 返回中奖等级（1-9）或 0（未中奖）
 */
function checkPrizeLevel(
    userFront: number[],
    userBack: number[],
    winningFront: number[],
    winningBack: number[]
): { level: number; frontMatched: number[]; backMatched: number[] } {
    // 计算匹配的号码
    const frontMatched = userFront.filter(n => winningFront.includes(n));
    const backMatched = userBack.filter(n => winningBack.includes(n));
    
    const frontCount = frontMatched.length;
    const backCount = backMatched.length;

    // 中奖规则判断
    let level = 0;
    
    if (frontCount === 5 && backCount === 2) {
        level = 1; // 一等奖: 5+2
    } else if (frontCount === 5 && backCount === 1) {
        level = 2; // 二等奖: 5+1
    } else if (frontCount === 5 && backCount === 0) {
        level = 3; // 三等奖: 5+0
    } else if (frontCount === 4 && backCount === 2) {
        level = 4; // 四等奖: 4+2
    } else if (frontCount === 4 && backCount === 1) {
        level = 5; // 五等奖: 4+1
    } else if ((frontCount === 3 && backCount === 2) || (frontCount === 4 && backCount === 0)) {
        level = 6; // 六等奖: 3+2 或 4+0
    } else if ((frontCount === 3 && backCount === 1) || (frontCount === 2 && backCount === 2)) {
        level = 7; // 七等奖: 3+1 或 2+2
    } else if ((frontCount === 3 && backCount === 0) || (frontCount === 1 && backCount === 2) || (frontCount === 2 && backCount === 1)) {
        level = 8; // 八等奖: 3+0 或 1+2 或 2+1
    } else if ((frontCount === 0 && backCount === 2) || (frontCount === 1 && backCount === 1) || (frontCount === 2 && backCount === 0)) {
        level = 9; // 九等奖: 0+2 或 1+1 或 2+0
    }

    return { level, frontMatched, backMatched };
}

/**
 * 奖项名称映射
 */
const PRIZE_NAMES: Record<number, string> = {
    1: '一等奖',
    2: '二等奖',
    3: '三等奖',
    4: '四等奖',
    5: '五等奖',
    6: '六等奖',
    7: '七等奖',
    8: '八等奖',
    9: '九等奖',
};

interface WinningRecord {
    issue: string;
    drawDate: string;
    winningFront: number[];
    winningBack: number[];
    frontMatched: number[];
    backMatched: number[];
    level: number;
    prizeName: string;
}

/**
 * 往期中奖检查 API
 * POST /api/lottery/check
 * body: { frontNumbers: number[], backNumbers: number[] }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { frontNumbers, backNumbers } = body;

        // 验证输入
        if (!Array.isArray(frontNumbers) || frontNumbers.length !== 5) {
            return NextResponse.json(
                { success: false, error: '前区号码必须是5个数字' },
                { status: 400 }
            );
        }
        if (!Array.isArray(backNumbers) || backNumbers.length !== 2) {
            return NextResponse.json(
                { success: false, error: '后区号码必须是2个数字' },
                { status: 400 }
            );
        }

        // 获取所有往期开奖数据
        const results = await getLotteryResults('dlt', { limit: 10000, offset: 0 });

        if (results.length === 0) {
            return NextResponse.json({
                success: false,
                error: '暂无往期开奖数据，请先同步数据',
            });
        }

        // 按奖级分组存储中奖记录
        const winningsByLevel: Map<number, WinningRecord[]> = new Map();
        
        for (const result of results) {
            // 解析开奖号码
            const winningFront = result.main_numbers.split(',').map(n => parseInt(n.trim(), 10));
            const winningBack = result.extra_numbers?.split(',').map(n => parseInt(n.trim(), 10)) || [];

            // 检查中奖
            const { level, frontMatched, backMatched } = checkPrizeLevel(
                frontNumbers,
                backNumbers,
                winningFront,
                winningBack
            );

            if (level > 0) {
                const record: WinningRecord = {
                    issue: result.issue,
                    drawDate: result.draw_date_time || (result.draw_date instanceof Date 
                        ? result.draw_date.toISOString().split('T')[0] + ' 21:30:00'
                        : String(result.draw_date).split('T')[0] + ' 21:30:00'),
                    winningFront,
                    winningBack,
                    frontMatched,
                    backMatched,
                    level,
                    prizeName: PRIZE_NAMES[level],
                };

                if (!winningsByLevel.has(level)) {
                    winningsByLevel.set(level, []);
                }
                winningsByLevel.get(level)!.push(record);
            }
        }

        // 找出最高奖级
        let highestLevel = 0;
        for (const level of winningsByLevel.keys()) {
            if (highestLevel === 0 || level < highestLevel) {
                highestLevel = level;
            }
        }

        // 构建返回结果
        if (highestLevel === 0) {
            return NextResponse.json({
                success: true,
                hasWinning: false,
                message: '未中奖',
                totalChecked: results.length,
            });
        }

        // 获取最高奖级的记录，最多返回10条（最近的）
        const highestWinnings = winningsByLevel.get(highestLevel) || [];
        const limitedWinnings = highestWinnings.slice(0, 10);

        return NextResponse.json({
            success: true,
            hasWinning: true,
            highestLevel,
            highestPrizeName: PRIZE_NAMES[highestLevel],
            totalWinningsAtHighest: highestWinnings.length,
            winnings: limitedWinnings,
            totalChecked: results.length,
            // 统计各奖级中奖次数
            stats: Object.fromEntries(
                Array.from(winningsByLevel.entries()).map(([level, records]) => [
                    PRIZE_NAMES[level],
                    records.length,
                ])
            ),
        });
    } catch (error) {
        console.error('Check lottery error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : '检查失败' 
            },
            { status: 500 }
        );
    }
}
