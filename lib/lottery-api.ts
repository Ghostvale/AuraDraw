/**
 * 彩票开奖数据 API 服务
 * 使用 AA1 彩票接口 (tools.mgtv100.com) 获取开奖数据
 * 备用: 汇鸟 API (api.huiniao.top)
 */

// AA1 彩票接口 (主要)
const AA1_API_URL = 'https://tools.mgtv100.com/external/v1/pear/lottery';

// 汇鸟 API (备用)
const HUINIAO_API_URL = 'http://api.huiniao.top/interface/home';

// API 彩种代码映射 - AA1 接口
const AA1_LOTTERY_CODE_MAP: Record<string, string> = {
    'dlt': 'dlt',      // 大乐透
    'ssq': 'ssq',      // 双色球
    'pl3': 'pls',      // 排列3
    'pl5': 'plw',      // 排列5
    'qxc': 'qxc',      // 七星彩
    'fc3d': 'fc3d',    // 福彩3D
    'qlc': 'qlc',      // 七乐彩
};

// API 彩种代码映射 - 汇鸟接口
const HUINIAO_LOTTERY_CODE_MAP: Record<string, string> = {
    'dlt': 'dlt',      // 大乐透
    'ssq': 'ssq',      // 双色球
    'pl3': 'pl3',      // 排列3
    'pl5': 'pl5',      // 排列5
    'qxc': 'qxc',      // 七星彩
    'fc3d': 'fc3d',    // 福彩3D
    'qlc': 'qlc',      // 七乐彩
};

// AA1 API 返回数据结构
interface AA1ApiResponse {
    status: string;
    code: number;
    data: AA1LotteryItem[];
}

interface AA1LotteryItem {
    issue: string;          // 期号
    opentime: string;       // 开奖时间 "2026-01-18 星期六"
    salemoney: string;      // 销售额 "2.85亿"
    drawnumber: string;     // 前区号码 "19 21 29 32 33"
    trailnumber: string;    // 后区号码 "06 08"
}

// 汇鸟 API 返回数据结构（备用）
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
    drawDate: string;        // 日期 YYYY-MM-DD
    drawDateTime: string;    // 完整日期时间 YYYY-MM-DD HH:mm:ss
    mainNumbers: string;
    extraNumbers: string | null;
    prizePool: number | null;
    totalSales: number | null;
    rawData: AA1LotteryItem | HuiniaoLotteryItem;
}

/**
 * 解析销售额字符串为数字（单位：分）
 * 例如: "2.85亿" -> 28500000000
 */
function parseSalesMoney(money: string): number | null {
    if (!money) return null;
    
    const cleanMoney = money.replace(/,/g, '').trim();
    
    if (cleanMoney.includes('亿')) {
        const num = parseFloat(cleanMoney.replace('亿', ''));
        return isNaN(num) ? null : Math.round(num * 100000000 * 100);
    } else if (cleanMoney.includes('万')) {
        const num = parseFloat(cleanMoney.replace('万', ''));
        return isNaN(num) ? null : Math.round(num * 10000 * 100);
    } else {
        const num = parseFloat(cleanMoney);
        return isNaN(num) ? null : Math.round(num * 100);
    }
}

/**
 * 解析 AA1 API 的开奖时间字符串
 * 输入: "2026-01-18 星期六" 或 "2026-01-18"
 * 输出: { date: "2026-01-18", dateTime: "2026-01-18 21:30:00" }
 */
function parseAA1DateTime(opentime: string, lotteryCode: string): { date: string; dateTime: string } {
    // 提取日期部分
    const dateMatch = opentime.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : opentime.split(' ')[0];
    
    // 根据彩种设置默认开奖时间
    let defaultTime = '21:30:00';
    if (lotteryCode === 'ssq' || lotteryCode === 'fc3d' || lotteryCode === 'qlc') {
        defaultTime = '21:15:00';
    }
    
    return {
        date,
        dateTime: `${date} ${defaultTime}`
    };
}

/**
 * 将 AA1 API 返回的数据转换为标准格式
 */
function transformAA1Item(item: AA1LotteryItem, lotteryCode: string): LotteryDrawData {
    // 解析号码 - AA1返回格式: "19 21 29 32 33" (空格分隔)
    const mainNumbers = item.drawnumber.trim().split(/\s+/).join(',');
    const extraNumbers = item.trailnumber ? item.trailnumber.trim().split(/\s+/).join(',') : null;
    
    // 解析日期时间
    const { date, dateTime } = parseAA1DateTime(item.opentime, lotteryCode);
    
    // 解析销售额
    const totalSales = parseSalesMoney(item.salemoney);

    return {
        lotteryCode,
        issue: item.issue,
        drawDate: date,
        drawDateTime: dateTime,
        mainNumbers,
        extraNumbers,
        prizePool: null,
        totalSales,
        rawData: item,
    };
}

/**
 * 将汇鸟 API 返回的单条数据转换为标准格式（备用）
 * 大乐透: 前区5个(one-five) + 后区2个(six,seven)
 * 双色球: 红球6个(one-six) + 蓝球1个(seven)
 */
