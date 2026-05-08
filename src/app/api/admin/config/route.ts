/* eslint-disable no-console */
/**src\app\api\admin\config\route.ts */
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 获取用户角色（与 wordlists 路由保持一致）
 * @returns 'owner' | 'admin' | 'none'
 */
async function getUserRole(
  username: string,
): Promise<'owner' | 'admin' | 'none'> {
  // 站长（owner）
  if (username === process.env.USERNAME) {
    return 'owner';
  }

  try {
    const config = await getConfig();
    const user = config.UserConfig.Users.find((u) => u.username === username);
    if (user && user.role === 'admin' && !user.banned) {
      return 'admin';
    }
    return 'none';
  } catch {
    return 'none';
  }
}

export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 },
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const username = authInfo.username;

  try {
    const config = await getConfig();
    const result: AdminConfigResult = {
      Role: 'owner',
      Config: config,
    };
    if (username === process.env.USERNAME) {
      result.Role = 'owner';
    } else {
      const user = config.UserConfig.Users.find((u) => u.username === username);
      if (user && user.role === 'admin' && !user.banned) {
        result.Role = 'admin';
      } else {
        return NextResponse.json(
          { error: '你是管理员吗你就访问？' },
          { status: 401 },
        );
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('获取管理员配置失败:', error);
    return NextResponse.json(
      {
        error: '获取管理员配置失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 },
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = authInfo.username;
  const role = await getUserRole(username);

  // 允许 owner 或 admin 修改配置
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json(
      { error: '只有站长或管理员可以修改配置' },
      { status: 403 },
    );
  }

  try {
    const newConfig: AdminConfig = await request.json();

    // 保存新配置
    await db.saveAdminConfig(newConfig);

    // 清除缓存，强制下次重新从数据库读取
    clearConfigCache();

    // 刷新所有页面的缓存，使新配置立即生效（无需重启Docker）
    revalidatePath('/', 'layout');

    // 添加 no-cache headers，防止 Docker 环境下 Next.js Router Cache 问题
    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    console.error('保存管理员配置失败:', error);
    return NextResponse.json(
      {
        error: '保存配置失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
