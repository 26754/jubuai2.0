// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Virtualized List Component
 * 
 * 虚拟列表组件 - 用于优化长列表的渲染性能
 * 支持不定高度的列表项
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

// ==================== 类型定义 ====================

export interface VirtualItem<T> {
  index: number;
  data: T;
  offset: number;
  size: number;
}

export interface VirtualizerOptions<T> {
  /** 数据源 */
  data: T[];
  /** 估计的列表项高度 */
  estimatedItemSize?: number;
  /** 容器高度 */
  containerHeight: number;
  /** 获取列表项高度 */
  getItemSize?: (item: T, index: number) => number;
  /** 列表项渲染函数 */
  renderItem: (item: VirtualItem<T>, index: number) => React.ReactNode;
  /** 列表项 key 获取函数 */
  getItemKey?: (item: T, index: number) => string | number;
  /** 缓冲区大小（额外渲染的项目数） */
  overscan?: number;
  /** 列表容器类名 */
  containerClassName?: string;
  /** 滚动到索引回调 */
  onScrollToIndex?: (index: number) => void;
}

// ==================== Hook ====================

export function useVirtualizer<T>({
  data,
  estimatedItemSize = 50,
  containerHeight,
  getItemSize,
  renderItem,
  getItemKey,
  overscan = 3,
  onScrollToIndex,
}: VirtualizerOptions<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 计算每个列表项的位置和尺寸
  const [items, setItems] = useState<VirtualItem<T>[]>(() => {
    const result: VirtualItem<T>[] = [];
    let offset = 0;
    
    for (let i = 0; i < data.length; i++) {
      const size = getItemSize ? getItemSize(data[i], i) : estimatedItemSize;
      result.push({
        index: i,
        data: data[i],
        offset,
        size,
      });
      offset += size;
    }
    
    return result;
  });
  
  // 更新列表项位置
  useEffect(() => {
    const result: VirtualItem<T>[] = [];
    let offset = 0;
    
    for (let i = 0; i < data.length; i++) {
      const size = getItemSize ? getItemSize(data[i], i) : estimatedItemSize;
      result.push({
        index: i,
        data: data[i],
        offset,
        size,
      });
      offset += size;
    }
    
    setItems(result);
  }, [data, getItemSize, estimatedItemSize]);
  
  // 总高度
  const totalHeight = items.reduce((sum, item) => sum + item.size, 0);
  
  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startOffset = scrollTop;
    const endOffset = scrollTop + containerHeight;
    
    let startIndex = 0;
    let endIndex = items.length - 1;
    
    // 找到起始索引
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.offset + item.size > startOffset) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }
    
    // 找到结束索引
    for (let i = startIndex; i < items.length; i++) {
      const item = items[i];
      if (item.offset >= endOffset) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }
    
    return { startIndex, endIndex };
  }, [items, scrollTop, containerHeight, overscan]);
  
  // 可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);
  
  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);
  
  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number) => {
    if (!containerRef.current || index < 0 || index >= items.length) return;
    
    const item = items[index];
    if (!item) return;
    
    containerRef.current.scrollTo({
      top: item.offset,
      behavior: 'smooth',
    });
    
    onScrollToIndex?.(index);
  }, [items, onScrollToIndex]);
  
  // 滚动到指定位置
  const scrollTo = useCallback((offset: number) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: offset,
      behavior: 'smooth',
    });
  }, []);
  
  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    scrollTo(0);
  }, [scrollTo]);
  
  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    scrollTo(totalHeight);
  }, [scrollTo, totalHeight]);
  
  return {
    containerRef,
    items: visibleItems,
    totalHeight,
    scrollTop,
    visibleRange,
    scrollToIndex,
    scrollTo,
    scrollToTop,
    scrollToBottom,
    handleScroll,
  };
}

// ==================== 虚拟列表组件 ====================

interface VirtualListProps<T> extends VirtualizerOptions<T> {
  /** 列表容器样式 */
  containerStyle?: React.CSSProperties;
}

