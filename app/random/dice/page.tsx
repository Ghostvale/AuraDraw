'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { fetchRandomIntegers, isError } from '@/lib/random-api';

interface DiceResult {
    id: string;
    timestamp: string;
    values: number[];
    total: number;
}

// 骰子点数的点位配置
const DOT_POSITIONS: Record<number, { top: string; left: string }[]> = {
    1: [{ top: '50%', left: '50%' }],
    2: [{ top: '25%', left: '25%' }, { top: '75%', left: '75%' }],
    3: [{ top: '25%', left: '25%' }, { top: '50%', left: '50%' }, { top: '75%', left: '75%' }],
    4: [{ top: '25%', left: '25%' }, { top: '25%', left: '75%' }, { top: '75%', left: '25%' }, { top: '75%', left: '75%' }],
    5: [{ top: '25%', left: '25%' }, { top: '25%', left: '75%' }, { top: '50%', left: '50%' }, { top: '75%', left: '25%' }, { top: '75%', left: '75%' }],
    6: [{ top: '25%', left: '25%' }, { top: '25%', left: '75%' }, { top: '50%', left: '25%' }, { top: '50%', left: '75%' }, { top: '75%', left: '25%' }, { top: '75%', left: '75%' }],
};

// 骰子面的旋转角度（显示对应点数需要的旋转）
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: 90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: -90 },
    6: { x: 180, y: 0 },
};

