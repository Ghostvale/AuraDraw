'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LotteryResult {
    issue: string;
    drawDate: string;
    mainNumbers: string[];
    extraNumbers: string[];
    prizePool: number | null;
    totalSales: number | null;
}

interface QueryParams {
    mode: 'recent' | 'range' | 'issue';
    limit: number;
    startDate: string;
    endDate: string;
    issue: string;
}

export default function DaletuHistoryPage() {
    const [results, setResults] = useState<LotteryResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);

    // 查询参数
    const [queryParams, setQueryParams] = useState<QueryParams>({
        mode: 'recent',
        limit: 10,
        startDate: '',
        endDate: '',
        issue: '',
    });

    // 是否显示高级筛选
    const [showFilter, setShowFilter] = useState(false);

    // 查询数据
    const fetchData = async (reset: boolean = true) => {
        setIsLoading(true);
        setError(null);

        const currentOffset = reset ? 0 : offset;

        try {
            let url = `/api/lottery/history?code=dlt&limit=${queryParams.limit}&offset=${currentOffset}`;

            if (queryParams.mode === 'issue' && queryParams.issue) {
                url = `/api/lottery/history?code=dlt&issue=${queryParams.issue}`;
            } else if (queryParams.mode === 'range' && queryParams.startDate && queryParams.endDate) {
                url += `&startDate=${queryParams.startDate}&endDate=${queryParams.endDate}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                if (reset) {
                    setResults(data.data);
                    setOffset(queryParams.limit);
                } else {
                    setResults(prev => [...prev, ...data.data]);
                    setOffset(prev => prev + queryParams.limit);
                }
                setTotal(data.pagination?.total || data.data.length);
                setHasMore(data.pagination?.hasMore || false);
            } else {
                setError(data.error || '查询失败');
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
        }

        setIsLoading(false);
    };

    // 初始加载
    useEffect(() => {
        fetchData();
    }, []);

    // 处理查询
    const handleQuery = () => {
        fetchData(true);
    };

    // 加载更多
    const handleLoadMore = () => {
        fetchData(false);
    };

    // 重置筛选
    const handleReset = () => {
        setQueryParams({
            mode: 'recent',
            limit: 10,
            startDate: '',
            endDate: '',
            issue: '',
        });
        setTimeout(() => fetchData(true), 0);
    };

    // 格式化金额
    const formatMoney = (cents: number | null): string => {
        if (cents === null) return '-';
        return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/daletu" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">
                        📊 开奖查询
                    </h1>
                    <div style={{ width: '80px' }}></div>
                </div>

                {/* 筛选区域 */}
                <div className="filter-section">
                    <button
                        className="filter-toggle"
                        onClick={() => setShowFilter(!showFilter)}
                    >
                        <span>🔍 筛选条件</span>
                        <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                            style={{ 
                                transform: showFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease'
                            }}
                        >
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>

                    {showFilter && (
                        <div className="filter-panel">
                            {/* 查询模式选择 */}
                            <div className="filter-row">
                                <label className="filter-label">查询方式</label>
                                <div className="filter-tabs">
                                    <button
                                        className={`filter-tab ${queryParams.mode === 'recent' ? 'active' : ''}`}
                                        onClick={() => setQueryParams(p => ({ ...p, mode: 'recent' }))}
                                    >
                                        最近N期
                                    </button>
                                    <button
                                        className={`filter-tab ${queryParams.mode === 'range' ? 'active' : ''}`}
                                        onClick={() => setQueryParams(p => ({ ...p, mode: 'range' }))}
                                    >
                                        日期范围
                                    </button>
                                    <button
                                        className={`filter-tab ${queryParams.mode === 'issue' ? 'active' : ''}`}
                                        onClick={() => setQueryParams(p => ({ ...p, mode: 'issue' }))}
                                    >
                                        精确期号
                                    </button>
                                </div>
                            </div>

                            {/* 根据模式显示不同输入 */}
                            {queryParams.mode === 'recent' && (
                                <div className="filter-row">
                                    <label className="filter-label">显示数量</label>
                                    <select
                                        className="filter-select"
                                        value={queryParams.limit}
                                        onChange={(e) => setQueryParams(p => ({ ...p, limit: parseInt(e.target.value) }))}
                                    >
                                        <option value={10}>最近 10 期</option>
                                        <option value={20}>最近 20 期</option>
                                        <option value={50}>最近 50 期</option>
                                        <option value={100}>最近 100 期</option>
                                    </select>
                                </div>
                            )}

                            {queryParams.mode === 'range' && (
                                <div className="filter-row">
                                    <label className="filter-label">日期范围</label>
                                    <div className="filter-date-range">
                                        <input
                                            type="date"
                                            className="filter-input"
                                            value={queryParams.startDate}
                                            onChange={(e) => setQueryParams(p => ({ ...p, startDate: e.target.value }))}
                                        />
                                        <span>至</span>
                                        <input
                                            type="date"
                                            className="filter-input"
                                            value={queryParams.endDate}
                                            onChange={(e) => setQueryParams(p => ({ ...p, endDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {queryParams.mode === 'issue' && (
                                <div className="filter-row">
                                    <label className="filter-label">期号</label>
                                    <input
                                        type="text"
                                        className="filter-input"
                                        placeholder="例如: 2026001"
                                        value={queryParams.issue}
                                        onChange={(e) => setQueryParams(p => ({ ...p, issue: e.target.value }))}
                                    />
                                </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="filter-actions">
                                <button className="btn btn-secondary" onClick={handleReset}>
                                    重置
                                </button>
                                <button className="btn btn-primary" onClick={handleQuery}>
                                    查询
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="error-message">
                        <strong>⚠️ 错误:</strong> {error}
                    </div>
                )}

                {/* 结果统计 */}
                {!error && results.length > 0 && (
                    <div className="results-stats">
                        共 {total} 条记录，当前显示 {results.length} 条
                    </div>
                )}

                {/* 加载中 */}
                {isLoading && results.length === 0 && (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>加载中...</p>
                    </div>
                )}

                {/* 空状态 */}
                {!isLoading && !error && results.length === 0 && (
                    <div className="empty-state">
                        <p>📭 暂无开奖数据</p>
                        <p className="empty-hint">数据正在同步中，请稍后再试</p>
                    </div>
                )}

                {/* 结果列表 */}
                <div className="history-list">
                    {results.map((result) => (
                        <div key={result.issue} className="history-card">
                            <div className="history-header">
                                <span className="history-issue">第 {result.issue} 期</span>
                                <span className="history-date">{result.drawDate}</span>
                            </div>
                            <div className="lottery-numbers">
                                {/* 前区号码 */}
                                {result.mainNumbers.map((num, index) => (
                                    <div key={`front-${index}`} className="number-ball front">
                                        {num}
                                    </div>
                                ))}

                                {/* 分隔符 */}
                                <div className="number-separator"></div>

                                {/* 后区号码 */}
                                {result.extraNumbers.map((num, index) => (
                                    <div key={`back-${index}`} className="number-ball back">
                                        {num}
                                    </div>
                                ))}
                            </div>
                            {(result.prizePool || result.totalSales) && (
                                <div className="history-footer">
                                    {result.prizePool && (
                                        <span className="prize-info">
                                            奖池: {formatMoney(result.prizePool)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* 加载更多 */}
                {hasMore && !isLoading && (
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button 
                            className="btn btn-secondary"
                            onClick={handleLoadMore}
                        >
                            加载更多
                        </button>
                    </div>
                )}

                {/* 底部加载中 */}
                {isLoading && results.length > 0 && (
                    <div className="loading-more">
                        <div className="loading-spinner small"></div>
                        <span>加载中...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
