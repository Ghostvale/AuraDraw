'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SyncStatus {
    lottery_code: string;
    last_synced_issue: string | null;
    last_synced_date: string | null;
    oldest_synced_issue: string | null;
    is_history_complete: boolean;
    sync_count: number;
    last_sync_at: string | null;
}

export default function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // 同步状态
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [recordCount, setRecordCount] = useState(0);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    // 操作状态
    const [logs, setLogs] = useState<string[]>([]);
    const [isOperating, setIsOperating] = useState(false);

    // 同步配置
    const [syncConfig, setSyncConfig] = useState({
        code: 'dlt',
        page: 1,
        limit: 50,
        autoPage: true,
    });

    // 添加日志
    const addLog = (message: string) => {
        const time = new Date().toLocaleTimeString('zh-CN');
        setLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 99)]);
    };

    // 登录
    const handleLogin = async () => {
        setIsLoggingIn(true);
        setLoginError('');

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();

            if (data.success) {
                setToken(data.token);
                setIsLoggedIn(true);
                localStorage.setItem('admin_token', data.token);
                addLog('登录成功');
            } else {
                setLoginError(data.error || '登录失败');
            }
        } catch (err) {
            setLoginError('网络错误');
        }

        setIsLoggingIn(false);
    };

    // 检查本地存储的 token
    useEffect(() => {
        const savedToken = localStorage.getItem('admin_token');
        if (savedToken) {
            setToken(savedToken);
            setIsLoggedIn(true);
        }
    }, []);

    // 获取同步状态
    const fetchStatus = useCallback(async () => {
        if (!token) return;
        
        setIsLoadingStatus(true);
        try {
            const res = await fetch(`/api/admin/sync?action=status&code=${syncConfig.code}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                setSyncStatus(data.data.syncStatus);
                setRecordCount(data.data.recordCount);
            } else if (res.status === 401) {
                setIsLoggedIn(false);
                localStorage.removeItem('admin_token');
            }
        } catch (err) {
            addLog('获取状态失败');
        }
        setIsLoadingStatus(false);
    }, [token, syncConfig.code]);

    // 登录后获取状态
    useEffect(() => {
        if (isLoggedIn && token) {
            fetchStatus();
        }
    }, [isLoggedIn, token, fetchStatus]);

    // 执行操作
    const executeAction = async (action: string, params?: Record<string, unknown>) => {
        setIsOperating(true);
        addLog(`开始执行: ${action}`);

        try {
            const res = await fetch('/api/admin/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action, ...params }),
            });
            const data = await res.json();

            if (data.success) {
                addLog(`✅ ${data.message || '操作成功'}`);
                if (data.fetched !== undefined) {
                    addLog(`   获取: ${data.fetched} 条, 新增: ${data.inserted} 条`);
                }
                if (data.latestIssue) {
                    // 显示期号和开奖时间
                    const latestInfo = data.latestDateTime 
                        ? `${data.latestIssue} (${data.latestDateTime})`
                        : data.latestIssue;
                    const oldestInfo = data.oldestDateTime 
                        ? `${data.oldestIssue} (${data.oldestDateTime})`
                        : data.oldestIssue;
                    addLog(`   期号范围: ${oldestInfo} ~ ${latestInfo}`);
                }
                if (data.hasMore === false) {
                    addLog(`   ℹ️ 已到达数据末尾`);
                }
                // 刷新状态
                fetchStatus();
                return data;
            } else {
                addLog(`❌ 失败: ${data.error}`);
                if (data.apiError) {
                    addLog(`   这可能是 API 接口问题，请稍后重试`);
                }
                return null;
            }
        } catch (err) {
            addLog(`❌ 网络错误: ${err}`);
            return null;
        } finally {
            setIsOperating(false);
        }
    };

    // 初始化数据库
    const handleInit = () => executeAction('init');

    // 同步数据
    const handleSync = async () => {
        const result = await executeAction('sync', {
            code: syncConfig.code,
            page: syncConfig.page,
            limit: syncConfig.limit,
        });

        // 自动翻页
        if (result?.hasMore && syncConfig.autoPage) {
            setSyncConfig(prev => ({ ...prev, page: prev.page + 1 }));
        }
    };

    // 批量同步
    const handleBatchSync = async () => {
        addLog('开始批量同步...');
        let currentPage = syncConfig.page;
        let hasMore = true;
        let totalFetched = 0;
        let totalInserted = 0;

        while (hasMore && currentPage <= syncConfig.page + 9) { // 最多10页
            const result = await executeAction('sync', {
                code: syncConfig.code,
                page: currentPage,
                limit: syncConfig.limit,
            });

            if (!result) {
                addLog('批量同步中断');
                break;
            }

            totalFetched += result.fetched || 0;
            totalInserted += result.inserted || 0;
            hasMore = result.hasMore;
            currentPage++;

            // 延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        addLog(`批量同步完成: 共获取 ${totalFetched} 条, 新增 ${totalInserted} 条`);
        setSyncConfig(prev => ({ ...prev, page: currentPage }));
    };

    // 重置同步状态
    const handleReset = () => {
        executeAction('reset', { code: syncConfig.code });
        setSyncConfig(prev => ({ ...prev, page: 1 }));
    };

    // 获取最新开奖（实时查询）
    const handleFetchLatest = async () => {
        setIsOperating(true);
        addLog(`🔍 正在查询 ${syncConfig.code === 'dlt' ? '大乐透' : '双色球'} 最新开奖...`);

        try {
            const res = await fetch('/api/admin/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action: 'fetchLatest', code: syncConfig.code }),
            });
            const data = await res.json();

            if (data.success) {
                addLog(`✅ ${data.message}`);
                addLog(`   期号: ${data.latestIssue} (${data.latestDateTime})`);
                // 格式化号码显示
                const mainNums = data.mainNumbers?.split(',').map((n: string) => n.padStart(2, '0')).join(' ') || '-';
                const extraNums = data.extraNumbers?.split(',').map((n: string) => n.padStart(2, '0')).join(' ') || '-';
                addLog(`   开奖号码: [${mainNums}] + [${extraNums}]`);
                if (data.totalSales) {
                    addLog(`   销售额: ¥${(data.totalSales / 100).toLocaleString()}`);
                }
                addLog(`   ${data.inserted > 0 ? '🆕 新数据已入库' : 'ℹ️ 数据已存在'}`);
                // 刷新状态
                fetchStatus();
            } else {
                addLog(`❌ 失败: ${data.error}`);
                if (data.apiError) {
                    addLog(`   这可能是 API 接口问题，请稍后重试`);
                }
            }
        } catch (err) {
            addLog(`❌ 网络错误: ${err}`);
        } finally {
            setIsOperating(false);
        }
    };

    // 登出
    const handleLogout = () => {
        setIsLoggedIn(false);
        setToken('');
        localStorage.removeItem('admin_token');
        setLogs([]);
    };

    // 登录界面
    if (!isLoggedIn) {
        return (
            <div className="container" style={{ maxWidth: '400px' }}>
                <div style={{ paddingTop: '4rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                            🔐 管理后台
                        </h1>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            请输入管理员密码
                        </p>
                    </div>

                    <div className="info-card">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            placeholder="输入密码"
                            className="input-field"
                            style={{ width: '100%', marginBottom: '1rem' }}
                        />
                        
                        {loginError && (
                            <p style={{ color: 'var(--error-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                {loginError}
                            </p>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={isLoggingIn || !password}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                        >
                            {isLoggingIn ? '登录中...' : '登录'}
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            ← 返回首页
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // 管理界面
    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <div style={{ paddingTop: '1rem' }}>
                {/* Header */}
                <div className="page-header">
                    <Link href="/" className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                        ← 首页
                    </Link>
                    <h1 className="page-title">🔧 管理后台</h1>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary"
                        style={{ padding: '0.75rem 1.25rem' }}
                    >
                        登出
                    </button>
                </div>

                {/* 状态卡片 */}
                <div className="info-card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4>📊 同步状态</h4>
                        <button
                            onClick={fetchStatus}
                            disabled={isLoadingStatus}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                        >
                            {isLoadingStatus ? '刷新中...' : '刷新'}
                        </button>
                    </div>
                    
                    {syncStatus ? (
                        <div className="info-content">
                            <div className="info-item">
                                <span className="info-label">彩种</span>
                                <span className="info-value">{syncStatus.lottery_code}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">数据库记录数</span>
                                <span className="info-value">{recordCount.toLocaleString()} 条</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">最新期号</span>
                                <span className="info-value">{syncStatus.last_synced_issue || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">最早期号</span>
                                <span className="info-value">{syncStatus.oldest_synced_issue || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">历史同步完成</span>
                                <span className="info-value">{syncStatus.is_history_complete ? '✅ 是' : '❌ 否'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">累计同步次数</span>
                                <span className="info-value">{syncStatus.sync_count} 次</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">最后同步时间</span>
                                <span className="info-value">
                                    {syncStatus.last_sync_at 
                                        ? new Date(syncStatus.last_sync_at).toLocaleString('zh-CN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            hour12: false
                                          }).replace(/\//g, '-')
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                            {isLoadingStatus ? '加载中...' : '暂无数据，请先初始化数据库'}
                        </p>
                    )}
                </div>

                {/* 操作区 */}
                <div className="info-card" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem' }}>⚙️ 操作</h4>
                    
                    {/* 同步配置 */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                    }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                                彩种
                            </label>
                            <select
                                value={syncConfig.code}
                                onChange={(e) => setSyncConfig(prev => ({ ...prev, code: e.target.value, page: 1 }))}
                                className="filter-select"
                                style={{ width: '100%' }}
                            >
                                <option value="dlt">大乐透</option>
                                <option value="ssq">双色球</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                                页码
                            </label>
                            <input
                                type="number"
                                value={syncConfig.page}
                                onChange={(e) => setSyncConfig(prev => ({ ...prev, page: parseInt(e.target.value) || 1 }))}
                                min={1}
                                className="filter-input"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                                每页数量
                            </label>
                            <select
                                value={syncConfig.limit}
                                onChange={(e) => setSyncConfig(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                                className="filter-select"
                                style={{ width: '100%' }}
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <button
                            onClick={handleInit}
                            disabled={isOperating}
                            className="btn btn-secondary"
                            style={{ flex: '1 1 auto', minWidth: '120px' }}
                        >
                            🗄️ 初始化数据库
                        </button>
                        <button
                            onClick={handleFetchLatest}
                            disabled={isOperating}
                            className="btn btn-primary"
                            style={{ flex: '1 1 auto', minWidth: '120px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                            {isOperating ? '查询中...' : '⚡ 查询最新开奖'}
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={isOperating}
                            className="btn btn-primary"
                            style={{ flex: '1 1 auto', minWidth: '120px' }}
                        >
                            {isOperating ? '同步中...' : `📥 同步第 ${syncConfig.page} 页`}
                        </button>
                        <button
                            onClick={handleBatchSync}
                            disabled={isOperating}
                            className="btn btn-primary"
                            style={{ flex: '1 1 auto', minWidth: '120px' }}
                        >
                            📦 批量同步 (10页)
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={isOperating}
                            className="btn btn-secondary"
                            style={{ flex: '1 1 auto', minWidth: '120px' }}
                        >
                            🔄 重置状态
                        </button>
                    </div>
                </div>

                {/* 日志 */}
                <div className="info-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4>📝 操作日志</h4>
                        <button
                            onClick={() => setLogs([])}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        >
                            清空
                        </button>
                    </div>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        padding: '1rem',
                        maxHeight: '300px',
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        lineHeight: '1.6',
                    }}>
                        {logs.length === 0 ? (
                            <span style={{ color: 'var(--text-secondary)' }}>暂无日志</span>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} style={{ color: log.includes('❌') ? 'var(--error-color)' : log.includes('✅') ? 'var(--success-color)' : 'inherit' }}>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 说明 */}
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                }}>
                    <p><strong>💡 使用说明：</strong></p>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                        <li>首次使用请先点击「初始化数据库」</li>
                        <li>点击「⚡ 查询最新开奖」实时获取最新一期开奖结果</li>
                        <li>点击「同步」获取单页数据，点击「批量同步」一次获取10页历史</li>
                        <li>如果 API 报错，可以换个页码或稍后重试</li>
                        <li>历史同步完成后，每天定时任务会自动同步增量数据</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
