'use client';

import { useQuery, queryOptions } from '@tanstack/react-query';
import type { Reminder } from '@/lib/db.client';

export const remindersQueryOptions = queryOptions({
  queryKey: ['reminders'] as const,
  queryFn: async (): Promise<Record<string, Reminder>> => {
    const response = await fetch('/api/reminders');
    if (!response.ok)
      throw new Error(`Failed to fetch reminders: ${response.status}`);
    const data = await response.json();
    return data as Record<string, Reminder>;
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
});

export function useRemindersQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...remindersQueryOptions,
    enabled: options?.enabled ?? true, // ✅ 默认 true
  });
}

export function useRemindersArrayQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['reminders', 'array'] as const,
    queryFn: async () => {
      const response = await fetch('/api/reminders');
      if (!response.ok)
        throw new Error(`Failed to fetch reminders: ${response.status}`);
      const data = (await response.json()) as Record<string, Reminder>;
      const remindersArray = Object.entries(data).map(([key, reminder]) => ({
        ...reminder,
        key,
      }));
      return remindersArray.sort((a, b) => {
        const dateA = new Date(a.releaseDate).getTime();
        const dateB = new Date(b.releaseDate).getTime();
        return dateA - dateB;
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    enabled: options?.enabled ?? true, // ✅ 默认 true
  });
}

export function useIsRemindedQuery(
  source: string,
  id: string,
  options?: { enabled?: boolean },
) {
  const enabledFlag =
    options?.enabled === undefined ? true : Boolean(options.enabled);

  // 添加详细日志，便于追踪
  // console.log(
  //   '[DEBUG] useIsRemindedQuery - source:',
  //   source,
  //   'id:',
  //   id,
  //   'options.enabled:',
  //   options?.enabled,
  //   '-> enabledFlag:',
  //   enabledFlag,
  // );
  return useQuery({
    queryKey: ['reminders', 'check', source, id] as const,
    queryFn: async () => {
      const response = await fetch('/api/reminders');
      if (!response.ok)
        throw new Error(`Failed to fetch reminders: ${response.status}`);
      const data = (await response.json()) as Record<string, Reminder>;
      const key = `${source}+${id}`;
      return !!data[key];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    enabled: enabledFlag, // ✅ 默认 true
  });
}
