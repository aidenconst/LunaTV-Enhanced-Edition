/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
// 统一按钮样式系统
const buttonStyles = {
  // 主要操作按钮（蓝色）- 用于配置、设置、确认等
  primary:
    'px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors',
  // 成功操作按钮（绿色）- 用于添加、启用、保存等
  success:
    'px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg transition-colors',
  // 危险操作按钮（红色）- 用于删除、禁用、重置等
  danger:
    'px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors',
  // 次要操作按钮（灰色）- 用于取消、关闭等
  secondary:
    'px-3 py-1.5 text-sm font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-colors',
  // 警告操作按钮（黄色）- 用于批量禁用等
  warning:
    'px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg transition-colors',
  // 小尺寸主要按钮
  primarySmall:
    'px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-colors',
  // 小尺寸成功按钮
  successSmall:
    'px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md transition-colors',
  // 小尺寸危险按钮
  dangerSmall:
    'px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-md transition-colors',
  // 小尺寸次要按钮
  secondarySmall:
    'px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors',
  // 小尺寸警告按钮
  warningSmall:
    'px-2 py-1 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-md transition-colors',
  // 圆角小按钮（用于表格操作）
  roundedPrimary:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-200 transition-colors',
  roundedSuccess:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-200 transition-colors',
  roundedDanger:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-200 transition-colors',
  roundedSecondary:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 dark:text-gray-200 transition-colors',
  roundedWarning:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 dark:text-yellow-200 transition-colors',
  roundedPurple:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-200 transition-colors',
  // 禁用状态
  disabled:
    'px-3 py-1.5 text-sm font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-lg transition-colors',
  disabledSmall:
    'px-2 py-1 text-xs font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-md transition-colors',
  // 开关按钮样式
  toggleOn: 'bg-green-600 dark:bg-green-600',
  toggleOff: 'bg-gray-200 dark:bg-gray-700',
  toggleThumb: 'bg-white',
  toggleThumbOn: 'translate-x-6',
  toggleThumbOff: 'translate-x-1',
  // 快速操作按钮样式
  quickAction:
    'px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors',
};

interface WordListData {
  hot: string[];
  sensitive: string[];
  actor: string[];
}

interface WordListConfigProps {
  refreshConfig?: () => Promise<void>; // 可选，用于刷新全局配置
}

