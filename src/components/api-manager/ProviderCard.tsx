// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * ProviderCard - 品牌卡片组件
 * 显示品牌徽标、名称和模型数量
 */

import { cn } from '@/lib/utils';
import { getBrandIcon } from './brand-icons';
import { getBrandInfo } from '@/lib/brand-mapping';

export interface ProviderCardProps {
  brandId: string;
  modelCount: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * 品牌卡片组件
 * 用于品牌筛选，显示品牌图标、名称和模型数量
 */
export function ProviderCard({
  brandId,
  modelCount,
  isActive = false,
  onClick,
  className,
}: ProviderCardProps) {
  const info = getBrandInfo(brandId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
        isActive
          ? 'bg-primary/10 border-primary/40 text-primary'
          : 'bg-muted/30 border-border hover:bg-accent/50 text-muted-foreground',
        className
      )}
    >
      <span className="shrink-0">{getBrandIcon(brandId, 14)}</span>
      <span>{info.displayName}</span>
      <span
        className={cn(
          'text-[10px] px-1 py-0.5 rounded-full min-w-[18px] text-center',
          isActive ? 'bg-primary/20' : 'bg-muted'
        )}
      >
        {modelCount}
      </span>
    </button>
  );
}

/**
 * "全部品牌" 特殊卡片
 */
export interface AllBrandsCardProps {
  totalCount: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AllBrandsCard({
  totalCount,
  isActive = false,
  onClick,
  className,
}: AllBrandsCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
        isActive
          ? 'bg-primary/10 border-primary/40 text-primary'
          : 'bg-muted/30 border-border hover:bg-accent/50 text-muted-foreground',
        className
      )}
    >
      <span>全部品牌</span>
      <span
        className={cn(
          'text-[10px] px-1 py-0.5 rounded-full min-w-[18px] text-center',
          isActive ? 'bg-primary/20' : 'bg-muted'
        )}
      >
        {totalCount}
      </span>
    </button>
  );
}

/**
 * 品牌卡片组组件
 * 管理一组品牌卡片的布局
 */
export interface BrandGroup {
  brandId: string;
  options: unknown[];
}

export interface BrandCardGroupProps {
  brands: BrandGroup[];
  selectedBrand: string | null;
  onSelectBrand: (brandId: string | null) => void;
  className?: string;
}

export function BrandCardGroup({
  brands,
  selectedBrand,
  onSelectBrand,
  className,
}: BrandCardGroupProps) {
  const totalCount = brands.reduce((sum, b) => sum + b.options.length, 0);

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {/* 全部品牌 */}
      <AllBrandsCard
        totalCount={totalCount}
        isActive={selectedBrand === null}
        onClick={() => onSelectBrand(null)}
      />

      {/* 品牌卡片 */}
      {brands.map(({ brandId, options }) => (
        <ProviderCard
          key={brandId}
          brandId={brandId}
          modelCount={options.length}
          isActive={selectedBrand === brandId}
          onClick={() => onSelectBrand(selectedBrand === brandId ? null : brandId)}
        />
      ))}
    </div>
  );
}

export default ProviderCard;
