'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateDaletu } from '@/lib/lottery';
import type { LotteryNumbers } from '@/lib/lottery';

export default function DaletuPage() {
    const [generatedNumbers, setGeneratedNumbers] = useState<LotteryNumbers[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        const result = await generateDaletu();

        if (result.success && result.data) {
            setGeneratedNumbers((prev) => [result.data!, ...prev]);
        } else {
            setError(result.error || '生成失败，请重试');
        }

        setIsGenerating(false);
    };

    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2rem',
                }}>
                    <Link href="/" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 style={{
                        fontSize: 'clamp(1.5rem, 6vw, 2rem)',
                        fontWeight: '700',
                        background: 'var(--accent-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        大乐透
                    </h1>
                    <div style={{ width: '80px' }}></div> {/* Spacer for centering */}
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
                        {isGenerating ? '生成中...' : '🎲 生成号码'}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <strong>⚠️ 错误:</strong> {error}
                    </div>
                )}

                {/* Generated Numbers */}
                <div>
                    {generatedNumbers.length === 0 && !error && (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'var(--text-secondary)',
                        }}>
                            <p style={{ fontSize: '1.125rem' }}>点击上方按钮生成号码</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                前区: 5个号码 (1-35) | 后区: 2个号码 (1-12)
                            </p>
                        </div>
                    )}

                    {generatedNumbers.map((lottery) => (
                        <div key={lottery.id} className="lottery-card">
                            <div className="lottery-numbers">
                                {/* Front numbers */}
                                {lottery.numbers.map((num, index) => (
                                    <div key={`front-${index}`} className="number-ball front">
                                        {num.toString().padStart(2, '0')}
                                    </div>
                                ))}

                                {/* Separator */}
                                <div style={{
                                    width: '2px',
                                    height: '48px',
                                    background: 'var(--border-color)',
                                    margin: '0 0.25rem',
                                }}></div>

                                {/* Back numbers */}
                                {lottery.specialNumbers?.map((num, index) => (
                                    <div key={`back-${index}`} className="number-ball back">
                                        {num.toString().padStart(2, '0')}
                                    </div>
                                ))}
                            </div>

                            <div className="lottery-timestamp">
                                生成时间: {lottery.timestamp}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Info */}
                {generatedNumbers.length > 0 && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                    }}>
                        已生成 {generatedNumbers.length} 组号码 · 刷新或返回将清空记录
                    </div>
                )}
            </div>
        </div>
    );
}