function transformHuiniaoItem(item: HuiniaoLotteryItem, lotteryCode: string): LotteryDrawData {
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
        extraNumbers = null;
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
    
    // 根据彩种设置默认开奖时间
    let defaultTime = '21:30:00';
    if (lotteryCode === 'ssq' || lotteryCode === 'fc3d' || lotteryCode === 'qlc') {
        defaultTime = '21:15:00';
    }

    return {
        lotteryCode,
        issue: item.code,
        drawDate: item.day,
        drawDateTime: `${item.day} ${defaultTime}`,
        mainNumbers,
        extraNumbers,
        prizePool: null,
        totalSales: null,
        rawData: item,
    };
}

/**
 * 使用 AA1 API 获取彩票历史开奖数据（主要接口）
 */
async function fetchFromAA1Api(
    lotteryCode: string
): Promise<{ success: boolean; data: LotteryDrawData[]; error?: string }> {
    const apiCode = AA1_LOTTERY_CODE_MAP[lotteryCode];
    
    if (!apiCode) {
        return { success: false, data: [], error: `AA1 API 不支持的彩种: ${lotteryCode}` };
    }

    try {
        console.log(`[AA1] Fetching lottery data for: ${apiCode}`);
        
        const response = await fetch(AA1_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                search_lottery: apiCode
            }),
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: AA1ApiResponse = await response.json();
        
        if (result.status !== 'success' || result.code !== 200 || !result.data) {
            return { 
                success: false, 
                data: [], 
                error: 'AA1 API 返回数据异常' 
            };
        }

        // 转换数据格式
        const data: LotteryDrawData[] = result.data.map(item => 
            transformAA1Item(item, lotteryCode)
        );

        console.log(`[AA1] Successfully fetched ${data.length} records`);
        return { success: true, data };
    } catch (error) {
        console.error(`[AA1] Failed to fetch lottery history for ${lotteryCode}:`, error);
        return { 
            success: false, 
            data: [], 
            error: error instanceof Error ? error.message : 'AA1 API 请求失败' 
        };
    }
}

/**
 * 使用汇鸟 API 获取彩票历史开奖数据（备用接口，支持分页）
 */
async function fetchFromHuiniaoApi(
    lotteryCode: string,
    page: number = 1,
    limit: number = 20
): Promise<{ success: boolean; data: LotteryDrawData[]; error?: string; totalCount?: number }> {
    const apiCode = HUINIAO_LOTTERY_CODE_MAP[lotteryCode];
    
    if (!apiCode) {
        return { success: false, data: [], error: `汇鸟 API 不支持的彩种: ${lotteryCode}` };
    }

    try {
        const url = `${HUINIAO_API_URL}/lotteryHistory?type=${apiCode}&page=${page}&limit=${limit}`;
        console.log(`[Huiniao] Fetching lottery data from: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: HuiniaoApiResponse = await response.json();
        
        if (result.code !== 1 || !result.data?.data?.list) {
            return { 
                success: false, 
                data: [], 
                error: result.info || '汇鸟 API 获取数据失败' 
            };
        }

        // 转换数据格式
        const data: LotteryDrawData[] = result.data.data.list.map(item => 
            transformHuiniaoItem(item, lotteryCode)
        );

        console.log(`[Huiniao] Successfully fetched ${data.length} records`);
        return { 
            success: true, 
            data,
            totalCount: result.data.data.totalCount,
        };
    } catch (error) {
        console.error(`[Huiniao] Failed to fetch lottery history for ${lotteryCode}:`, error);
        return { 
            success: false, 
            data: [], 
            error: error instanceof Error ? error.message : '汇鸟 API 请求失败' 
        };
    }
}

/**
 * 获取彩票历史开奖数据
 * 优先使用 AA1 API（数据更新更快），如果失败则使用汇鸟 API（支持分页）
 * @param lotteryCode 彩种代码
 * @param page 页码（从1开始）- 仅汇鸟 API 支持
 * @param limit 每页数量 - 仅汇鸟 API 支持
 */
export async function fetchLotteryHistory(
    lotteryCode: string,
    page: number = 1,
    limit: number = 20
): Promise<{ success: boolean; data: LotteryDrawData[]; error?: string; totalCount?: number }> {
    // 首先尝试 AA1 API（第1页时）
    if (page === 1) {
        const aa1Result = await fetchFromAA1Api(lotteryCode);
        if (aa1Result.success && aa1Result.data.length > 0) {
            // AA1 API 返回的数据已按期号倒序排列，截取需要的数量
            const slicedData = aa1Result.data.slice(0, limit);
            return {
                success: true,
                data: slicedData,
                totalCount: aa1Result.data.length,
            };
        }
        console.log('[API] AA1 API failed or returned empty, falling back to Huiniao API');
    }

    // 使用汇鸟 API（支持分页，适合获取更多历史数据）
    return fetchFromHuiniaoApi(lotteryCode, page, limit);
}

/**
 * 获取最新开奖数据
 * 优先使用 AA1 API（更新更快）
 */
export async function fetchLatestDraw(
    lotteryCode: string
): Promise<{ success: boolean; data: LotteryDrawData | null; error?: string }> {
    // 优先尝试 AA1 API
    const aa1Result = await fetchFromAA1Api(lotteryCode);
    if (aa1Result.success && aa1Result.data.length > 0) {
        return { 
            success: true, 
            data: aa1Result.data[0]
        };
    }
    
    // 回退到汇鸟 API
    const huiniaoResult = await fetchFromHuiniaoApi(lotteryCode, 1, 1);
    if (!huiniaoResult.success) {
        return { success: false, data: null, error: huiniaoResult.error };
    }

    return { 
        success: true, 
        data: huiniaoResult.data[0] || null 
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
