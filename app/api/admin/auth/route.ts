import { NextRequest, NextResponse } from 'next/server';

/**
 * 管理员认证 API
 * POST /api/admin/auth
 */
export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            return NextResponse.json({
                success: false,
                error: '未配置管理员密码，请在环境变量中设置 ADMIN_PASSWORD',
            }, { status: 500 });
        }

        if (password === adminPassword) {
            // 生成一个简单的 token（实际生产环境应使用 JWT）
            const token = Buffer.from(`${adminPassword}:${Date.now()}`).toString('base64');
            
            return NextResponse.json({
                success: true,
                token,
            });
        }

        return NextResponse.json({
            success: false,
            error: '密码错误',
        }, { status: 401 });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: '请求格式错误',
        }, { status: 400 });
    }
}
