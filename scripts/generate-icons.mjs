#!/usr/bin/env node
/**
 * 生成 PWA 图标
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 SVG 图标
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">J</text>
</svg>`;

async function generateIcons() {
  try {
    // 确保 icons 目录存在
    const iconsDir = path.join(__dirname, '..', 'public', 'icons');
    console.log('Icons directory:', iconsDir);
    
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
      console.log('Created icons directory');
    }

    const svgBuffer = Buffer.from(svgIcon);
    console.log('SVG buffer created, size:', svgBuffer.length);

    // 生成 192x192 图标
    const icon192Path = path.join(iconsDir, 'icon-192.png');
    await sharp(svgBuffer)
      .resize(192, 192)
      .png({ compressionLevel: 9 })
      .toFile(icon192Path);
    
    const stats192 = fs.statSync(icon192Path);
    console.log('✅ icon-192.png 已生成, 大小:', stats192.size, 'bytes');

    // 生成 512x512 图标
    const icon512Path = path.join(iconsDir, 'icon-512.png');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png({ compressionLevel: 9 })
      .toFile(icon512Path);
    
    const stats512 = fs.statSync(icon512Path);
    console.log('✅ icon-512.png 已生成, 大小:', stats512.size, 'bytes');

    console.log('\n所有图标生成完成！');
  } catch (error) {
    console.error('生成图标时出错:', error);
    process.exit(1);
  }
}

generateIcons();
