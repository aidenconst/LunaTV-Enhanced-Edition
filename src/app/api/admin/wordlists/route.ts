/* eslint-disable no-console */
/**src\app\api\admin\wordlists\route.ts */
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// KV 存储的键名
const KEY_HOT = 'wordlist:hot';
const KEY_SENSITIVE = 'wordlist:sensitive';
const KEY_ACTOR = 'wordlist:actor';

/**
 * 从 KV 读取字符串数组
 */
async function getWordList(key: string): Promise<string[]> {
  try {
    const raw = await db.get(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 保存字符串数组到 KV
 */
async function setWordList(key: string, list: string[]): Promise<void> {
  await db.set(key, JSON.stringify(list));
}

/**
 * 获取用户角色（参照 config/route.ts 的权限验证方式）
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

/**
 * GET /api/admin/wordlists
 * 获取所有分词配置（需要 owner 或 admin 权限）
 */
export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '不支持本地存储进行管理员配置' },
      { status: 400 },
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = authInfo.username;
  const role = await getUserRole(username);

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  const [hot, sensitive, actor] = await Promise.all([
    getWordList(KEY_HOT),
    getWordList(KEY_SENSITIVE),
    getWordList(KEY_ACTOR),
  ]);

  return NextResponse.json({ hot, sensitive, actor });
}

/**
 * POST /api/admin/wordlists
 * 保存分词配置（需要 owner 或 admin 权限）
 */
export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '不支持本地存储进行管理员配置' },
      { status: 400 },
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = authInfo.username;
  const role = await getUserRole(username);

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json(
      { error: '只有站长或管理员可以修改分词配置' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { hot, sensitive, actor } = body;

    // 验证数据格式
    if (
      !Array.isArray(hot) ||
      !Array.isArray(sensitive) ||
      !Array.isArray(actor)
    ) {
      return NextResponse.json(
        { error: '数据格式错误，需要三个数组字段: hot, sensitive, actor' },
        { status: 400 },
      );
    }

    await Promise.all([
      setWordList(KEY_HOT, hot),
      setWordList(KEY_SENSITIVE, sensitive),
      setWordList(KEY_ACTOR, actor),
    ]);

    // 刷新页面缓存，使新配置立即生效
    revalidatePath('/', 'layout');

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    console.error('保存分词配置失败:', error);
    return NextResponse.json(
      { error: '保存失败', details: (error as Error).message },
      { status: 500 },
    );
  }
}
