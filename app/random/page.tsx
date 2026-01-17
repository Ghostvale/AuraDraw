'use client';

import { useState } from 'react';
import Link from 'next/link';
import { fetchRandomIntegers, isError, MAX_RANDOM_VALUE } from '@/lib/random-api';

interface RandomResult {
    id: string;
    timestamp: string;
    value: number;
    range: number;
}

const MIN_RANGE = 5;

export default function RandomPage() {
    const [results, setResults] = useState<RandomResult[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rangeInput, setRangeInput] = useState('100');

    const handleGenerate = async () => {
        const range = parseInt(rangeInput, 10) || 100;

        if (range < MIN_RANGE) {
            setError(`范围最小值为 ${MIN_RANGE}`);
            return;
        }

        if (range > MAX_RANDOM_VALUE) {
            setError(`范围最大值为 ${MAX_RANDOM_VALUE.toLocaleString()}`);
            return;
        }

        setIsGenerating(true);
        setError(null);

        const result = await fetchRandomIntegers(1, 0, range);

        if (isError(result)) {
            setError(result.message);
        } else {
            const randomResult: RandomResult = {
                id: `random-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }),
                value: result[0],
                range: range,
            };
            setResults((prev) => [randomResult, ...prev]);
        }

        setIsGenerating(false);
    };

    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow empty or numeric input
        if (value === '' || /^\d+$/.test(value)) {
            setRangeInput(value);
        }
    };

    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">
                        🎲 随机数
                    </h1>
                    <div style={{ width: '80px' }}></div>
                </div>

                {/* Range Input */}
                <div style={{
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                }}>
                    <label style={{
                        fontSize: '0.9375rem',
                        color: 'var(--text-secondary)',
                        fontWeight: '500',
                    }}>
                        设置随机数上限
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={rangeInput}
                        onChange={handleRangeChange}
                        className="input-field"
                        style={{
                            width: '160px',
                            textAlign: 'center',
                        }}
                        placeholder="100"
                    />
                    <p style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        opacity: 0.8,
                    }}>
                        生成 0 ~ N 的随机整数（N: {MIN_RANGE} ~ {MAX_RANDOM_VALUE.toLocaleString()}）
                    </p>
                </div>

                {/* Generate Button */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="btn btn-primary"
                        style={{
                            fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                            padding: 'clamp(1rem, 4vw, 1.25rem) clamp(2rem, 8vw, 3rem)',
                            opacity: isGenerating ? 0.6 : 1,
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isGenerating ? '生成中...' : '🎲 生成随机数'}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <strong>⚠️ 错误:</strong> {error}
                    </div>
                )}

                {/* Generated Results */}
                <div>
                    {results.length === 0 && !error && (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'var(--text-secondary)',
                        }}>
                            <p style={{ fontSize: '1.125rem' }}>点击上方按钮生成随机数</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                基于大气噪声的真随机数
                            </p>
                        </div>
                    )}

                    {results.map((result) => (
                        <div key={result.id} className="random-card">
                            <div className="random-result">
                                {result.value.toLocaleString()}
                            </div>
                            <div className="random-info">
                                <span>范围: 0 ~ {result.range.toLocaleString()}</span>
                                <span>{result.timestamp}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Info */}
                {results.length > 0 && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                    }}>
                        已生成 {results.length} 个随机数 · 刷新或返回将清空记录
                    </div>
                )}
            </div>
        </div>
    );
}
