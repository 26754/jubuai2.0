// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

import { describe, it, expect } from 'vitest';
import {
  PROXY_RULES,
  getViteProxyConfig,
  proxyUrl,
  needsProxy,
  getProxyTarget,
  getSupportedProxyPlatforms,
  type ProxyRule,
} from '@/lib/proxy-config';

describe('proxy-config', () => {
  describe('ProxyRule interface', () => {
    it('should have valid rule structure', () => {
      const rule: ProxyRule = {
        pattern: 'test.example.com',
        proxyPath: '/__proxy/test',
        targetBase: 'https://test.example.com',
      };
      
      expect(rule).toHaveProperty('pattern');
      expect(rule).toHaveProperty('proxyPath');
      expect(rule).toHaveProperty('targetBase');
      expect(typeof rule.pattern).toBe('string');
      expect(typeof rule.proxyPath).toBe('string');
      expect(typeof rule.targetBase).toBe('string');
    });
  });

  describe('getViteProxyConfig', () => {
    it('should return valid proxy configuration', () => {
      const config = getViteProxyConfig();
      
      expect(config).toHaveProperty('/__proxy/volcengine');
      expect(config).toHaveProperty('/__proxy/memefast');
      expect(config['/__proxy/volcengine']).toHaveProperty('target');
      expect(config['/__proxy/volcengine']).toHaveProperty('changeOrigin');
    });
  });

  describe('proxyUrl', () => {
    it('should proxy memefast URLs', () => {
      const url = 'https://memefast.top/api/v1/models';
      const proxied = proxyUrl(url);
      
      expect(proxied).toContain('/__proxy/memefast');
      expect(proxied).toContain('/api/v1/models');
    });

    it('should proxy volcengine URLs', () => {
      const url = 'https://ark.cn-beijing.volces.com/api/v1/chat/completions';
      const proxied = proxyUrl(url);
      
      expect(proxied).toContain('/__proxy/volcengine');
    });

    it('should return original URL if no proxy needed', () => {
      const url = 'https://api.openai.com/v1/models';
      const proxied = proxyUrl(url);
      
      expect(proxied).toBe(url);
    });
  });

  describe('needsProxy', () => {
    it('should return true for memefast', () => {
      expect(needsProxy('https://memefast.top/api')).toBe(true);
    });

    it('should return true for volcengine', () => {
      expect(needsProxy('https://ark.cn-beijing.volces.com/api')).toBe(true);
    });

    it('should return false for openai', () => {
      expect(needsProxy('https://api.openai.com/v1')).toBe(false);
    });
  });

  describe('getProxyTarget', () => {
    it('should return target base URL for memefast', () => {
      const target = getProxyTarget('https://memefast.top/api/v1/models');
      
      expect(target).toBe('https://memefast.top');
    });

    it('should return null for non-proxied URL', () => {
      const target = getProxyTarget('https://api.openai.com/v1');
      
      expect(target).toBeNull();
    });
  });

  describe('getSupportedProxyPlatforms', () => {
    it('should return list of supported platforms', () => {
      const platforms = getSupportedProxyPlatforms();
      
      expect(platforms.length).toBeGreaterThan(0);
      expect(platforms).toContain('https://memefast.top');
    });
  });
});
