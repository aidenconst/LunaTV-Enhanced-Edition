'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import VideoCard from '@/components/VideoCard';
import { SearchResult } from '@/lib/types';

interface WordRecommendationProps {
  title: string;
}

type TabType = 'actor' | 'hot' | 'sensitive';

// 计算聚合统计数据（与搜索页保持一致）
function computeGroupStats(group: SearchResult[]) {
  const episodes = (() => {
    const countMap = new Map<number, number>();
    group.forEach((g) => {
      const len = g.episodes?.length || 0;
      if (len > 0) countMap.set(len, (countMap.get(len) || 0) + 1);
    });
    let max = 0;
    let res = 0;
    countMap.forEach((v, k) => {
      if (v > max) {
        max = v;
        res = k;
      }
    });
    return res;
  })();

  const source_names = Array.from(
    new Set(group.map((g) => g.source_name).filter(Boolean)),
  ) as string[];

  const douban_id = (() => {
    const countMap = new Map<number, number>();
    group.forEach((g) => {
      if (g.douban_id && g.douban_id > 0) {
        countMap.set(g.douban_id, (countMap.get(g.douban_id) || 0) + 1);
      }
    });
    let max = 0;
    let res: number | undefined;
    countMap.forEach((v, k) => {
      if (v > max) {
        max = v;
        res = k;
      }
    });
    return res;
  })();

  return { episodes, source_names, douban_id };
}

