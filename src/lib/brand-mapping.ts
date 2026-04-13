// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * 品牌注册表 + 模型名 → 品牌映射
 * 用于服务映射面板的品牌分类选择
 */

export interface BrandInfo {
  displayName: string;
  color: string; // fallback color for brand pill
}

/**
 * 品牌注册表
 * key: brandId, value: 显示名 + 主色
 */
export const BRAND_REGISTRY: Record<string, BrandInfo> = {
  // 国际大厂
  openai:       { displayName: 'OpenAI',              color: '#10A37F' },
  anthropic:    { displayName: 'Anthropic Claude',    color: '#D97757' },
  google:       { displayName: 'Google AI (Gemini)',   color: '#4285F4' },
  deepseek:     { displayName: 'DeepSeek',             color: '#4D6BFE' },
  
  // 国产大模型
  doubao:       { displayName: '火山引擎豆包',          color: '#A569FF' },
  qwen:         { displayName: '阿里云百炼 (Qwen)',     color: '#FF6A00' },
  zhipu:        { displayName: '智谱 AI (GLM)',        color: '#3485FF' },
  siliconflow:  { displayName: '硅基流动',              color: '#7C3AED' },
  tencent:      { displayName: '腾讯混元',               color: '#0055E9' },
  baidu:        { displayName: '百度文心一言',           color: '#0A51C3' },
  iflytek:      { displayName: '讯飞星火',               color: '#3DC8F9' },
  moonshot:     { displayName: 'Moonshot (Kimi)',      color: '#5B5BD6' },
  
  // 视频生成
  kling:        { displayName: '可灵 Kling',            color: '#04A6F0' },
  minimax:      { displayName: '海螺 AI',               color: '#E2167E' },
  luma:         { displayName: 'Luma AI',               color: '#4400AA' },
  runway:       { displayName: 'Runway',               color: '#333333' },
  vidu:         { displayName: 'Vidu',                 color: '#333333' },
  grok:         { displayName: 'Grok (xAI)',           color: '#000000' },
  fal:          { displayName: 'Fal.ai',               color: '#333333' },
  
  // 图像生成
  midjourney:   { displayName: 'Midjourney',           color: '#000000' },
  flux:         { displayName: 'Flux',                 color: '#333333' },
  ideogram:     { displayName: 'Ideogram',             color: '#333333' },
  replicate:    { displayName: 'Replicate',            color: '#333333' },
  
  // 音频/音乐
  suno:         { displayName: 'Suno',                 color: '#333333' },
  
  // 其他
  alibaba:      { displayName: '阿里云百炼',            color: '#FF6A00' },
  hunyuan:      { displayName: '腾讯混元',               color: '#0055E9' },
  wenxin:       { displayName: '文心一言',               color: '#0A51C3' },
  spark:        { displayName: '讯飞星火',               color: '#3DC8F9' },
  siliconcloud: { displayName: '硅基流动',              color: '#7C3AED' },
  ollama:       { displayName: 'Ollama',               color: '#333333' },
  mistral:      { displayName: 'Mistral',              color: '#FA500F' },
  other:        { displayName: '其他',                  color: '#6B7280' },
};

/**
 * 模型名前缀 → 品牌映射规则
 * 顺序重要：更具体的模式应放在前面
 */
