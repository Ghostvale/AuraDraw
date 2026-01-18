'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateDaletu } from '@/lib/lottery';

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

interface CheckResult {
    hasWinning: boolean;
    highestLevel?: number;
    highestPrizeName?: string;
    totalWinningsAtHighest?: number;
    winnings?: WinningRecord[];
    totalChecked: number;
    stats?: Record<string, number>;
    message?: string;
}

interface TestResult {
    id: string;
    timestamp: string;
    frontNumbers: number[];
    backNumbers: number[];
    checkResult: CheckResult | null;
    error?: string;
}

export default function DaletuTestPage() {
    const [results, setResults] = useState<TestResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. 使用大气接口生成随机号码
            const genResult = await generateDaletu();

            if (!genResult.success || !genResult.data) {
                setError(genResult.error || '生成号码失败');
                setIsLoading(false);
                return;
            }

            const frontNumbers = genResult.data.numbers;
            const backNumbers = genResult.data.specialNumbers || [];

            // 2. 检查往期中奖情况
            const checkResponse = await fetch('/api/lottery/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frontNumbers, backNumbers }),
            });

            const checkData = await checkResponse.json();

            const testResult: TestResult = {
                id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }),
                frontNumbers,
                backNumbers,
                checkResult: checkData.success ? checkData : null,
                error: checkData.success ? undefined : checkData.error,
            };

            setResults(prev => [testResult, ...prev]);
        } catch (err) {
            setError(err instanceof Error ? err.message : '测试失败，请重试');
        }

        setIsLoading(false);
    };

    // 渲染号码球，支持高亮匹配的号码
    const renderNumberBall = (
        num: number,
        type: 'front' | 'back',
        matched: boolean
    ) => {
        const baseClass = type === 'front' ? 'number-ball front' : 'number-ball back';
        const style: React.CSSProperties = matched
            ? {}
            : {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  opacity: 0.5,
              };

        return (
            <div className={baseClass} style={style}>
                {num.toString().padStart(2, '0')}
            </div>
        );
    };

    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/daletu" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">🎯 往期随机测试</h1>
                    <div style={{ width: '80px' }}></div>
                </div>

                {/* 说明 */}
                <div
                    style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <p>🎲 使用大气噪声生成一组真随机号码，查询是否能在往期开奖中中奖</p>
                </div>

                {/* 生成按钮 */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <button
                        onClick={handleTest}
                        disabled={isLoading}
                        className="btn btn-primary"
                        style={{
                            fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                            padding: 'clamp(1rem, 4vw, 1.25rem) clamp(2rem, 8vw, 3rem)',
                            opacity: isLoading ? 0.6 : 1,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isLoading ? '测试中...' : '🎯 开始测试'}
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="error-message">
                        <strong>⚠️ 错误:</strong> {error}
                    </div>
                )}

                {/* 测试结果 */}
                <div>
                    {results.length === 0 && !error && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '3rem 1rem',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <p style={{ fontSize: '1.125rem' }}>点击上方按钮开始测试</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                将随机生成号码与所有往期开奖进行比对
                            </p>
                        </div>
                    )}

                    {results.map((result) => (
                        <div
                            key={result.id}
                            className="lottery-card"
                            style={{ marginBottom: '1.5rem' }}
                        >
                            {/* 生成的号码 */}
                            <div
                                style={{
                                    marginBottom: '1rem',
                                    padding: '0.75rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    🎲 随机生成号码
                                </div>
                                <div className="lottery-numbers">
                                    {result.frontNumbers.map((num, index) => (
                                        <div key={`front-${index}`} className="number-ball front">
                                            {num.toString().padStart(2, '0')}
                                        </div>
                                    ))}
                                    <div className="number-separator"></div>
                                    {result.backNumbers.map((num, index) => (
                                        <div key={`back-${index}`} className="number-ball back">
                                            {num.toString().padStart(2, '0')}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 检查结果 */}
                            {result.error ? (
                                <div
                                    style={{
                                        padding: '1rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '8px',
                                        color: 'var(--error-color)',
                                        textAlign: 'center',
                                    }}
                                >
                                    ❌ {result.error}
                                </div>
                            ) : result.checkResult ? (
                                <div>
                                    {/* 中奖结果概览 */}
                                    <div
                                        style={{
                                            padding: '1rem',
                                            background: result.checkResult.hasWinning
                                                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))'
                                                : 'rgba(107, 114, 128, 0.1)',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                            marginBottom: result.checkResult.hasWinning ? '1rem' : 0,
                                        }}
                                    >
                                        {result.checkResult.hasWinning ? (
                                            <>
                                                <div
                                                    style={{
                                                        fontSize: '1.5rem',
                                                        fontWeight: '700',
                                                        color: 'var(--success-color)',
                                                        marginBottom: '0.5rem',
                                                    }}
                                                >
                                                    🎉 最高中奖: {result.checkResult.highestPrizeName}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    在 {result.checkResult.totalChecked} 期中共命中{' '}
                                                    {result.checkResult.totalWinningsAtHighest} 次{result.checkResult.highestPrizeName}
                                                </div>
                                                {/* 显示各奖级统计 */}
                                                {result.checkResult.stats && Object.keys(result.checkResult.stats).length > 1 && (
                                                    <div
                                                        style={{
                                                            marginTop: '0.75rem',
                                                            fontSize: '0.8125rem',
                                                            color: 'var(--text-secondary)',
                                                        }}
                                                    >
                                                        其他奖项:{' '}
                                                        {Object.entries(result.checkResult.stats)
                                                            .filter(([name]) => name !== result.checkResult?.highestPrizeName)
                                                            .map(([name, count]) => `${name}×${count}`)
                                                            .join('、')}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div
                                                style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: '600',
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                😔 未中奖
                                                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                                    已检查 {result.checkResult.totalChecked} 期
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 中奖详情（最多显示10条） */}
                                    {result.checkResult.hasWinning && result.checkResult.winnings && (
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '0.8125rem',
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '0.75rem',
                                                }}
                                            >
                                                📋 {result.checkResult.highestPrizeName}中奖详情
                                                {(result.checkResult.totalWinningsAtHighest || 0) > 10 &&
                                                    `（显示最近10期）`}
                                            </div>
                                            {result.checkResult.winnings.map((winning, idx) => (
                                                <div
                                                    key={`winning-${idx}`}
                                                    style={{
                                                        padding: '0.75rem',
                                                        background: 'var(--bg-secondary)',
                                                        borderRadius: '8px',
                                                        marginBottom: '0.5rem',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: '0.5rem',
                                                            fontSize: '0.8125rem',
                                                            color: 'var(--text-secondary)',
                                                        }}
                                                    >
                                                        <span>第 {winning.issue} 期</span>
                                                        <span>{winning.drawDate}</span>
                                                    </div>
                                                    <div className="lottery-numbers" style={{ justifyContent: 'flex-start' }}>
                                                        {/* 前区号码 */}
                                                        {winning.winningFront.map((num, i) =>
                                                            renderNumberBall(
                                                                num,
                                                                'front',
                                                                winning.frontMatched.includes(num)
                                                            )
                                                        )}
                                                        <div className="number-separator"></div>
                                                        {/* 后区号码 */}
                                                        {winning.winningBack.map((num, i) =>
                                                            renderNumberBall(
                                                                num,
                                                                'back',
                                                                winning.backMatched.includes(num)
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            <div className="lottery-timestamp">测试时间: {result.timestamp}</div>
                        </div>
                    ))}
                </div>

                {/* Info */}
                {results.length > 0 && (
                    <div
                        style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        已测试 {results.length} 次 · 刷新或返回将清空记录
                    </div>
                )}

                {/* 中奖规则说明 */}
                <div
                    style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🏆 大乐透中奖规则</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.25rem 1rem' }}>
                        <span>一等奖: 5+2</span>
                        <span>二等奖: 5+1</span>
                        <span>三等奖: 5+0</span>
                        <span>四等奖: 4+2</span>
                        <span>五等奖: 4+1</span>
                        <span>六等奖: 3+2 / 4+0</span>
                        <span>七等奖: 3+1 / 2+2</span>
                        <span>八等奖: 3+0 / 1+2 / 2+1</span>
                        <span>九等奖: 0+2 / 1+1 / 2+0</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
