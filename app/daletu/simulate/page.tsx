'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { generateDaletu } from '@/lib/lottery';

interface LevelStat {
    count: number;
    name: string;
    amount: number;
}

interface SimulationSummary {
    totalTickets: number;
    totalIssuesChecked: number;
    winningTickets: number;
    levelStats: Record<number, LevelStat>;
    totalPrize: number;
    totalCost: number;
    returnRate: number;
    winRate: number;
}

interface SimulationResult {
    id: string;
    timestamp: string;
    summary: SimulationSummary;
    generatedNumbers: Array<{ front: number[]; back: number[] }>;
}

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

const SIMULATION_COUNT = 100;

export default function DaletuSimulatePage() {
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const runSimulation = useCallback(async () => {
        setIsSimulating(true);
        setError(null);
        setProgress(0);
        setResult(null);

        try {
            // 生成100组随机号码
            const tickets: Array<{ front: number[]; back: number[] }> = [];
            
            for (let i = 0; i < SIMULATION_COUNT; i++) {
                const genResult = await generateDaletu();
                
                if (!genResult.success || !genResult.data) {
                    setError(genResult.error || '生成号码失败');
                    setIsSimulating(false);
                    return;
                }

                tickets.push({
                    front: genResult.data.numbers,
                    back: genResult.data.specialNumbers || [],
                });

                // 更新进度（生成阶段占50%）
                setProgress(Math.floor(((i + 1) / SIMULATION_COUNT) * 50));
            }

            // 批量检查中奖情况
            setProgress(60);
            
            const checkResponse = await fetch('/api/lottery/batch-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickets }),
            });

            setProgress(90);

            const checkData = await checkResponse.json();

            if (!checkData.success) {
                setError(checkData.error || '检查中奖失败');
                setIsSimulating(false);
                return;
            }

            setProgress(100);

            // 保存结果
            const simulationResult: SimulationResult = {
                id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }),
                summary: checkData.summary,
                generatedNumbers: tickets,
            };

            setResult(simulationResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : '模拟失败，请重试');
        }

        setIsSimulating(false);
    }, []);

    // 格式化金额
    const formatMoney = (amount: number) => {
        if (amount >= 10000) {
            return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 2)}万`;
        }
        return amount.toLocaleString();
    };

    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/daletu" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">📊 模拟中奖率</h1>
                    <div style={{ width: '80px' }}></div>
                </div>

                {/* 说明 */}
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                }}>
                    <p>🎯 使用大气随机数生成 {SIMULATION_COUNT} 组号码，与往期所有开奖号码进行比对，统计中奖情况</p>
                </div>

                {/* 开始按钮 */}
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className="btn btn-primary"
                        style={{
                            fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                            padding: 'clamp(1rem, 4vw, 1.25rem) clamp(2rem, 8vw, 3rem)',
                            opacity: isSimulating ? 0.6 : 1,
                            cursor: isSimulating ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSimulating ? '模拟中...' : '🚀 开始模拟'}
                    </button>
                </div>

                {/* 进度条 */}
                {isSimulating && (
                    <div style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                        }}>
                            <span>
                                {progress < 50 ? '生成随机号码...' : progress < 90 ? '检查中奖情况...' : '完成!'}
                            </span>
                            <span>{progress}%</span>
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* 错误提示 */}
                {error && (
                    <div className="error-message">
                        <strong>⚠️ 错误:</strong> {error}
                    </div>
                )}

                {/* 模拟结果 */}
                {result && (
                    <div>
                        {/* 汇总卡片 */}
                        <div style={{
                            marginBottom: '1rem',
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '1rem',
                                marginBottom: '1rem',
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        模拟次数
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        {result.summary.totalTickets}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        对比期数
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        {result.summary.totalIssuesChecked}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        投入成本
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--error-color)' }}>
                                        ¥{result.summary.totalCost}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        累计奖金
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success-color)' }}>
                                        ¥{formatMoney(result.summary.totalPrize)}
                                    </div>
                                </div>
                            </div>

                            {/* 回报率和中奖率 */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '1rem',
                                padding: '1rem',
                                background: 'var(--bg-card)',
                                borderRadius: '12px',
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        回报率
                                    </div>
                                    <div style={{ 
                                        fontSize: '1.25rem', 
                                        fontWeight: '700', 
                                        color: result.summary.returnRate >= 100 ? 'var(--success-color)' : 'var(--error-color)',
                                    }}>
                                        {result.summary.returnRate.toFixed(2)}%
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        期望收益
                                    </div>
                                    <div style={{ 
                                        fontSize: '1.25rem', 
                                        fontWeight: '700',
                                        color: result.summary.totalPrize - result.summary.totalCost >= 0 
                                            ? 'var(--success-color)' 
                                            : 'var(--error-color)',
                                    }}>
                                        {result.summary.totalPrize - result.summary.totalCost >= 0 ? '+' : ''}
                                        ¥{formatMoney(result.summary.totalPrize - result.summary.totalCost)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 中奖统计表 */}
                        <div style={{
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                        }}>
                            <div style={{
                                fontSize: '0.9375rem',
                                fontWeight: '600',
                                marginBottom: '1rem',
                                color: 'var(--text-primary)',
                            }}>
                                🏆 各奖级中奖统计
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="stats-table">
                                    <thead>
                                        <tr>
                                            <th>奖级</th>
                                            <th>中奖次数</th>
                                            <th>单注奖金</th>
                                            <th>累计奖金</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(result.summary.levelStats)
                                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                            .map(([level, stat]) => (
                                                <tr key={level}>
                                                    <td style={{ fontWeight: '500' }}>{PRIZE_NAMES[parseInt(level)]}</td>
                                                    <td style={{ 
                                                        color: stat.count > 0 ? 'var(--success-color)' : 'var(--text-secondary)',
                                                        fontWeight: stat.count > 0 ? '600' : '400',
                                                    }}>
                                                        {stat.count}
                                                    </td>
                                                    <td>
                                                        {parseInt(level) <= 2 ? (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                浮动 (约¥{formatMoney(stat.amount)})
                                                            </span>
                                                        ) : (
                                                            `¥${formatMoney(stat.amount)}`
                                                        )}
                                                    </td>
                                                    <td style={{ 
                                                        color: stat.count > 0 ? 'var(--success-color)' : 'var(--text-secondary)',
                                                        fontWeight: stat.count > 0 ? '600' : '400',
                                                    }}>
                                                        ¥{formatMoney(stat.count * stat.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 统计分析 */}
                        <div style={{
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                        }}>
                            <div style={{
                                fontSize: '0.9375rem',
                                fontWeight: '600',
                                marginBottom: '1rem',
                                color: 'var(--text-primary)',
                            }}>
                                📈 统计分析
                            </div>
                            <div className="info-content">
                                <div className="info-item">
                                    <span className="info-label">总中奖次数</span>
                                    <span className="info-value" style={{ color: 'var(--success-color)' }}>
                                        {Object.values(result.summary.levelStats).reduce((sum, s) => sum + s.count, 0)} 次
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">平均每注中奖次数</span>
                                    <span className="info-value">
                                        {(Object.values(result.summary.levelStats).reduce((sum, s) => sum + s.count, 0) / result.summary.totalTickets).toFixed(2)} 次
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">每注期望收益</span>
                                    <span className="info-value" style={{ 
                                        color: (result.summary.totalPrize - result.summary.totalCost) / result.summary.totalTickets >= 0 
                                            ? 'var(--success-color)' 
                                            : 'var(--error-color)' 
                                    }}>
                                        ¥{((result.summary.totalPrize - result.summary.totalCost) / result.summary.totalTickets).toFixed(2)}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">理论中奖概率 (九等奖)</span>
                                    <span className="info-value">约 2.44%</span>
                                </div>
                            </div>
                        </div>

                        {/* 展开查看生成的号码 */}
                        <div style={{
                            padding: '1rem',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                        }}>
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontSize: '0.9375rem',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <span>🎲 查看生成的号码</span>
                                <span style={{ 
                                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                }}>
                                    ▼
                                </span>
                            </button>
                            
                            {showDetails && (
                                <div style={{
                                    marginTop: '1rem',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                }}>
                                    {result.generatedNumbers.map((nums, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.5rem',
                                                borderBottom: index < result.generatedNumbers.length - 1 
                                                    ? '1px solid var(--border-color)' 
                                                    : 'none',
                                            }}
                                        >
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'var(--text-secondary)',
                                                minWidth: '30px',
                                            }}>
                                                #{index + 1}
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {nums.front.map((n, i) => (
                                                    <span
                                                        key={`f-${i}`}
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'var(--accent-primary)',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            fontSize: '0.6875rem',
                                                            fontWeight: '600',
                                                        }}
                                                    >
                                                        {n.toString().padStart(2, '0')}
                                                    </span>
                                                ))}
                                            </div>
                                            <span style={{ color: 'var(--text-secondary)' }}>+</span>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {nums.back.map((n, i) => (
                                                    <span
                                                        key={`b-${i}`}
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: '#f59e0b',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            fontSize: '0.6875rem',
                                                            fontWeight: '600',
                                                        }}
                                                    >
                                                        {n.toString().padStart(2, '0')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 模拟时间 */}
                        <div style={{
                            marginTop: '1rem',
                            textAlign: 'center',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                        }}>
                            模拟时间: {result.timestamp}
                        </div>
                    </div>
                )}

                {/* 中奖规则说明 */}
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>💡 说明</p>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                        <li style={{ marginBottom: '0.25rem' }}>一等奖、二等奖为浮动奖金，统计使用估算值</li>
                        <li style={{ marginBottom: '0.25rem' }}>每组号码与所有往期开奖结果进行比对</li>
                        <li>实际中奖概率可能因数据量而有所差异</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
