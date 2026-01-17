/**
 * 彩票开奖数据 API 服务
 * 使用汇鸟 API 获取开奖数据
 * 文档: https://api.huiniao.top/
 */

const API_BASE_URL = 'http://api.huiniao.top/interface/home';

// API 彩种代码映射
const LOTTERY_CODE_MAP: Record<string, string> = {
    'dlt': 'dlt',      // 大乐透
    'ssq': 'ssq',      // 双色球
    'pl3': 'pl3',      // 排列3
    'pl5': 'pl5',      // 排列5
    'qxc': 'qxc',      // 七星彩
    'fc3d': 'fc3d',    // 福彩3D
    'qlc': 'qlc',      // 七乐彩
};

// API 返回数据结构
interface HuiniaoApiResponse {
    code: number;
    msg: string;
    data: HuiniaoLotteryData[];
}

interface HuiniaoLotteryData {
    issue: string;      // 期号
    date: string;       // 开奖日期 YYYY-MM-DD
    number: string;     // 开奖号码，格式: "01,05,12,25,33+02,09"
    prizePool?: string; // 奖池金额
    totalSales?: string;// 销售额
}

// 标准化的开奖数据
export interface LotteryDrawData {
    lotteryCode: string;
    issue: string;
    drawDate: string;
    mainNumbers: string;
    extraNumbers: string | null;
    prizePool: number | null;
    totalSales: number | null;
    rawData: HuiniaoLotteryData;
}

/**
 * 解析开奖号码字符串
 * 输入格式: "01,05,12,25,33+02,09" 或 "01,05,12,25,33"
 * 输出: { mainNumbers: "01,05,12,25,33", extraNumbers: "02,09" }
 */
function parseNumbers(numberStr: string, lotteryCode: string): { mainNumbers: string; extraNumbers: string | null } {
    // 某些彩种用 + 分隔主区和附加区
    if (numberStr.includes('+')) {
        const [main, extra] = numberStr.split('+');
        return {
            mainNumbers: main.trim(),
            extraNumbers: extra?.trim() || null
        };
    }

    // 排列3/5、福彩3D、七星彩等没有附加区
    if (['pl3', 'pl5', 'fc3d', 'qxc'].includes(lotteryCode)) {
        return {
            mainNumbers: numberStr.trim(),
            extraNumbers: null
        };
    }

    return {
        mainNumbers: numberStr.trim(),
        extraNumbers: null
    };
}

/**
 * 解析金额字符串为分
 * 输入: "1234567.89" 或 "1,234,567.89" 或 "123456789"
 */
function parseMoney(moneyStr?: string): number | null {
    if (!moneyStr) return null;
    
    // 移除逗号和其他非数字字符（保留小数点）
    const cleaned = moneyStr.replace(/[^\d.]/g, '');
    const value = parseFloat(cleaned);
    
    if (isNaN(value)) return null;
    
    // 转换为分
    return Math.round(value * 100);
}

/**
 * 获取彩票历史开奖数据
 * @param lotteryCode 彩种代码
 * @param page 页码（从1开始）
 * @param limit 每页数量
 */
export async function fetchLotteryHistory(
    lotteryCode: string,
    page: number = 1,
    limit: number = 20
): Promise<{ success: boolean; data: LotteryDrawData[]; error?: string }> {
    const apiCode = LOTTERY_CODE_MAP[lotteryCode];
    
    if (!apiCode) {
        return { success: false, data: [], error: `不支持的彩种: ${lotteryCode}` };
    }

    try {
        const url = `${API_BASE_URL}/lotteryHistory?type=${apiCode}&page=${page}&limit=${limit}`;
        console.log(`Fetching lottery data from: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            // 设置超时
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: HuiniaoApiResponse = await response.json();
        
        if (result.code !== 200 || !result.data) {
            return { 
                success: false, 
                data: [], 
                error: result.msg || '获取数据失败' 
            };
        }

        // 转换数据格式
        const data: LotteryDrawData[] = result.data.map(item => {
            const { mainNumbers, extraNumbers } = parseNumbers(item.number, lotteryCode);
            
            return {
                lotteryCode,
                issue: item.issue,
                drawDate: item.date,
                mainNumbers,
                extraNumbers,
                prizePool: parseMoney(item.prizePool),
                totalSales: parseMoney(item.totalSales),
                rawData: item,
            };
        });

        return { success: true, data };
    } catch (error) {
        console.error(`Failed to fetch lottery history for ${lotteryCode}:`, error);
        return { 
            success: false, 
            data: [], 
            error: error instanceof Error ? error.message : '网络请求失败' 
        };
    }
}

/**
 * 获取最新开奖数据
 */
export async function fetchLatestDraw(
    lotteryCode: string
): Promise<{ success: boolean; data: LotteryDrawData | null; error?: string }> {
    const result = await fetchLotteryHistory(lotteryCode, 1, 1);
    
    if (!result.success) {
        return { success: false, data: null, error: result.error };
    }

    return { 
        success: true, 
        data: result.data[0] || null 
    };
}

/**
 * 批量获取历史数据（用于初始化同步）
 * 会自动分页获取所有数据
 */
export async function fetchAllHistory(
    lotteryCode: string,
    maxPages: number = 50,
    pageSize: number = 50
): Promise<{ success: boolean; data: LotteryDrawData[]; totalFetched: number; error?: string }> {
    const allData: LotteryDrawData[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
        const result = await fetchLotteryHistory(lotteryCode, page, pageSize);
        
        if (!result.success) {
            // 如果已经获取了一些数据，返回已获取的
            if (allData.length > 0) {
                return { 
                    success: true, 
                    data: allData, 
                    totalFetched: allData.length,
                    error: `部分数据获取失败: ${result.error}` 
                };
            }
            return { success: false, data: [], totalFetched: 0, error: result.error };
        }

        allData.push(...result.data);
        
        // 如果返回的数据少于请求的数量，说明没有更多数据了
        if (result.data.length < pageSize) {
            hasMore = false;
        }

        page++;
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { success: true, data: allData, totalFetched: allData.length };
}