export default function WordListConfig({ refreshConfig }: WordListConfigProps) {
  const [data, setData] = useState<WordListData>({
    hot: [],
    sensitive: [],
    actor: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWords, setNewWords] = useState({
    hot: '',
    sensitive: '',
    actor: '',
  });

  // 加载数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/wordlists');
      if (!res.ok) throw new Error('加载失败');
      const result = await res.json();
      setData({
        hot: result.hot || [],
        sensitive: result.sensitive || [],
        actor: result.actor || [],
      });
    } catch (err) {
      console.error(err);
      alert('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存整个配置
  const saveData = useCallback(
    async (newData: WordListData) => {
      try {
        setSaving(true);
        const res = await fetch('/api/admin/wordlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData),
        });
        if (!res.ok) throw new Error('保存失败');
        // 刷新后可选调用 refreshConfig()
        if (refreshConfig) await refreshConfig();
      } catch (err) {
        console.error(err);
        alert('保存失败');
      } finally {
        setSaving(false);
      }
    },
    [refreshConfig],
  );

  // 添加词
  const handleAdd = (type: keyof WordListData) => {
    const word = newWords[type].trim();
    if (!word) return;
    // 支持逗号或分号分隔的多个词
    const words = word
      .split(/[;,，；]/)
      .map((w) => w.trim())
      .filter((w) => w !== '');
    if (words.length === 0) return;

    const newData = { ...data };
    words.forEach((w) => {
      if (!newData[type].includes(w)) {
        newData[type].push(w);
      }
    });
    setData(newData);
    setNewWords((prev) => ({ ...prev, [type]: '' }));
    saveData(newData);
  };

  // 删除词
  const handleDelete = (type: keyof WordListData, word: string) => {
    const newData = {
      ...data,
      [type]: data[type].filter((w) => w !== word),
    };
    setData(newData);
    saveData(newData);
  };

  // 批量编辑（可选）：允许一次性编辑整个列表，用逗号分隔
  const handleBatchUpdate = (type: keyof WordListData, value: string) => {
    const words = value
      .split(/[;,，；]/)
      .map((w) => w.trim())
      .filter((w) => w !== '');
    const newData = { ...data, [type]: words };
    setData(newData);
    saveData(newData);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className='flex justify-center py-8'>
        <Loader2 className='w-6 h-6 animate-spin text-gray-500' />
      </div>
    );
  }

  const sectionStyle =
    'bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700';
  const inputStyle =
    'flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500';

  return (
    <div className='space-y-6'>
      {saving && (
        <div className='fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50'>
          <Loader2 className='w-4 h-4 animate-spin' />
          保存中...
        </div>
      )}

      {/* 热门标签 */}
      <div className={sectionStyle}>
        <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100'>
          🔥 热门标签
        </h3>
        <div className='flex gap-2 mb-4'>
          <input
            type='text'
            placeholder='输入标签，多个可用逗号/分号分隔'
            value={newWords.hot}
            onChange={(e) =>
              setNewWords((prev) => ({ ...prev, hot: e.target.value }))
            }
            className={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd('hot')}
          />
          <button
            onClick={() => handleAdd('hot')}
            className={buttonStyles.success}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className='flex flex-wrap gap-2'>
          {data.hot.map((word) => (
            <span
              key={word}
              className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
            >
              {word}
              <button
                onClick={() => handleDelete('hot', word)}
                className='hover:text-red-600'
              >
                <Trash2 size={14} />
              </button>
            </span>
          ))}
          {data.hot.length === 0 && (
            <div className='text-gray-500 text-sm'>暂无热门标签</div>
          )}
        </div>
      </div>

      {/* 敏感词 */}
      <div className={sectionStyle}>
        <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100'>
          ⚠️ 敏感词
        </h3>
        <div className='flex gap-2 mb-4'>
          <input
            type='text'
            placeholder='输入敏感词，多个可用逗号/分号分隔'
            value={newWords.sensitive}
            onChange={(e) =>
              setNewWords((prev) => ({ ...prev, sensitive: e.target.value }))
            }
            className={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd('sensitive')}
          />
          <button
            onClick={() => handleAdd('sensitive')}
            className={buttonStyles.danger}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className='flex flex-wrap gap-2'>
          {data.sensitive.map((word) => (
            <span
              key={word}
              className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
            >
              {word}
              <button
                onClick={() => handleDelete('sensitive', word)}
                className='hover:text-red-600'
              >
                <Trash2 size={14} />
              </button>
            </span>
          ))}
          {data.sensitive.length === 0 && (
            <div className='text-gray-500 text-sm'>暂无敏感词</div>
          )}
        </div>
      </div>

      {/* 演员列表 */}
      <div className={sectionStyle}>
        <h3 className='text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100'>
          🎭 演员列表
        </h3>
        <div className='flex gap-2 mb-4'>
          <input
            type='text'
            placeholder='输入演员名，多个可用逗号/分号分隔'
            value={newWords.actor}
            onChange={(e) =>
              setNewWords((prev) => ({ ...prev, actor: e.target.value }))
            }
            className={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd('actor')}
          />
          <button
            onClick={() => handleAdd('actor')}
            className={buttonStyles.primary}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className='flex flex-wrap gap-2'>
          {data.actor.map((word) => (
            <span
              key={word}
              className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
            >
              {word}
              <button
                onClick={() => handleDelete('actor', word)}
                className='hover:text-red-600'
              >
                <Trash2 size={14} />
              </button>
            </span>
          ))}
          {data.actor.length === 0 && (
            <div className='text-gray-500 text-sm'>暂无演员</div>
          )}
        </div>
      </div>
    </div>
  );
}
