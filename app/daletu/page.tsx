import Link from 'next/link';

const features = [
    {
        id: 'generate',
        href: '/daletu/generate',
        icon: '🎲',
        title: '随机生成',
        description: '基于大气噪声生成真随机号码',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
        iconBg: 'rgba(99, 102, 241, 0.12)',
    },
    {
        id: 'test',
        href: '/daletu/test',
        icon: '🎯',
        title: '往期随机测试',
        description: '用随机号码测试往期中奖情况',
        gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        iconBg: 'rgba(16, 185, 129, 0.12)',
    },
    {
        id: 'history',
        href: '/daletu/history',
        icon: '📊',
        title: '开奖查询',
        description: '查询往期大乐透开奖号码',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        iconBg: 'rgba(245, 158, 11, 0.12)',
    },
];

export default function DaletuPage() {
    return (
        <div className="container">
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 返回
                    </Link>
                    <h1 className="page-title">
                        🎱 大乐透
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

                {/* 玩法说明 */}
                <div className="info-card">
                    <h4>🎯 大乐透玩法说明</h4>
                    <div className="info-content">
                        <div className="info-item">
                            <span className="info-label">前区</span>
                            <span className="info-value">从 01-35 选择 5 个号码</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">后区</span>
                            <span className="info-value">从 01-12 选择 2 个号码</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">开奖时间</span>
                            <span className="info-value">每周一、三、六 21:30</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
