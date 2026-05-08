'use client';

/**
 * 首页数据获取的 TanStack Query Hooks
 *
 * 基于 TanStack Query 源码最佳实践实现：
 * 1. 使用 useQueries 并行获取多个数据源
 * 2. 设置合适的 staleTime 避免重复请求
 * 3. 使用 combine 函数聚合查询结果
 * 4. 自动错误处理和重试机制
 *
 * 参考：
 * - TanStack Query useQueries 源码
 * - Promise.allSettled 模式
 * - Stale-While-Revalidate 策略
 */

import { useQueries } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import {
  BangumiCalendarData,
  GetBangumiCalendarData,
} from '@/lib/bangumi.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { getRecommendedShortDramas } from '@/lib/shortdrama.client';
import { DoubanItem, ShortDramaItem } from '@/lib/types';

// ============================================================================
// 类型定义
// ============================================================================

export interface HomePageConfig {
  showHotMovies?: boolean;
  showHotTvShows?: boolean;
  showHotVariety?: boolean;
  showNewAnime?: boolean;
  showHotShortDramas?: boolean;
}

export interface HomePageData {
  hotMovies: DoubanItem[];
  hotTvShows: DoubanItem[];
  hotVarietyShows: DoubanItem[];
  hotAnime: DoubanItem[];
  hotShortDramas: ShortDramaItem[];
  bangumiCalendar: BangumiCalendarData[];
}

export interface HomePageQueriesResult {
  data: HomePageData;
  isLoading: boolean;
  isFetching: boolean;
  errors: Error[];
  hasError: boolean;
  refetch: () => void;
}

// ============================================================================
// Hook: 首页数据查询
// ============================================================================

/**
 * 首页数据查询 Hook
 *
 * 特性：
 * - 并行获取 6 个数据源（热门电影、电视剧、综艺、动漫、短剧、番剧日历）
 * - 根据配置动态启用/禁用查询（enabled 参数）
 * - 不同数据类型设置不同的 staleTime
 * - 使用 combine 函数聚合结果，减少重渲染
 * - 任一查询失败不影响其他查询
 * - 自动重试失败的请求
 *
 * staleTime 配置：
 * - 热门内容（电影/电视剧/综艺/动漫）: 2分钟 - 更新较频繁
 * - 短剧推荐: 5分钟 - 更新较慢
 * - 番剧日历: 10分钟 - 每日更新，可以缓存更久
 *
 * @param config - 首页模块配置，控制哪些模块需要加载数据
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   const config = { showHotMovies: true, showHotTvShows: false };
 *   const { data, isLoading, errors } = useHomePageQueries(config);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <div>
 *       <HotMovies movies={data.hotMovies} />
 *       {errors.length > 0 && <ErrorBanner errors={errors} />}
 *     </div>
 *   );
 * }
 * ```
 */
/**
 * 首页数据查询 Hook（优化版，避免无限重渲染）
 *
 * 优化点：
 * 1. 使用 `useRef` 缓存上一次聚合结果，当数据内容未变时返回相同的对象引用
 * 2. `enabledConfig` 依赖具体的布尔值，防止因 config 对象引用变化而重新计算
 * 3. `combine` 函数使用 `useCallback` 稳定化
 *
 * @param config - 首页模块配置，控制哪些模块需要加载数据
 */