// 渲染骰子面
function DiceFace({ value, className }: { value: number; className: string }) {
    return (
        <div className={`dice-face ${className}`}>
            {DOT_POSITIONS[value].map((pos, i) => (
                <div
                    key={i}
                    className="dice-dot"
                    style={{
                        position: 'absolute',
                        top: pos.top,
                        left: pos.left,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            ))}
        </div>
    );
}

export default function DicePage() {
    const [diceCount, setDiceCount] = useState(1);
    const [isRolling, setIsRolling] = useState(false);
    const [currentValues, setCurrentValues] = useState<number[]>([1]);
    const [targetValues, setTargetValues] = useState<number[]>([1]);
    const [results, setResults] = useState<DiceResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const touchStartY = useRef<number>(0);

    const rollDice = useCallback(async () => {
        if (isRolling) return;

        setIsRolling(true);
        setError(null);

        // 先调用API获取结果
        const result = await fetchRandomIntegers(diceCount, 1, 6);

        if (isError(result)) {
            setError(result.message);
            setIsRolling(false);
            return;
        }

        // 设置目标值，触发动画
        setTargetValues(result);

        // 动画结束后更新状态
        setTimeout(() => {
            const values = result;
            const total = values.reduce((sum, v) => sum + v, 0);
            
            const diceResult: DiceResult = {
                id: `dice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toLocaleString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }),
                values,
                total,
            };
            
            setCurrentValues(values);
            setResults(prev => [diceResult, ...prev].slice(0, 20));
            setIsRolling(false);
        }, 1500);
    }, [isRolling, diceCount]);

    // 触摸事件处理
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY.current - touchEndY;
        
        if (diff > 50) {
            rollDice();
        }
    };

    // 修改骰子数量
    const handleDiceCountChange = (count: number) => {
        setDiceCount(count);
        setCurrentValues(Array(count).fill(1));
        setTargetValues(Array(count).fill(1));
    };

    // 获取当前显示的值（动画中显示目标值，否则显示当前值）
    const displayValues = isRolling ? targetValues : currentValues;

    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/random" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">🎲 掷骰子</h1>
                    <div style={{ width: '80px' }}></div>
                </div>

                {/* 骰子数量选择 */}
                <div style={{
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.75rem',
                    }}>
                        选择骰子数量
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                    }}>
                        {[1, 2, 3, 4, 5, 6].map(count => (
                            <button
                                key={count}
                                onClick={() => handleDiceCountChange(count)}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: diceCount === count 
                                        ? 'var(--accent-gradient)' 
                                        : 'var(--bg-secondary)',
                                    color: diceCount === count 
                                        ? 'white' 
                                        : 'var(--text-primary)',
                                    boxShadow: diceCount === count 
                                        ? 'var(--shadow-md)' 
                                        : 'none',
                                }}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 骰子展示区域 */}
                <div 
                    className="dice-roll-area"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '300px',
                        marginBottom: '1.5rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        touchAction: 'pan-x',
                        padding: '1rem',
                    }}
                >
                    {/* 提示文字 */}
                    <div style={{
                        position: 'absolute',
                        top: '1rem',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        opacity: isRolling ? 0 : 0.8,
                        transition: 'opacity 0.3s',
                    }}>
                        向上滑动或点击按钮掷骰子
                    </div>

                    {/* 骰子容器 */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '1rem',
                        perspective: '600px',
                    }}>
                        {displayValues.map((value, index) => {
                            const rotation = FACE_ROTATIONS[value];
                            return (
                                <div
                                    key={index}
                                    className={`dice-3d ${isRolling ? 'rolling' : ''}`}
                                    style={{
                                        '--final-x': `${rotation.x}deg`,
                                        '--final-y': `${rotation.y}deg`,
                                        animationDelay: `${index * 0.1}s`,
                                    } as React.CSSProperties}
                                >
                                    <DiceFace value={1} className="face-front" />
                                    <DiceFace value={6} className="face-back" />
                                    <DiceFace value={2} className="face-right" />
                                    <DiceFace value={5} className="face-left" />
                                    <DiceFace value={3} className="face-top" />
                                    <DiceFace value={4} className="face-bottom" />
                                </div>
                            );
                        })}
                    </div>

                    {/* 结果显示 */}
                    {!isRolling && currentValues.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}>
                            <div style={{
                                display: 'flex',
                                gap: '0.25rem',
                                fontSize: '1.25rem',
                                fontWeight: '600',
                            }}>
                                {currentValues.map((v, i) => (
                                    <span key={i} style={{ color: 'var(--accent-primary)' }}>
                                        {v}{i < currentValues.length - 1 ? ' +' : ''}
                                    </span>
                                ))}
                            </div>
                            {currentValues.length > 1 && (
                                <>
                                    <span style={{ color: 'var(--text-secondary)' }}>=</span>
                                    <span style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: 'var(--success-color)',
                                    }}>
                                        {currentValues.reduce((a, b) => a + b, 0)}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 掷骰子按钮 */}
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={rollDice}
                        disabled={isRolling}
                        className="btn btn-primary"
                        style={{
                            fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                            padding: 'clamp(1rem, 4vw, 1.25rem) clamp(2rem, 8vw, 3rem)',
                            opacity: isRolling ? 0.6 : 1,
                            cursor: isRolling ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isRolling ? '掷骰中...' : '🎲 掷骰子'}
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="error-message">
                        <strong>⚠️ 错误:</strong> {error}
                    </div>
                )}

                {/* 历史记录 */}
                {results.length > 0 && (
                    <div style={{
                        padding: '1rem',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            marginBottom: '0.75rem',
                            color: 'var(--text-secondary)',
                        }}>
                            最近记录
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                        }}>
                            {results.slice(0, 10).map((r, i) => (
                                <div
                                    key={r.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.5rem 0.75rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        animation: i === 0 ? 'fadeInUp 0.3s ease' : 'none',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        alignItems: 'center',
                                    }}>
                                        {r.values.map((v, j) => (
                                            <span
                                                key={j}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'var(--accent-primary)',
                                                    color: 'white',
                                                    borderRadius: '4px',
                                                    fontWeight: '600',
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                {v}
                                            </span>
                                        ))}
                                        {r.values.length > 1 && (
                                            <span style={{ 
                                                color: 'var(--success-color)',
                                                fontWeight: '600',
                                            }}>
                                                = {r.total}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                        {r.timestamp}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