export default function WordRecommendationSection({
  title,
}: WordRecommendationProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('actor');
  const [wordData, setWordData] = useState<{
    actor: string[];
    hot: string[];
    sensitive: string[];
  }>({ actor: [], hot: [], sensitive: [] });
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [rawResults, setRawResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 聚合后的结果（按标题+年份+类型分组）
  const aggregatedResults = (() => {
    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = [];

    rawResults.forEach((item) => {
      const key = `${item.title.replaceAll(' ', '')}-${item.year || 'unknown'}-${
        item.episodes.length === 1 ? 'movie' : 'tv'
      }`;
      const arr = map.get(key) || [];
      if (arr.length === 0) keyOrder.push(key);
      arr.push(item);
      map.set(key, arr);
    });

    return keyOrder.map(
      (key) => [key, map.get(key)!] as [string, SearchResult[]],
    );
  })();

  // 搜索关键词（最多返回 21 条，但聚合后可能少于分组数）
  const search = async (keyword: string) => {
    if (!keyword) return;
    setSearching(true);
    try {
      // 添加随机时间戳防止浏览器 HTTP 缓存
      const url = `/api/search?q=${encodeURIComponent(keyword)}&_t=${Date.now()}`;
      const res = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      // 限制原始结果数量（最多 21 条原始结果，聚合后会减少）
      setRawResults(results.slice(0, 21));
    } catch (error) {
      console.error('搜索失败:', error);
      setRawResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 获取分词结果，并智能选择默认选项卡和默认搜索词
  const fetchWordSegments = useCallback(async () => {
    if (!title) return;
    setLoading(true);
    try {
      const res = await fetch('/api/wordlists/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (res.ok) {
        const actor = data.actor || [];
        const hot = data.hot || [];
        const sensitive = data.sensitive || [];
        setWordData({ actor, hot, sensitive });

        let firstTab: TabType = 'actor';
        let firstWord = '';
        if (actor.length > 0) {
          firstTab = 'actor';
          firstWord = actor[0];
        } else if (hot.length > 0) {
          firstTab = 'hot';
          firstWord = hot[0];
        } else if (sensitive.length > 0) {
          firstTab = 'sensitive';
          firstWord = sensitive[0];
        }

        if (firstWord) {
          setActiveTab(firstTab);
          setSelectedWord(firstWord);
          await search(firstWord);
        } else {
          setRawResults([]);
          setSelectedWord('');
        }
      }
    } catch (error) {
      console.error('获取分词失败:', error);
    } finally {
      setLoading(false);
    }
  }, [title]);

  // 滚动懒加载
  useEffect(() => {
    if (!containerRef.current || hasLoaded) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasLoaded) {
          setHasLoaded(true);
          fetchWordSegments();
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasLoaded, fetchWordSegments]);

  // 未加载时渲染占位符
  if (!hasLoaded) {
    return <div ref={containerRef} />;
  }

  const hasAnyWord =
    wordData.actor.length > 0 ||
    wordData.hot.length > 0 ||
    wordData.sensitive.length > 0;

  // 已加载但无任何词语时显示引导
  if (!loading && !hasAnyWord) {
    return (
      <div ref={containerRef} className='mt-8 border-t pt-6'>
        <h3 className='text-lg font-semibold mb-3'>相关推荐</h3>
        <div className='text-center text-gray-500 text-sm py-6'>
          暂无推荐内容，
          <button
            onClick={() => window.open('/admin')}
            className='text-green-600 underline'
          >
            去后台配置词库
          </button>
        </div>
      </div>
    );
  }

  // 正常渲染
  return (
    <div
      ref={containerRef}
      className='mt-8 border-t border-gray-200 dark:border-gray-700 pt-6'
    >
      <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3'>
        相关推荐
      </h3>

      {/* 选项卡 */}
      <div className='flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700'>
        {[
          { key: 'actor', label: '演员', count: wordData.actor.length },
          { key: 'hot', label: '热门标签', count: wordData.hot.length },
          {
            key: 'sensitive',
            label: '敏感词',
            count: wordData.sensitive.length,
          },
        ].map(({ key, label, count }) => {
          const tabKey = key as TabType;
          const words = wordData[tabKey];
          const hasWords = words.length > 0;

          return (
            <button
              key={key}
              onClick={() => {
                if (!hasWords) return;
                if (activeTab === tabKey) return;
                setActiveTab(tabKey);
                const firstWord = words[0];
                if (firstWord && firstWord !== selectedWord) {
                  setSelectedWord(firstWord);
                  search(firstWord);
                }
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tabKey
                  ? 'text-green-600 border-b-2 border-green-600 dark:text-green-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              } ${!hasWords ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* 词语列表 */}
      {(() => {
        const words = wordData[activeTab];
        if (words.length === 0) return null;
        return (
          <div className='flex flex-wrap gap-2 mb-4'>
            {words.map((word) => (
              <button
                key={word}
                onClick={() => {
                  if (word === selectedWord) return;
                  setSelectedWord(word);
                  search(word);
                }}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedWord === word
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {word}
              </button>
            ))}
          </div>
        );
      })()}

      {/* 搜索结果展示 - 聚合模式 */}
      {searching && (
        <div className='flex justify-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent' />
        </div>
      )}
      {!searching && aggregatedResults.length > 0 && (
        <div className='grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
          {aggregatedResults.map(([mapKey, group]) => {
            const title = group[0]?.title || '';
            const poster = group[0]?.poster || '';
            const year = group[0]?.year || 'unknown';
            const { episodes, source_names, douban_id } =
              computeGroupStats(group);
            const type = episodes === 1 ? 'movie' : 'tv';
            return (
              <div key={mapKey} className='w-full'>
                <VideoCard
                  from='search'
                  isAggregate={true}
                  title={title}
                  poster={poster}
                  year={year}
                  episodes={episodes}
                  source_names={source_names}
                  douban_id={douban_id}
                  query={selectedWord !== title ? selectedWord : ''}
                  type={type}
                />
              </div>
            );
          })}
        </div>
      )}
      {!searching &&
        selectedWord &&
        aggregatedResults.length === 0 &&
        rawResults.length === 0 && (
          <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
            未找到与 “{selectedWord}” 相关的内容
          </div>
        )}
      {loading && (
        <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
          正在分析标题...
        </div>
      )}
    </div>
  );
}