export function useHomePageQueries(
  config?: HomePageConfig,
): HomePageQueriesResult {
  // 将 config 对象中的布尔值单独提取，避免对象引用变化导致 enabled 不稳定
  const enabledConfig = useMemo(
    () => ({
      showHotMovies: config?.showHotMovies ?? true,
      showHotTvShows: config?.showHotTvShows ?? true,
      showHotVariety: config?.showHotVariety ?? true,
      showNewAnime: config?.showNewAnime ?? true,
      showHotShortDramas: config?.showHotShortDramas ?? true,
    }),
    [
      config?.showHotMovies,
      config?.showHotTvShows,
      config?.showHotVariety,
      config?.showNewAnime,
      config?.showHotShortDramas,
    ],
  );

  // 缓存上一次的数据，避免引用变化
  const cachedDataRef = useRef<HomePageData | undefined>(undefined);
  const cachedErrorsRef = useRef<Error[]>([]);
  const cachedRefetchRef = useRef<() => void>(() => {});

  // 使用 useQueries 并行获取所有数据
  const result = useQueries({
    queries: [
      // 1. 热门电影
      {
        queryKey: ['douban', 'categories', 'movie', '热门', '全部'],
        queryFn: () =>
          getDoubanCategories({
            kind: 'movie',
            category: '热门',
            type: '全部',
          }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        enabled: enabledConfig.showHotMovies,
      },
      // 2. 热门电视剧
      {
        queryKey: ['douban', 'categories', 'tv', 'tv', 'tv'],
        queryFn: () =>
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        enabled: enabledConfig.showHotTvShows,
      },
      // 3. 热门综艺
      {
        queryKey: ['douban', 'categories', 'tv', 'show', 'show'],
        queryFn: () =>
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        enabled: enabledConfig.showHotVariety,
      },
      // 4. 热门动漫
      {
        queryKey: ['douban', 'categories', 'tv', 'tv', 'tv_animation'],
        queryFn: () =>
          getDoubanCategories({
            kind: 'tv',
            category: 'tv',
            type: 'tv_animation',
          }),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        enabled: enabledConfig.showNewAnime,
      },
      // 5. 短剧推荐
      {
        queryKey: ['shortdramas', 'recommended', 8],
        queryFn: () => getRecommendedShortDramas(undefined, 8),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: 2,
        enabled: enabledConfig.showHotShortDramas,
      },
      // 6. 番剧日历
      {
        queryKey: ['bangumi', 'calendar'],
        queryFn: () => GetBangumiCalendarData(),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        enabled: enabledConfig.showNewAnime,
      },
    ],
    combine: useCallback((results: any[]) => {
      // 从各个结果中提取数据
      const newData: HomePageData = {
        hotMovies: results[0].data?.code === 200 ? results[0].data.list : [],
        hotTvShows: results[1].data?.code === 200 ? results[1].data.list : [],
        hotVarietyShows:
          results[2].data?.code === 200 ? results[2].data.list : [],
        hotAnime: results[3].data?.code === 200 ? results[3].data.list : [],
        hotShortDramas: results[4].data || [],
        bangumiCalendar: results[5].data || [],
      };

      const newErrors = results
        .filter((r) => r.error)
        .map((r) => r.error as Error);
      const newIsLoading = results.some((r) => r.isLoading);
      const newIsFetching = results.some((r) => r.isFetching);
      const newRefetch = () => results.forEach((r) => r.refetch());

      // 检查数据是否真正发生了变化（浅比较关键数组的长度）
      const cached = cachedDataRef.current;
      let dataUnchanged =
        !!cached &&
        newData.hotMovies.length === cached.hotMovies.length &&
        newData.hotTvShows.length === cached.hotTvShows.length &&
        newData.hotVarietyShows.length === cached.hotVarietyShows.length &&
        newData.hotAnime.length === cached.hotAnime.length &&
        newData.hotShortDramas.length === cached.hotShortDramas.length &&
        newData.bangumiCalendar.length === cached.bangumiCalendar.length;

      // 如果数据未变，返回缓存的引用（避免重新渲染）
      if (dataUnchanged) {
        return {
          data: cached,
          isLoading: newIsLoading,
          isFetching: newIsFetching,
          errors: cachedErrorsRef.current,
          hasError: cachedErrorsRef.current.length > 0,
          refetch: cachedRefetchRef.current,
        };
      }

      // 数据有变化，更新缓存并返回新对象
      cachedDataRef.current = newData;
      cachedErrorsRef.current = newErrors;
      cachedRefetchRef.current = newRefetch;

      return {
        data: newData,
        isLoading: newIsLoading,
        isFetching: newIsFetching,
        errors: newErrors,
        hasError: newErrors.length > 0,
        refetch: newRefetch,
      };
    }, []), // combine 函数不依赖任何外部变量，使用空依赖数组稳定化
  });

  return result;
}
