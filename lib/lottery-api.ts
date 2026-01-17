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

// API 返回数据结构（新格式）
interface HuiniaoApiResponse {
    code: number;
    info: string;
    data: {
        last: HuiniaoLotteryItem;
        data: {
            list: HuiniaoLotteryItem[];
            currentPage: string;
            currentLimit: string;
            totalPage: number;
            totalCount: number;
        };
    };
}

interface HuiniaoLotteryItem {
    code: string;       // 期号
    day: string;        // 开奖日期 YYYY-MM-DD
    one: string;        // 第1个号码
    two: string;        // 第2个号码
    three: string;      // 第3个号码
    four: string;       // 第4个号码
    five: string;       // 第5个号码
    six: string;        // 第6个号码（后区1 或 第6个号码）
    seven: string;      // 第7个号码（后区2 或 空）
    open_time: string;  // 开奖时间
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
    rawData: HuiniaoLotteryItem;
}

/**
 * 将 API 返回的单条数据转换为标准格式
 * 大乐透: 前区5个(one-five) + 后区2个(six,seven)
 * 双色球: 红球6个(one-six) + 蓝球1个(seven)
 */
function transformLotteryItem(item: HuiniaoLotteryItem, lotteryCode: string): LotteryDrawData {
    let mainNumbers: string;
    let extraNumbers: string | null;

    if (lotteryCode === 'dlt') {
        // 大乐透: 前区5个 + 后区2个
        mainNumbers = [item.one, item.two, item.three, item.four, item.five].join(',');
        extraNumbers = [item.six, item.seven].join(',');
    } else if (lotteryCode === 'ssq') {
        // 双色球: 红球6个 + 蓝球1个
        mainNumbers = [item.one, item.two, item.three, item.four, item.five, item.six].join(',');
        extraNumbers = item.seven;
    } else if (lotteryCode === 'qlc') {
        // 七乐彩: 7个号码 + 特别号1个
        mainNumbers = [item.one, item.two, item.three, item.four, item.five, item.six, item.seven].join(',');
        extraNumbers = null; // 七乐彩特别号需要另外处理
    } else if (lotteryCode === 'qxc') {
        // 七星彩: 7个号码
        mainNumbers = [item.one, item.two, item.three, item.four, item.five, item.six, item.seven].join(',');
        extraNumbers = null;
    } else if (lotteryCode === 'pl5') {
        // 排列5: 5个号码
        mainNumbers = [item.one, item.two, item.three, item.four, item.five].join(',');
        extraNumbers = null;
    } else if (lotteryCode === 'pl3' || lotteryCode === 'fc3d') {
        // 排列3/福彩3D: 3个号码
        mainNumbers = [item.one, item.two, item.three].join(',');
        extraNumbers = null;
    } else {
        // 默认处理
        mainNumbers = [item.one, item.two, item.three, item.four, item.five].join(',');
        extraNumbers = item.six && item.seven ? [item.six, item.seven].join(',') : item.six || null;
    }

    return {
        lotteryCode,
        issue: item.code,
        drawDate: item.day,
        mainNumbers,
        extraNumbers,
        prizePool: null,
        totalSales: null,
        rawData: item,
    };
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
): Promise<{ success: boolean; data: LotteryDrawData[]; error?: string; totalCount?: number }> {
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
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: HuiniaoApiResponse = await response.json();
        
        // 新 API 返回 code: 1 表示成功
        if (result.code !== 1 || !result.data?.data?.list) {
            return { 
                success: false, 
                data: [], 
                error: result.info || '获取数据失败' 
            };
        }

        // 转换数据格式
        const data: LotteryDrawData[] = result.data.data.list.map(item => 
            transformLotteryItem(item, lotteryCode)
        );

        return { 
            success: true, 
            data,
            totalCount: result.data.data.totalCount,
        };
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
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return { success: true, data: allData, totalFetched: allData.length };
}
