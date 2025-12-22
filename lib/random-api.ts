/**
 * Integration with Random.org HTTP API for atmospheric random numbers
 */

const RANDOM_ORG_BASE_URL = 'https://www.random.org/integers/';

export interface RandomApiError {
    error: true;
    message: string;
}

export type RandomApiResult = number[] | RandomApiError;

/**
 * Fetch random integers from Random.org atmospheric random number API
 * @param count - Number of random integers to generate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Array of random integers or error object
 */
export async function fetchRandomIntegers(
    count: number,
    min: number,
    max: number
): Promise<RandomApiResult> {
    try {
        const params = new URLSearchParams({
            num: count.toString(),
            min: min.toString(),
            max: max.toString(),
            col: '1',
            base: '10',
            format: 'plain',
            rnd: 'new',
        });

        const url = `${RANDOM_ORG_BASE_URL}?${params.toString()}`;

        const response = await fetch(url);

        if (!response.ok) {
            return {
                error: true,
                message: `API请求失败: ${response.status} ${response.statusText}`,
            };
        }

        const text = await response.text();

        // Check for error message from Random.org
        if (text.includes('Error:')) {
            return {
                error: true,
                message: `Random.org错误: ${text}`,
            };
        }

        // Parse the plain text response (one number per line)
        const numbers = text
            .trim()
            .split('\n')
            .map((line) => parseInt(line.trim(), 10))
            .filter((num) => !isNaN(num));

        if (numbers.length !== count) {
            return {
                error: true,
                message: `返回的随机数数量不正确 (期望 ${count}, 实际 ${numbers.length})`,
            };
        }

        return numbers;
    } catch (error) {
        return {
            error: true,
            message: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
        };
    }
}

/**
 * Check if the result is an error
 */
export function isError(result: RandomApiResult): result is RandomApiError {
    return (result as RandomApiError).error === true;
}
