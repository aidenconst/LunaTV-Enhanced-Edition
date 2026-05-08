/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  Cat,
  Clover,
  Film,
  FolderOpen,
  Globe,
  Home,
  MoreHorizontal,
  PlaySquare,
  Radio,
  Search,
  Sparkles,
  Star,
  Tv,
  X,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, queryOptions } from '@tanstack/react-query';

import { FastLink } from './FastLink';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useSite } from './SiteProvider';

interface NavItem {
  icon: any;
  label: string;
  href: string;
  color: string;
  gradient: string;
}

interface ModernNavProps {
  showAIButton?: boolean;
  onAIButtonClick?: () => void;
}

// Query Options 工厂函数
const userEmbyConfigOptions = () =>
  queryOptions({
    queryKey: ['user', 'emby-config'],
    queryFn: async () => {
      const res = await fetch('/api/user/emby-config');
      if (!res.ok) return null;
      const data = await res.json();
      return data.config;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

const publicSourcesOptions = () =>
  queryOptions({
    queryKey: ['emby', 'public-sources'],
    queryFn: async () => {
      const res = await fetch('/api/emby/public-sources');
      if (!res.ok) return { sources: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export default function ModernNav({
  showAIButton = false,
  onAIButtonClick,
}: ModernNavProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(pathname);
  const { siteName } = useSite();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [menuItems, setMenuItems] = useState<NavItem[]>([
    {
      icon: Home,
      label: '首页',
      href: '/',
      color: 'text-green-600 dark:text-green-500',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Search,
      label: '搜索',
      href: '/search',
      color: 'text-blue-600 dark:text-blue-500',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Globe,
      label: '源浏览器',
      href: '/source-browser',
      color: 'text-emerald-600 dark:text-emerald-500',
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
      color: 'text-red-600 dark:text-red-500',
      gradient: 'from-red-500 to-pink-500',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
      color: 'text-blue-700 dark:text-blue-400',
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      icon: PlaySquare,
      label: '短剧',
      href: '/shortdrama',
      color: 'text-purple-600 dark:text-purple-500',
      gradient: 'from-purple-500 to-violet-500',
    },
    {
      icon: Cat,
      label: '动漫',
      href: '/douban?type=anime',
      color: 'text-pink-600 dark:text-pink-500',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
      color: 'text-orange-600 dark:text-orange-500',
      gradient: 'from-orange-500 to-amber-500',
    },
  ]);

  // 检查用户是否配置了 Emby
  const { data: userEmbyConfig } = useQuery(userEmbyConfigOptions());

  // 检查管理员是否设置了公共源
  const { data: publicSourcesData } = useQuery(publicSourcesOptions());

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    const newItems = [...menuItems];

    // 直播 - 根据 ENABLE_WEB_LIVE 动态控制
    const hasLiveInMenu = newItems.some((item) => item.href === '/live');
    if (runtimeConfig?.ENABLE_WEB_LIVE && !hasLiveInMenu) {
      newItems.push({
        icon: Radio,
        label: '直播',
        href: '/live',
        color: 'text-teal-600 dark:text-teal-500',
        gradient: 'from-teal-500 to-cyan-500',
      });
    } else if (!runtimeConfig?.ENABLE_WEB_LIVE && hasLiveInMenu) {
      const index = newItems.findIndex((item) => item.href === '/live');
      if (index > -1) newItems.splice(index, 1);
    }

    if (
      runtimeConfig?.CUSTOM_CATEGORIES?.length > 0 &&
      !newItems.some((item) => item.href === '/douban?type=custom')
    ) {
      newItems.push({
        icon: Star,
        label: '自定义',
        href: '/douban?type=custom',
        color: 'text-yellow-600 dark:text-yellow-500',
        gradient: 'from-yellow-500 to-amber-500',
      });
    }

    // Emby - 用户有私人源 OR 管理员有公共源，都显示导航
    const hasUserEmby = userEmbyConfig?.sources?.some(
      (s: any) => s.enabled && s.ServerURL,
    );
    const hasPublicEmby = (publicSourcesData?.sources?.length ?? 0) > 0;
    const hasEmbyConfig = hasUserEmby || hasPublicEmby;
    const hasEmbyInMenu = newItems.some((item) => item.href === '/emby');

    if (hasEmbyConfig && !hasEmbyInMenu) {
      newItems.push({
        icon: FolderOpen,
        label: 'Emby',
        href: '/emby',
        color: 'text-indigo-600 dark:text-indigo-500',
        gradient: 'from-indigo-500 to-purple-500',
      });
    } else if (!hasEmbyConfig && hasEmbyInMenu) {
      const index = newItems.findIndex((item) => item.href === '/emby');
      if (index > -1) {
        newItems.splice(index, 1);
      }
    }

    if (newItems.length !== menuItems.length) {
      setMenuItems(newItems);
    }
  }, [userEmbyConfig, publicSourcesData]);

  useEffect(() => {
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    setActive(fullPath);
  }, [pathname, searchParams]);

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];
    const decodedActive = decodeURIComponent(active);
    const decodedHref = decodeURIComponent(href);

    return (
      decodedActive === decodedHref ||
      (decodedActive.startsWith('/douban') &&
        typeMatch &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <>
      {/* Desktop Top Navigation - Minimal & Modern */}
      <nav className='hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50'>
        <div className='max-w-[2560px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20'>
          <div className='flex items-center justify-between h-14 sm:h-16 gap-4'>
            {/* Logo */}
            <FastLink href='/' className='shrink-0'>
              <div className='text-xl font-bold text-gray-900 dark:text-white'>
                {siteName}
              </div>
            </FastLink>

            {/* Navigation Items */}
            <div className='flex items-center justify-center gap-0.5 lg:gap-1 overflow-x-auto scrollbar-hide flex-1 px-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <FastLink
                    key={item.label}
                    href={item.href}
                    useTransitionNav
                    onClick={() => setActive(item.href)}
                    className='group relative flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 rounded-lg transition-all duration-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 whitespace-nowrap shrink-0'
                  >
                    <Icon
                      className={`w-4 h-4 transition-all duration-200 ${
                        active
                          ? item.color
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium transition-all duration-200 ${
                        active
                          ? `${item.color}`
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <span className='absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-current rounded-full' />
                    )}
                  </FastLink>
                );
              })}
            </div>

            {/* Right Side Actions */}
            <div className='flex items-center gap-1 shrink-0'>
              {showAIButton && onAIButtonClick && (
                <button
                  onClick={onAIButtonClick}
                  className='p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                  aria-label='AI 推荐'
                >
                  <Sparkles className='h-5 w-5' />
                </button>
              )}
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* More Menu Modal */}
      {showMoreMenu && (
        <div
          className='md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm'
          style={{ zIndex: 2147483647 }}
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className='absolute bottom-20 left-2 right-2 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-gray-800/50'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-white'>
                全部分类
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className='p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              >
                <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
              </button>
            </div>
            <div className='grid grid-cols-4 gap-3 p-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <FastLink
                    key={item.label}
                    href={item.href}
                    useTransitionNav
                    onClick={() => {
                      setActive(item.href);
                      setShowMoreMenu(false);
                    }}
                    className='flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 active:scale-95 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        active
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          active
                            ? item.color
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        active ? item.color : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </FastLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - Clean & Minimal */}
      <nav
        className='md:hidden fixed left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-800/50'
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className='flex items-center justify-around px-2 py-1.5'>
          {menuItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <FastLink
                key={item.label}
                href={item.href}
                useTransitionNav
                onClick={() => setActive(item.href)}
                className='flex flex-col items-center justify-center min-w-[64px] flex-1 py-1.5 rounded-lg transition-colors active:bg-gray-100 dark:active:bg-gray-800/60'
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 ${
                    active ? item.color : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    active ? item.color : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </FastLink>
            );
          })}

          <button
            onClick={() => setShowMoreMenu(true)}
            className='flex flex-col items-center justify-center min-w-[64px] flex-1 py-1.5 rounded-lg transition-colors active:bg-gray-100 dark:active:bg-gray-800/60'
          >
            <MoreHorizontal className='w-5 h-5 mb-0.5 text-gray-500 dark:text-gray-400' />
            <span className='text-[11px] font-medium text-gray-500 dark:text-gray-400'>
              更多
            </span>
          </button>
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className='hidden md:block h-14 sm:h-16' />
      <div className='md:hidden h-16' />
    </>
  );
}
