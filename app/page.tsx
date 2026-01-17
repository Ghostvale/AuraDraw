import Link from 'next/link';

const modules = [
    {
        id: 'random',
        href: '/random',
        icon: '🎲',
        title: '大气随机数',
        description: '基于真实大气噪声生成真随机数',
        features: ['自定义范围', '历史记录'],
        gradient: 'var(--module-random-gradient)',
        iconBg: 'var(--module-random-bg)',
    },
    {
        id: 'daletu',
        href: '/daletu',
        icon: '🎱',
        title: '大乐透',
        description: '前区5个号码 + 后区2个号码',
        features: ['即时生成', '真随机'],
        gradient: 'var(--module-daletu-gradient)',
        iconBg: 'var(--module-daletu-bg)',
    },
    {
        id: 'shuangseqiu',
        href: '/shuangseqiu',
        icon: '🔮',
        title: '双色球',
        description: '红球6个号码 + 蓝球1个号码',
        features: ['即时生成', '真随机'],
        gradient: 'var(--module-ssq-gradient)',
        iconBg: 'var(--module-ssq-bg)',
    },
];

export default function Home() {
    return (
        <div className="home-container">
            {/* Hero Section */}
            <header className="hero">
                <div className="hero-content">
                    <h1 className="hero-title">AuraDraw</h1>
                    <p className="hero-subtitle">大气随机工具平台</p>
                    <p className="hero-desc">基于真实大气噪声的绝对随机数</p>
                </div>
                <div className="hero-decoration">
                    <div className="floating-orb orb-1"></div>
                    <div className="floating-orb orb-2"></div>
                    <div className="floating-orb orb-3"></div>
                </div>
            </header>

            {/* Modules Grid */}
            <section className="modules-section">
                <h2 className="section-title">选择功能模块</h2>
                <div className="modules-grid">
                    {modules.map((module, index) => (
                        <Link
                            key={module.id}
                            href={module.href}
                            className="module-card"
                            style={{
                                '--card-gradient': module.gradient,
                                '--card-icon-bg': module.iconBg,
                                animationDelay: `${index * 0.1}s`,
                            } as React.CSSProperties}
                        >
                            <div className="module-card-inner">
                                <div className="module-icon">
                                    <span>{module.icon}</span>
                                </div>
                                <div className="module-content">
                                    <h3 className="module-title">{module.title}</h3>
                                    <p className="module-description">{module.description}</p>
                                    <div className="module-features">
                                        {module.features.map((feature) => (
                                            <span key={feature} className="feature-tag">
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="module-arrow">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                            <div className="module-card-glow"></div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Info Footer */}
            <footer className="home-footer">
                <div className="footer-card">
                    <div className="footer-icon">💡</div>
                    <p>
                        本应用使用 <strong>Random.org</strong> 提供的大气随机数API，
                        基于真实的大气噪声生成真随机数，可用于随机数生成、彩票号码等多种场景。
                    </p>
                </div>
            </footer>
        </div>
    );
}
