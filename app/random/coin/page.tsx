'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { fetchRandomIntegers, isError } from '@/lib/random-api';

// 硬币样式定义
interface CoinStyle {
    id: string;
    name: string;
    category: 'classic' | 'currency' | 'ancient';
    frontImage: string;
    backImage: string;
    frontBg: string;
    backBg: string;
    edgeColor: string;
}

const COIN_STYLES: CoinStyle[] = [
    // 经典款式
    {
        id: 'gold',
        name: '金币',
        category: 'classic',
        frontImage: '正',
        backImage: '反',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #fff6d5 0%, #ffd700 25%, #daa520 60%, #b8860b 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #f0e68c 0%, #daa520 25%, #b8860b 60%, #8b6914 100%)',
        edgeColor: '#8b6914',
    },
    {
        id: 'silver',
        name: '银币',
        category: 'classic',
        frontImage: '正',
        backImage: '反',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #ffffff 0%, #e8e8e8 25%, #c0c0c0 60%, #a0a0a0 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #f0f0f0 0%, #d0d0d0 25%, #a8a8a8 60%, #808080 100%)',
        edgeColor: '#707070',
    },
    {
        id: 'bronze',
        name: '铜币',
        category: 'classic',
        frontImage: '正',
        backImage: '反',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #e8c896 0%, #cd7f32 25%, #b87333 60%, #8b4513 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #d4a574 0%, #b87333 25%, #8b4513 60%, #654321 100%)',
        edgeColor: '#4a3520',
    },
    // 国家货币
    {
        id: 'cny',
        name: '人民币',
        category: 'currency',
        frontImage: '1',
        backImage: '菊',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #fff8dc 0%, #ffd700 20%, #daa520 50%, #b8860b 80%, #8b6508 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #f5e6c8 0%, #daa520 20%, #b8860b 50%, #8b6508 80%, #6b4c08 100%)',
        edgeColor: '#6b4c08',
    },
    {
        id: 'usd',
        name: '美元',
        category: 'currency',
        frontImage: '25¢',
        backImage: '鹰',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #f8f8f8 0%, #d8d8d8 25%, #b0b0b0 60%, #888888 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #e8e8e8 0%, #c8c8c8 25%, #a0a0a0 60%, #787878 100%)',
        edgeColor: '#606060',
    },
    {
        id: 'eur',
        name: '欧元',
        category: 'currency',
        frontImage: '€1',
        backImage: '★',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #fff8dc 0%, #ffd700 15%, #c0c0c0 40%, #a0a0a0 70%, #808080 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #f5f0dc 0%, #daa520 15%, #a8a8a8 40%, #888888 70%, #686868 100%)',
        edgeColor: '#505050',
    },
    {
        id: 'jpy',
        name: '日元',
        category: 'currency',
        frontImage: '500',
        backImage: '桐',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #fff8f0 0%, #e8d8c0 20%, #c8b8a0 50%, #a89880 80%, #887860 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #f0e8e0 0%, #d8c8b0 20%, #b8a890 50%, #988870 80%, #786850 100%)',
        edgeColor: '#605040',
    },
    {
        id: 'gbp',
        name: '英镑',
        category: 'currency',
        frontImage: '£1',
        backImage: '冠',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #fff8dc 0%, #ffd700 15%, #c0c0c0 40%, #a8a8a8 70%, #909090 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #f8f0d8 0%, #e8c840 15%, #b0b0b0 40%, #989898 70%, #808080 100%)',
        edgeColor: '#606060',
    },
    // 古币
    {
        id: 'tongqian',
        name: '开元通宝',
        category: 'ancient',
        frontImage: '開元',
        backImage: '通寳',
        frontBg: 'radial-gradient(ellipse at 35% 35%, #a08060 0%, #806040 30%, #604020 60%, #402010 100%)',
        backBg: 'radial-gradient(ellipse at 35% 35%, #907050 0%, #705030 30%, #503010 60%, #301000 100%)',
        edgeColor: '#201000',
    },
    {
        id: 'yuandatou',
        name: '袁大头',
        category: 'ancient',
        frontImage: '袁',
        backImage: '壹圓',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #e8e8e8 0%, #c8c8c8 25%, #a0a0a0 55%, #787878 85%, #606060 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #d8d8d8 0%, #b8b8b8 25%, #909090 55%, #686868 85%, #505050 100%)',
        edgeColor: '#404040',
    },
    {
        id: 'roman',
        name: '罗马银币',
        category: 'ancient',
        frontImage: 'Ⅶ',
        backImage: 'SPQR',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #d0d0d0 0%, #a8a8a8 30%, #808080 60%, #585858 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #c0c0c0 0%, #989898 30%, #707070 60%, #484848 100%)',
        edgeColor: '#383838',
    },
    {
        id: 'greek',
        name: '雅典德拉克马',
        category: 'ancient',
        frontImage: 'Α',
        backImage: '鸮',
        frontBg: 'radial-gradient(ellipse at 30% 30%, #c8c8c8 0%, #a0a0a0 30%, #787878 60%, #505050 100%)',
        backBg: 'radial-gradient(ellipse at 30% 30%, #b8b8b8 0%, #909090 30%, #686868 60%, #404040 100%)',
        edgeColor: '#303030',
    },
];