const BRAND_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  // OpenAI 系列
  { pattern: /^(gpt-|o[1-9]|dall-e|dalle|chatgpt|sora|codex)/i,       brand: 'openai' },
  { pattern: /^gpt[-_]?image/i,                                         brand: 'openai' },
  { pattern: /^(text-(embedding|babbage|curie|davinci|search)|davinci-|tts-|whisper)/i, brand: 'openai' },

  // Anthropic / Claude
  { pattern: /^claude/i,                                                 brand: 'anthropic' },

  // Google / Gemini / Imagen
  { pattern: /^(gemini|gemma|veo|palm|bard)/i,                          brand: 'google' },
  { pattern: /^google\//i,                                               brand: 'google' },

  // DeepSeek
  { pattern: /^deepseek/i,                                               brand: 'deepseek' },

  // 智谱 ChatGLM
  { pattern: /^(glm|cogview|cogvideo|chatglm)/i,                        brand: 'zhipu' },

  // 豆包 Doubao (ByteDance)
  { pattern: /^(doubao|seed[- ]?oss)/i,                                  brand: 'doubao' },
  // seedance (豆包视频) — must be before generic seed
  { pattern: /^(doubao-)?seed(ance|dream)/i,                             brand: 'doubao' },

  // 阿里云百炼 / Qwen / 通义
  { pattern: /^(qwen|wan|tongyi|bailian|qvq|qwq)/i,                     brand: 'qwen' },
  { pattern: /^dashscope\//i,                                            brand: 'qwen' },

  // 硅基流动
  { pattern: /^silicon/i,                                                brand: 'siliconflow' },

  // 腾讯混元
  { pattern: /^hunyuan/i,                                                 brand: 'tencent' },
  { pattern: /^(tencent|weixin)/i,                                       brand: 'tencent' },

  // 百度文心 ERNIE
  { pattern: /^(ernie|wenxin|yi-[0-9])/i,                               brand: 'baidu' },

  // 讯飞星火
  { pattern: /^(spark|xunfei)/i,                                         brand: 'iflytek' },

  // Kling (可灵)
  { pattern: /^kling/i,                                                   brand: 'kling' },

  // Midjourney
  { pattern: /^(mj_|midjourney|niji)/i,                                     brand: 'midjourney' },

  // Flux (Black Forest Labs)
  { pattern: /^(flux[-_.]|black-forest)/i,                                 brand: 'flux' },

  // Grok (xAI)
  { pattern: /^grok/i,                                                    brand: 'grok' },

  // Moonshot / Kimi
  { pattern: /^(moonshot|kimi)/i,                                         brand: 'moonshot' },

  // MiniMax / 海螺
  { pattern: /^(minimax|MiniMax|hailuo|speech-|audio[0-9]|mimo)/i,       brand: 'minimax' },

  // Ollama / Llama / Meta
  { pattern: /^(ollama|llama|meta-llama)/i,                                brand: 'ollama' },

  // Mistral
  { pattern: /^(mistral|mixtral|dolphin)/i,                               brand: 'mistral' },

  // Vidu (生数科技)
  { pattern: /^vidu/i,                                                     brand: 'vidu' },

  // Replicate
  { pattern: /^(replicate|andreasjansson|stability-ai|cjwbw|lucataco|recraft-ai|riffusion|sujaykhandekar|prunaai)/i, brand: 'replicate' },

  // Luma AI
  { pattern: /^luma[-_]/i,                                                brand: 'luma' },

  // Runway
  { pattern: /^runway/i,                                                   brand: 'runway' },

  // Ideogram
  { pattern: /^ideogram/i,                                                 brand: 'ideogram' },

  // Suno
  { pattern: /^suno/i,                                                     brand: 'suno' },

  // Fal.ai
  { pattern: /^fal/i,                                                      brand: 'fal' },
  { pattern: /^(ernie|wenxin|Embedding-V)/i,                              brand: 'wenxin' },

  // 硅基流动 SiliconCloud
  { pattern: /^(silicon|BAAI|Pro\/BAAI)/i,                                 brand: 'siliconcloud' },

  // 讯飞星火
  { pattern: /^(spark|sparkdesk)/i,                                        brand: 'spark' },

  // Fal-ai
  { pattern: /^fal[-_]ai\//i,                                              brand: 'fal' },

  // Luma
  { pattern: /^luma/i,                                                      brand: 'luma' },

  // Runway
  { pattern: /^(runway|runwayml)/i,                                         brand: 'runway' },

  // Ideogram
  { pattern: /^ideogram/i,                                                   brand: 'ideogram' },

  // Suno
  { pattern: /^suno/i,                                                       brand: 'suno' },

  // Pika
  { pattern: /^pika/i,                                                       brand: 'other' },

  // aigc-* (MemeFast 聚合)
  { pattern: /^aigc[-_]?(image|video)/i,                                     brand: 'other' },
];

/**
 * 根据模型名称提取品牌 ID
 */
export function extractBrandFromModel(modelName: string): string {
  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(modelName)) return brand;
  }
  return 'other';
}

/**
 * 获取品牌信息（含 fallback）
 */
export function getBrandInfo(brandId: string): BrandInfo {
  return BRAND_REGISTRY[brandId] || BRAND_REGISTRY['other'];
}
