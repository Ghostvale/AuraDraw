import { NextRequest, NextResponse } from 'next/server';
import { getLotteryResults } from '@/lib/db';

/**
 * 大乐透中奖等级判断
 */
function checkPrizeLevel(
    userFront: number[],
    userBack: number[],
    winningFront: number[],
    winningBack: number[]
): number {
    const frontCount = userFront.filter(n => winningFront.includes(n)).length;
    const backCount = userBack.filter(n => winningBack.includes(n)).length;

    if (frontCount === 5 && backCount === 2) return 1;
    if (frontCount === 5 && backCount === 1) return 2;
    if (frontCount === 5 && backCount === 0) return 3;
    if (frontCount === 4 && backCount === 2) return 4;
    if (frontCount === 4 && backCount === 1) return 5;
    if ((frontCount === 3 && backCount === 2) || (frontCount === 4 && backCount === 0)) return 6;
    if ((frontCount === 3 && backCount === 1) || (frontCount === 2 && backCount === 2)) return 7;
    if ((frontCount === 3 && backCount === 0) || (frontCount === 1 && backCount === 2) || (frontCount === 2 && backCount === 1)) return 8;
    if ((frontCount === 0 && backCount === 2) || (frontCount === 1 && backCount === 1) || (frontCount === 2 && backCount === 0)) return 9;

    return 0;
}

/**
 * 奖金配置（单位：元）
 * 一等奖、二等奖为浮动奖金，这里使用平均值估算
 */
const PRIZE_AMOUNTS: Record<number, number> = {
    1: 5000000,  // 一等奖平均约500万
    2: 100000,   // 二等奖平均约10万
    3: 10000,
    4: 3000,
    5: 300,
    6: 200,
    7: 100,
    8: 15,
    9: 5,
};

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

interface Ticket {
    front: number[];
    back: number[];
}

interface TicketResult {
    ticketIndex: number;
    highestLevel: number;
    levelCounts: Record<number, number>;
}

interface BatchSummary {
    totalTickets: number;
    totalIssuesChecked: number;
    winningTickets: number;
    levelStats: Record<number, { count: number; name: string; amount: number }>;
    totalPrize: number;
    totalCost: number;
    returnRate: number;
    winRate: number;
}

/**
 * 批量中奖检查 API
 * POST /api/lottery/batch-check
 * body: { tickets: Array<{front: number[], back: number[]}> }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickets } = body as { tickets: Ticket[] };

        // 验证输入
        if (!Array.isArray(tickets) || tickets.length === 0) {
            return NextResponse.json(
                { success: false, error: '请提供彩票数据' },
                { status: 400 }
            );
        }

        if (tickets.length > 200) {
            return NextResponse.json(
                { success: false, error: '单次最多检查200张彩票' },
                { status: 400 }
            );
        }

        // 验证每张彩票的格式
        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            if (!Array.isArray(ticket.front) || ticket.front.length !== 5) {
                return NextResponse.json(
                    { success: false, error: `第${i + 1}张彩票前区号码格式错误` },
                    { status: 400 }
                );
            }
            if (!Array.isArray(ticket.back) || ticket.back.length !== 2) {
                return NextResponse.json(
                    { success: false, error: `第${i + 1}张彩票后区号码格式错误` },
                    { status: 400 }
                );
            }
        }

        // 获取所有往期开奖数据
        const lotteryResults = await getLotteryResults('dlt', { limit: 10000, offset: 0 });

        if (lotteryResults.length === 0) {
            return NextResponse.json({
                success: false,
                error: '暂无往期开奖数据，请先同步数据',
            });
        }

        // 解析所有开奖号码
        const parsedResults = lotteryResults.map(result => ({
            front: result.main_numbers.split(',').map(n => parseInt(n.trim(), 10)),
            back: result.extra_numbers?.split(',').map(n => parseInt(n.trim(), 10)) || [],
        }));

        // 统计各奖级
        const levelStats: Record<number, { count: number; name: string; amount: number }> = {};
        for (let level = 1; level <= 9; level++) {
            levelStats[level] = {
                count: 0,
                name: PRIZE_NAMES[level],
                amount: PRIZE_AMOUNTS[level],
            };
        }

        const ticketResults: TicketResult[] = [];
        let winningTickets = 0;

        // 检查每张彩票
        for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
            const ticket = tickets[ticketIndex];
            const levelCounts: Record<number, number> = {};
            let highestLevel = 0;

            // 对比所有往期
            for (const result of parsedResults) {
                const level = checkPrizeLevel(
                    ticket.front,
                    ticket.back,
                    result.front,
                    result.back
                );

                if (level > 0) {
                    levelCounts[level] = (levelCounts[level] || 0) + 1;
                    levelStats[level].count++;
                    
                    if (highestLevel === 0 || level < highestLevel) {
                        highestLevel = level;
                    }
                }
            }

            if (highestLevel > 0) {
                winningTickets++;
            }

            ticketResults.push({
                ticketIndex,
                highestLevel,
                levelCounts,
            });
        }

        // 计算总奖金
        let totalPrize = 0;
        for (let level = 1; level <= 9; level++) {
            totalPrize += levelStats[level].count * levelStats[level].amount;
        }

        // 计算成本（每张2元）
        const totalCost = tickets.length * 2;

        // 汇总统计
        const summary: BatchSummary = {
            totalTickets: tickets.length,
            totalIssuesChecked: lotteryResults.length,
            winningTickets,
            levelStats,
            totalPrize,
            totalCost,
            returnRate: totalCost > 0 ? (totalPrize / totalCost) * 100 : 0,
            winRate: tickets.length > 0 ? (winningTickets / tickets.length) * 100 : 0,
        };

        return NextResponse.json({
            success: true,
            results: ticketResults,
            summary,
        });
    } catch (error) {
        console.error('Batch check lottery error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : '检查失败' 
            },
            { status: 500 }
        );
    }
}