export function VirtualList<T>({
  data,
  estimatedItemSize = 50,
  containerHeight,
  getItemSize,
  renderItem,
  getItemKey,
  overscan = 3,
  containerClassName,
  containerStyle,
  onScrollToIndex,
}: VirtualListProps<T>) {
  const {
    containerRef,
    items,
    totalHeight,
    scrollToIndex,
    handleScroll,
  } = useVirtualizer({
    data,
    estimatedItemSize,
    containerHeight,
    getItemSize,
    renderItem,
    getItemKey,
    overscan,
    onScrollToIndex,
  });
  
  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", containerClassName)}
      style={{
        height: containerHeight,
        ...containerStyle,
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.map((item) => (
          <div
            key={getItemKey ? getItemKey(item.data, item.index) : item.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${item.offset}px)`,
              height: item.size,
            }}
          >
            {renderItem(item, item.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 虚拟网格组件 ====================

interface VirtualGridProps<T> {
  /** 数据源 */
  data: T[];
  /** 列数 */
  columns: number;
  /** 估计的行高 */
  estimatedRowHeight?: number;
  /** 容器高度 */
  containerHeight: number;
  /** 列表项渲染函数 */
  renderItem: (item: T, index: number, col: number) => React.ReactNode;
  /** 列表项 key 获取函数 */
  getItemKey?: (item: T, index: number) => string | number;
  /** 列表容器类名 */
  containerClassName?: string;
  /** 列表容器样式 */
  containerStyle?: React.CSSProperties;
  /** 列表项类名 */
  itemClassName?: string;
  /** 列间隔 */
  gap?: number;
}

export function VirtualGrid<T>({
  data,
  columns,
  estimatedRowHeight = 200,
  containerHeight,
  renderItem,
  getItemKey,
  containerClassName,
  containerStyle,
  itemClassName,
  gap = 8,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 计算行数
  const rowCount = Math.ceil(data.length / columns);
  const totalHeight = rowCount * estimatedRowHeight;
  
  // 计算可见范围
  const startRow = Math.max(0, Math.floor(scrollTop / estimatedRowHeight) - 2);
  const endRow = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + containerHeight) / estimatedRowHeight) + 2
  );
  
  // 可见行
  const visibleRows = useMemo(() => {
    const rows: { rowIndex: number; startIndex: number; endIndex: number }[] = [];
    for (let r = startRow; r <= endRow; r++) {
      const startIndex = r * columns;
      const endIndex = Math.min(startIndex + columns - 1, data.length - 1);
      rows.push({ rowIndex: r, startIndex, endIndex });
    }
    return rows;
  }, [startRow, endRow, columns, data.length]);
  
  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", containerClassName)}
      style={{
        height: containerHeight,
        ...containerStyle,
      }}
      onScroll={handleScroll}
    >
      <div 
        style={{ 
          height: totalHeight, 
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
        }}
      >
        {visibleRows.map(({ rowIndex, startIndex, endIndex }) => (
          <div
            key={rowIndex}
            style={{
              position: 'absolute',
              top: rowIndex * estimatedRowHeight,
              left: 0,
              right: 0,
              height: estimatedRowHeight,
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap,
            }}
          >
            {Array.from({ length: endIndex - startIndex + 1 }, (_, i) => {
              const dataIndex = startIndex + i;
              const item = data[dataIndex];
              return (
                <div
                  key={getItemKey ? getItemKey(item, dataIndex) : dataIndex}
                  className={itemClassName}
                >
                  {renderItem(item, dataIndex, i)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 图片懒加载组件 ====================

interface LazyImageProps {
  /** 图片地址 */
  src: string;
  /** 占位图地址 */
  placeholder?: string;
  /** 图片描述 */
  alt?: string;
  /** 类名 */
  className?: string;
  /** 样式 */
  style?: React.CSSProperties;
  /** 加载完成回调 */
  onLoad?: () => void;
  /** 加载失败回调 */
  onError?: () => void;
  /** 是否立即加载 */
  immediate?: boolean;
  /** 根元素引用 */
  root?: HTMLElement | null;
  /** 离视口多远时触发加载 */
  rootMargin?: string;
}

export function LazyImage({
  src,
  placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3ELoading...%3C/text%3E%3C/svg%3E",
  alt = "",
  className,
  style,
  onLoad,
  onError,
  immediate = false,
  root,
  rootMargin = "100px",
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(immediate);
  const [isInView, setIsInView] = useState(immediate);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // 监听元素是否在视口内
  useEffect(() => {
    if (immediate || !src) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { root, rootMargin }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [immediate, src, root, rootMargin]);
  
  // 加载图片
  useEffect(() => {
    if (!isInView || !src) return;
    
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setIsLoaded(true);
      onLoad?.();
    };
    
    img.onerror = () => {
      setError(true);
      onError?.();
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, onLoad, onError]);
  
  return (
    <img
      ref={imgRef}
      src={isLoaded && !error ? src : placeholder}
      alt={alt}
      className={cn(
        "transition-opacity duration-300",
        isLoaded ? "opacity-100" : "opacity-50",
        className
      )}
      style={{
        ...style,
        backgroundColor: !isLoaded ? '#f0f0f0' : undefined,
      }}
    />
  );
}

// ==================== 导出 ====================

export { useVirtualizer, VirtualList, VirtualGrid, LazyImage };
export type { VirtualItem };
