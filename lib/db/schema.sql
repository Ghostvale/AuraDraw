-- ============================================
-- AuraDraw 彩票开奖数据库表结构设计
-- 兼容体彩、福彩所有彩种
-- ============================================

-- 彩种配置表 - 存储彩种的基本配置信息
CREATE TABLE IF NOT EXISTS lottery_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,           -- 彩种代码：dlt, ssq, qlc, 3d, pl3, pl5 等
    name VARCHAR(50) NOT NULL,                  -- 彩种名称：大乐透、双色球等
    category VARCHAR(20) NOT NULL,              -- 分类：sports(体彩), welfare(福彩)
    main_count INT NOT NULL,                    -- 主区球数量
    main_range_start INT NOT NULL DEFAULT 1,    -- 主区号码起始
    main_range_end INT NOT NULL,                -- 主区号码结束
    extra_count INT DEFAULT 0,                  -- 附加区球数量
    extra_range_start INT DEFAULT 1,            -- 附加区号码起始
    extra_range_end INT DEFAULT 0,              -- 附加区号码结束
    draw_time VARCHAR(100),                     -- 开奖时间描述
    draw_days VARCHAR(50),                      -- 开奖日：1,3,6 表示周一三六
    is_active BOOLEAN DEFAULT TRUE,             -- 是否启用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 开奖记录表 - 存储所有彩种的开奖结果
CREATE TABLE IF NOT EXISTS lottery_results (
    id SERIAL PRIMARY KEY,
    lottery_code VARCHAR(20) NOT NULL,          -- 彩种代码，关联 lottery_types.code
    issue VARCHAR(30) NOT NULL,                 -- 期号：如 2026001
    draw_date DATE NOT NULL,                    -- 开奖日期
    main_numbers VARCHAR(100) NOT NULL,         -- 主区号码，逗号分隔：01,05,12,25,33
    extra_numbers VARCHAR(50),                  -- 附加区号码，逗号分隔：02,09
    prize_pool BIGINT,                          -- 奖池金额（分）
    total_sales BIGINT,                         -- 销售总额（分）
    raw_data JSONB,                             -- 原始数据（备用，存储API返回的完整数据）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lottery_code, issue)                 -- 确保每个彩种每期唯一
);

-- 同步状态表 - 记录每个彩种的同步进度
CREATE TABLE IF NOT EXISTS sync_status (
    id SERIAL PRIMARY KEY,
    lottery_code VARCHAR(20) NOT NULL UNIQUE,   -- 彩种代码
    last_synced_issue VARCHAR(30),              -- 最后同步的期号
    last_synced_date DATE,                      -- 最后同步日期
    oldest_synced_issue VARCHAR(30),            -- 最早同步的期号（用于历史回溯）
    is_history_complete BOOLEAN DEFAULT FALSE,  -- 历史数据是否同步完成
    last_sync_at TIMESTAMP,                     -- 最后同步时间
    sync_count INT DEFAULT 0,                   -- 累计同步次数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lottery_results_code_date ON lottery_results(lottery_code, draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_results_code_issue ON lottery_results(lottery_code, issue DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_results_draw_date ON lottery_results(draw_date DESC);

-- ============================================
-- 初始化彩种数据
-- ============================================

-- 体彩
INSERT INTO lottery_types (code, name, category, main_count, main_range_start, main_range_end, extra_count, extra_range_start, extra_range_end, draw_time, draw_days)
VALUES 
    ('dlt', '大乐透', 'sports', 5, 1, 35, 2, 1, 12, '每周一、三、六 21:30', '1,3,6'),
    ('pl3', '排列3', 'sports', 3, 0, 9, 0, 0, 0, '每天 21:30', '0,1,2,3,4,5,6'),
    ('pl5', '排列5', 'sports', 5, 0, 9, 0, 0, 0, '每天 21:30', '0,1,2,3,4,5,6'),
    ('qxc', '七星彩', 'sports', 7, 0, 9, 0, 0, 0, '每周二、五、日 21:30', '0,2,5')
ON CONFLICT (code) DO NOTHING;

-- 福彩
INSERT INTO lottery_types (code, name, category, main_count, main_range_start, main_range_end, extra_count, extra_range_start, extra_range_end, draw_time, draw_days)
VALUES 
    ('ssq', '双色球', 'welfare', 6, 1, 33, 1, 1, 16, '每周二、四、日 21:15', '0,2,4'),
    ('fc3d', '福彩3D', 'welfare', 3, 0, 9, 0, 0, 0, '每天 21:15', '0,1,2,3,4,5,6'),
    ('qlc', '七乐彩', 'welfare', 7, 1, 30, 1, 1, 30, '每周一、三、五 21:15', '1,3,5')
ON CONFLICT (code) DO NOTHING;

-- 初始化同步状态
INSERT INTO sync_status (lottery_code)
VALUES ('dlt'), ('ssq'), ('pl3'), ('pl5'), ('qxc'), ('fc3d'), ('qlc')
ON CONFLICT (lottery_code) DO NOTHING;
