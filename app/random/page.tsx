import Link from 'next/link';

const features = [
    {
        id: 'number',
        href: '/random/number',
        icon: '🔢',
        title: '随机数生成',
        description: '生成指定范围内的真随机数',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
        iconBg: 'rgba(99, 102, 241, 0.12)',
    },
    {
        id: 'coin',
        href: '/random/coin',
        icon: '🪙',
        title: '抛硬币',
        description: '模拟抛硬币，多种硬币样式可选',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        iconBg: 'rgba(245, 158, 11, 0.12)',
    },
    {
        id: 'dice',
        href: '/random/dice',
        icon: '🎲',
        title: '掷骰子',
        description: '掷骰子游戏，支持1-6个骰子',
        gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        iconBg: 'rgba(16, 185, 129, 0.12)',
    },
];

export default function RandomPage() {
    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">
                        🎲 随机工具
                    </h1>
                    <div style={{ width: '80px' }}></div>
                </div>

                {/* 功能卡片 */}
                <div className="feature-grid">
                    {features.map((feature, index) => (
                        <Link
                            key={feature.id}
                            href={feature.href}
                            className="feature-card"
                            style={{
                                '--card-gradient': feature.gradient,
                                '--card-icon-bg': feature.iconBg,
                                animationDelay: `${index * 0.1}s`,
                            } as React.CSSProperties}
                        >
                            <div className="feature-card-inner">
                                <div className="feature-icon">
                                    <span>{feature.icon}</span>
                                </div>
                                <div className="feature-content">
                                    <h3 className="feature-title">{feature.title}</h3>
                                    <p className="feature-description">{feature.description}</p>
                                </div>
                                <div className="feature-arrow">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* 说明 */}
                <div className="info-card">
                    <h4>🌐 关于大气随机数</h4>
                    <div className="info-content">
                        <div className="info-item">
                            <span className="info-label">数据来源</span>
                            <span className="info-value">Random.org 大气噪声</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">随机性</span>
                            <span className="info-value">真随机，非伪随机算法</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">应用场景</span>
                            <span className="info-value">抽奖、决策、游戏等</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
