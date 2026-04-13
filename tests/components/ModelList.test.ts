// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

import { describe, it, expect } from 'vitest';
import { getModelOptionKey, type ModelOption } from '@/components/api-manager/ModelList';

describe('ModelList', () => {
  describe('getModelOptionKey', () => {
    it('should create key from provider and model', () => {
      const option: ModelOption = {
        providerId: 'provider-1',
        platform: 'memefast',
        name: 'MemeFast',
        model: 'gpt-4',
      };

      const key = getModelOptionKey(option);

      expect(key).toBe('provider-1:gpt-4');
    });

    it('should handle complex model names', () => {
      const option: ModelOption = {
        providerId: 'provider-2',
        platform: 'daemo',
        name: 'Daemo',
        model: 'doubao-seedance-2-0-pro-t2v-260610',
      };

      const key = getModelOptionKey(option);

      expect(key).toBe('provider-2:doubao-seedance-2-0-pro-t2v-260610');
    });

    it('should handle empty provider ID', () => {
      const option: ModelOption = {
        providerId: '',
        platform: 'memefast',
        name: 'MemeFast',
        model: 'gpt-3.5',
      };

      const key = getModelOptionKey(option);

      expect(key).toBe(':gpt-3.5');
    });
  });

  describe('ModelOption type', () => {
    it('should accept valid option object', () => {
      const option: ModelOption = {
        providerId: 'test-provider',
        platform: 'memefast',
        name: 'Test Provider',
        model: 'test-model',
      };

      expect(option.providerId).toBe('test-provider');
      expect(option.platform).toBe('memefast');
      expect(option.name).toBe('Test Provider');
      expect(option.model).toBe('test-model');
    });
  });
});
