/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 词库键名（与管理员配置一致）
const KEY_HOT = 'wordlist:hot';
const KEY_SENSITIVE = 'wordlist:sensitive';
const KEY_ACTOR = 'wordlist:actor';

// 获取词库
async function getWordList(key: string): Promise<string[]> {
  try {
    const raw = await db.getCache(key);
    console.log(
      `=================================================[DEBUG] ${key} raw:`,
      raw,
    );
    if (!raw) return [];
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error(
      `********************************************读取词库 ${key} 失败:`,
      err,
    );
    return [];
  }
}

// 匹配标题中的词（按出现位置顺序）
function extractWords(title: string, keywords: string[]): string[] {
  const result: string[] = [];
  const lowerTitle = title.toLowerCase();
  // 按原顺序记录每个匹配的词及其在标题中的位置
  const matches: { word: string; index: number }[] = [];

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    let pos = lowerTitle.indexOf(lowerKeyword);
    while (pos !== -1) {
      matches.push({ word: keyword, index: pos });
      pos = lowerTitle.indexOf(lowerKeyword, pos + 1);
    }
  }

  // 按位置去重并排序
  const uniqueMatches = Array.from(
    new Map(matches.map((m) => [m.word, m])).values(),
  );
  uniqueMatches.sort((a, b) => a.index - b.index);
  return uniqueMatches.map((m) => m.word);
}

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: '无效的标题' }, { status: 400 });
    }

    // 加载三个词库
    const [hotList, sensitiveList, actorList] = await Promise.all([
      getWordList(KEY_HOT),
      getWordList(KEY_SENSITIVE),
      getWordList(KEY_ACTOR),
    ]);

    // 提取匹配的演员
    const matchedActors = extractWords(title, actorList);
    // 提取匹配的热门标签
    const matchedHot = extractWords(title, hotList);
    // 提取匹配的敏感词
    const matchedSensitive = extractWords(title, sensitiveList);

    return NextResponse.json({
      hot: matchedHot,
      sensitive: matchedSensitive,
      actor: matchedActors,
    });
  } catch (error) {
    console.error('分词接口错误:', error);
    return NextResponse.json({ error: '内部错误' }, { status: 500 });
  }
}
