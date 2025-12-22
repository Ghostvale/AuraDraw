/**
 * Lottery number generation logic using atmospheric random numbers
 */

import { fetchRandomIntegers, isError } from './random-api';

export interface LotteryNumbers {
    id: string;
    timestamp: string;
    numbers: number[];
    specialNumbers?: number[];
    type: 'daletu' | 'shuangseqiu';
}

export interface LotteryResult {
    success: boolean;
    data?: LotteryNumbers;
    error?: string;
}

/**
 * Generate unique random numbers from a pool
 */
async function generateUniqueNumbers(
    count: number,
    min: number,
    max: number
): Promise<number[] | { error: string }> {
    const poolSize = max - min + 1;

    if (count > poolSize) {
        return { error: `无法从范围 [${min}, ${max}] 中生成 ${count} 个唯一数字` };
    }

    // Request more numbers than needed to handle potential duplicates
    const requestCount = Math.min(count * 3, poolSize);
    const result = await fetchRandomIntegers(requestCount, min, max);

    if (isError(result)) {
        return { error: result.message };
    }

    // Remove duplicates and take only the required count
    const uniqueNumbers = Array.from(new Set(result));

    if (uniqueNumbers.length < count) {
        // If we don't have enough unique numbers, request more
        const additionalNeeded = count - uniqueNumbers.length;
        const additionalResult = await fetchRandomIntegers(additionalNeeded * 2, min, max);

        if (isError(additionalResult)) {
            return { error: additionalResult.message };
        }

        uniqueNumbers.push(...additionalResult);
        const finalUnique = Array.from(new Set(uniqueNumbers));

        if (finalUnique.length < count) {
            return { error: '无法生成足够的唯一随机数，请重试' };
        }

        return finalUnique.slice(0, count).sort((a, b) => a - b);
    }

    return uniqueNumbers.slice(0, count).sort((a, b) => a - b);
}

/**
 * Generate Da Le Tou (大乐透) lottery numbers
 * 5 front numbers (1-35) + 2 back numbers (1-12)
 */
export async function generateDaletu(): Promise<LotteryResult> {
    try {
        // Generate 5 unique front numbers (1-35)
        const frontNumbers = await generateUniqueNumbers(5, 1, 35);
        if ('error' in frontNumbers) {
            return { success: false, error: frontNumbers.error };
        }

        // Generate 2 unique back numbers (1-12)
        const backNumbers = await generateUniqueNumbers(2, 1, 12);
        if ('error' in backNumbers) {
            return { success: false, error: backNumbers.error };
        }

        const lotteryNumbers: LotteryNumbers = {
            id: `daletu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }),
            numbers: frontNumbers,
            specialNumbers: backNumbers,
            type: 'daletu',
        };

        return { success: true, data: lotteryNumbers };
    } catch (error) {
        return {
            success: false,
            error: `生成大乐透号码失败: ${error instanceof Error ? error.message : '未知错误'}`,
        };
    }
}

/**
 * Generate Shuang Se Qiu (双色球) lottery numbers
 * 6 red balls (1-33) + 1 blue ball (1-16)
 */
export async function generateShuangseqiu(): Promise<LotteryResult> {
    try {
        // Generate 6 unique red numbers (1-33)
        const redNumbers = await generateUniqueNumbers(6, 1, 33);
        if ('error' in redNumbers) {
            return { success: false, error: redNumbers.error };
        }

        // Generate 1 blue number (1-16)
        const blueResult = await fetchRandomIntegers(1, 1, 16);
        if (isError(blueResult)) {
            return { success: false, error: blueResult.message };
        }

        const lotteryNumbers: LotteryNumbers = {
            id: `shuangseqiu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }),
            numbers: redNumbers,
            specialNumbers: blueResult,
            type: 'shuangseqiu',
        };

        return { success: true, data: lotteryNumbers };
    } catch (error) {
        return {
            success: false,
            error: `生成双色球号码失败: ${error instanceof Error ? error.message : '未知错误'}`,
        };
    }
}
