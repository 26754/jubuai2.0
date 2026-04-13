// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * ModelList - 模型列表组件
 * 显示可多选的模型列表
 */

import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { extractBrandFromModel } from '@/lib/brand-mapping';
import { getModelDisplayName } from '@/lib/freedom/model-display-names';

export interface ModelOption {
  providerId: string;
  platform: string;
  name: string;
  model: string;
}

export interface ModelListProps {
  options: ModelOption[];
  selectedKeys: string[];
  isProviderConfigured: (providerId: string) => boolean;
  onToggle: (optionKey: string) => void;
  className?: string;
}

/**
 * 获取模型选项的唯一键
 */
export function getModelOptionKey(option: ModelOption): string {
  return `${option.providerId}:${option.model}`;
}

/**
 * 模型列表组件
 * 显示可多选的模型列表，支持品牌图标显示
 */
export function ModelList({
  options,
  selectedKeys,
  isProviderConfigured,
  onToggle,
  className,
}: ModelListProps) {
  return (
    <div className={cn('space-y-1 max-h-[280px] overflow-y-auto', className)}>
      {options.map((option) => {
        const optionKey = getModelOptionKey(option);
        const optionConfigured = isProviderConfigured(option.providerId);
        const legacyKey = `${option.platform}:${option.model}`;
        const isSelected =
          selectedKeys.includes(optionKey) || selectedKeys.includes(legacyKey);
        const brandId = extractBrandFromModel(option.model);

        return (
          <label
            key={optionKey}
            className={cn(
              'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
              isSelected
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-accent/50 border border-transparent',
              !optionConfigured && 'opacity-50'
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(optionKey)}
              disabled={!optionConfigured}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">
                  {getModelDisplayName(option.model)}
                </span>
                {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                {!optionConfigured && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    (未配置)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {option.name} · {brandId}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

/**
 * 带搜索和品牌过滤的模型列表
 */
export interface FilterableModelListProps extends ModelListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedBrand: string | null;
  onBrandFilterChange: (brandId: string | null) => void;
  brands: Array<{ brandId: string; options: ModelOption[] }>;
}

export function FilterableModelList({
  options,
  selectedKeys,
  isProviderConfigured,
  onToggle,
  searchQuery,
  onSearchChange,
  selectedBrand,
  onBrandFilterChange,
  brands,
  className,
}: FilterableModelListProps) {
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return options.filter((option) => {
      // 搜索过滤
      if (
        query &&
        !option.model.toLowerCase().includes(query) &&
        !getModelDisplayName(option.model).toLowerCase().includes(query)
      ) {
        return false;
      }
      // 品牌过滤
      if (selectedBrand && extractBrandFromModel(option.model) !== selectedBrand) {
        return false;
      }
      return true;
    });
  }, [options, searchQuery, selectedBrand]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* 搜索框 */}
      <div className="relative">
        <input
          type="text"
          placeholder="搜索模型名称..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* 品牌筛选按钮组 */}
      <div className="flex flex-wrap gap-1.5">
        {/* 全部品牌 */}
        <button
          type="button"
          onClick={() => onBrandFilterChange(null)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            selectedBrand === null
              ? 'bg-primary/10 border-primary/40 text-primary'
              : 'bg-muted/30 border-border hover:bg-accent/50 text-muted-foreground'
          )}
        >
          全部品牌
          <span
            className={cn(
              'text-[10px] px-1 py-0.5 rounded-full min-w-[18px] text-center',
              selectedBrand === null ? 'bg-primary/20' : 'bg-muted'
            )}
          >
            {options.length}
          </span>
        </button>

        {/* 各品牌按钮 */}
        {brands.map(({ brandId, options: brandOpts }) => (
          <button
            key={brandId}
            type="button"
            onClick={() =>
              onBrandFilterChange(selectedBrand === brandId ? null : brandId)
            }
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              selectedBrand === brandId
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-muted/30 border-border hover:bg-accent/50 text-muted-foreground'
            )}
          >
            <span className="shrink-0">
              {/* 品牌图标将在实际使用时从 brand-icons 导入 */}
            </span>
            <span>{brandId}</span>
            <span
              className={cn(
                'text-[10px] px-1 py-0.5 rounded-full min-w-[18px] text-center',
                selectedBrand === brandId ? 'bg-primary/20' : 'bg-muted'
              )}
            >
              {brandOpts.length}
            </span>
          </button>
        ))}
      </div>

      {/* 模型列表 */}
      {filteredOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">无匹配模型</p>
      ) : (
        <ModelList
          options={filteredOptions}
          selectedKeys={selectedKeys}
          isProviderConfigured={isProviderConfigured}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}

export default ModelList;
