import Link from 'next/link';

export default function Home() {
    return (
        <div className="container">
            <main style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 4rem)',
                gap: '3rem'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 8vw, 3.5rem)',
                        fontWeight: '700',
                        background: 'var(--accent-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '1rem',
                    }}>
                        AuraDraw
                    </h1>
                    <p style={{
                        fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                        color: 'var(--text-secondary)',
                        fontWeight: '500',
                    }}>
                        大气随机工具平台
                    </p>
                    <p style={{
                        fontSize: 'clamp(0.875rem, 3vw, 1rem)',
                        color: 'var(--text-secondary)',
                        marginTop: '0.5rem',
                    }}>
                        基于真实大气噪声的绝对随机数
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    width: '100%',
                    maxWidth: '400px',
                }}>
                    <Link href="/random" className="btn btn-primary" style={{
                        fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                        padding: 'clamp(1rem, 4vw, 1.25rem) clamp(1.5rem, 6vw, 2rem)',
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🎲</span>
                        大气随机数
                    </Link>

                    <Link href="/daletu" className="btn btn-secondary" style={{
                        fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                        padding: 'clamp(1rem, 4vw, 1.25rem) clamp(1.5rem, 6vw, 2rem)',
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🎱</span>
                        生成大乐透
                    </Link>

                    <Link href="/shuangseqiu" className="btn btn-secondary" style={{
                        fontSize: 'clamp(1rem, 4vw, 1.125rem)',
                        padding: 'clamp(1rem, 4vw, 1.25rem) clamp(1.5rem, 6vw, 2rem)',
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🔮</span>
                        生成双色球
                    </Link>
                </div>

                <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    maxWidth: '500px',
                }}>
                    <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.6',
                        textAlign: 'center',
                    }}>
                        💡 本应用使用 <strong>Random.org</strong> 提供的大气随机数API，
                        基于真实的大气噪声生成真随机数，可用于随机数生成、彩票号码等多种场景。
                    </p>
                </div>
            </main>
        </div>
    );
}