interface FlipResult {
    id: string;
    timestamp: string;
    result: 'heads' | 'tails';
    coinStyle: string;
}

export default function CoinFlipPage() {
    const [selectedCoin, setSelectedCoin] = useState<CoinStyle>(COIN_STYLES[0]);
    const [isFlipping, setIsFlipping] = useState(false);
    const [currentResult, setCurrentResult] = useState<'heads' | 'tails' | null>(null);
    const [results, setResults] = useState<FlipResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showStylePicker, setShowStylePicker] = useState(false);
    
    const touchStartY = useRef<number>(0);

    const flipCoin = useCallback(async () => {
        if (isFlipping) return;

        setIsFlipping(true);
        setError(null);
        setCurrentResult(null);

        // 先调用API获取结果
        const result = await fetchRandomIntegers(1, 0, 1);

        if (isError(result)) {
            setError(result.message);
            setIsFlipping(false);
            return;
        }

        const isHeads = result[0] === 0;
        const flipResult: FlipResult = {
            id: `flip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toLocaleString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }),
            result: isHeads ? 'heads' : 'tails',
            coinStyle: selectedCoin.name,
        };

        // 设置结果，触发动画
        setCurrentResult(isHeads ? 'heads' : 'tails');
        
        // 动画结束后更新状态
        setTimeout(() => {
            setResults(prev => [flipResult, ...prev].slice(0, 20));
            setIsFlipping(false);
        }, 1500);
    }, [isFlipping, selectedCoin]);

    // 触摸事件处理
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY.current - touchEndY;
        
        if (diff > 50) {
            flipCoin();
        }
    };

    // 统计
    const headsCount = results.filter(r => r.result === 'heads').length;
    const tailsCount = results.filter(r => r.result === 'tails').length;

    const categoryNames: Record<string, string> = {
        classic: '经典款式',
        currency: '国家货币',
        ancient: '古币',
    };

    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/random" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">🪙 抛硬币</h1>
                    <div style={{ width: '80px' }}></div>
                </div>

                {/* 硬币样式选择按钮 */}
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <button
                        onClick={() => setShowStylePicker(!showStylePicker)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.875rem' }}
                    >
                        {selectedCoin.name} ▼
                    </button>
                </div>

                {/* 硬币样式选择器 */}
                {showStylePicker && (
                    <div className="coin-style-picker" style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                    }}>
                        {(['classic', 'currency', 'ancient'] as const).map(category => (
                            <div key={category} style={{ marginBottom: '1rem' }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '0.5rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}>
                                    {categoryNames[category]}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                }}>
                                    {COIN_STYLES.filter(c => c.category === category).map(coin => (
                                        <button
                                            key={coin.id}
                                            onClick={() => {
                                                setSelectedCoin(coin);
                                                setShowStylePicker(false);
                                                setCurrentResult(null);
                                            }}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                fontSize: '0.8125rem',
                                                background: selectedCoin.id === coin.id 
                                                    ? 'var(--accent-primary)' 
                                                    : 'var(--bg-secondary)',
                                                color: selectedCoin.id === coin.id 
                                                    ? 'white' 
                                                    : 'var(--text-primary)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {coin.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 硬币展示区域 */}
                <div 
                    className="coin-flip-area"
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
                    }}
                >
                    {/* 提示文字 */}
                    <div style={{
                        position: 'absolute',
                        top: '1rem',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        opacity: isFlipping ? 0 : 0.8,
                        transition: 'opacity 0.3s',
                    }}>
                        向上滑动或点击按钮抛硬币
                    </div>

                    {/* 3D 硬币 */}
                    <div 
                        className={`coin-3d-wrapper ${isFlipping ? 'flipping' : ''}`}
                        style={{
                            '--final-rotation': currentResult === 'tails' ? '180deg' : '0deg',
                        } as React.CSSProperties}
                    >
                        <div className="coin-3d-inner">
                            {/* 正面 */}
                            <div 
                                className={`coin-face-new coin-front-new ${selectedCoin.id === 'tongqian' ? 'square-hole' : ''}`}
                                style={{
                                    background: selectedCoin.frontBg,
                                    borderColor: selectedCoin.edgeColor,
                                }}
                            >
                                <div className="coin-rim" style={{ borderColor: selectedCoin.edgeColor }} />
                                <div className="coin-inner-circle" />
                                <span className="coin-text">{selectedCoin.frontImage}</span>
                            </div>
                            {/* 反面 */}
                            <div 
                                className={`coin-face-new coin-back-new ${selectedCoin.id === 'tongqian' ? 'square-hole' : ''}`}
                                style={{
                                    background: selectedCoin.backBg,
                                    borderColor: selectedCoin.edgeColor,
                                }}
                            >
                                <div className="coin-rim" style={{ borderColor: selectedCoin.edgeColor }} />
                                <div className="coin-inner-circle" />
                                <span className="coin-text">{selectedCoin.backImage}</span>
                            </div>
                            {/* 硬币边缘 */}
                            <div className="coin-edge" style={{ background: selectedCoin.edgeColor }} />
                        </div>
                    </div>

                    {/* 结果显示 */}
                    {currentResult && !isFlipping && (
                        <div style={{
                            position: 'absolute',
                            bottom: '1rem',
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: currentResult === 'heads' ? 'var(--success-color)' : 'var(--accent-primary)',
                        }}>
                            {currentResult === 'heads' ? '正面' : '反面'}
                        </div>
                    )}
                </div>

                {/* 抛掷按钮 */}
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={flipCoin}
                        disabled={isFlipping}
                        className="btn btn-primary"
                        style={{
                            fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                            padding: 'clamp(1rem, 4vw, 1.25rem) clamp(2rem, 8vw, 3rem)',
                            opacity: isFlipping ? 0.6 : 1,
                            cursor: isFlipping ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isFlipping ? '抛掷中...' : '🪙 抛硬币'}
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="error-message">
                        <strong>⚠️ 错误:</strong> {error}
                    </div>
                )}

                {/* 统计信息 */}
                {results.length > 0 && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            textAlign: 'center',
                        }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success-color)' }}>
                                    {headsCount}
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>正面</div>
                            </div>
                            <div style={{
                                width: '1px',
                                background: 'var(--border-color)',
                            }} />
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                    {tailsCount}
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>反面</div>
                            </div>
                            <div style={{
                                width: '1px',
                                background: 'var(--border-color)',
                            }} />
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {results.length}
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>总次数</div>
                            </div>
                        </div>
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
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                        }}>
                            {results.slice(0, 20).map((r, i) => (
                                <div
                                    key={r.id}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        background: r.result === 'heads' 
                                            ? 'rgba(16, 185, 129, 0.15)' 
                                            : 'rgba(99, 102, 241, 0.15)',
                                        color: r.result === 'heads' 
                                            ? 'var(--success-color)' 
                                            : 'var(--accent-primary)',
                                        animation: i === 0 ? 'fadeInUp 0.3s ease' : 'none',
                                    }}
                                    title={`${r.timestamp} - ${r.coinStyle}`}
                                >
                                    {r.result === 'heads' ? '正' : '反'}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
