/**
 * Document Parser Service
 * 支持解析 docx, pdf, txt 格式的剧本文件
 */

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParseResult {
  success: boolean;
  content: string;
  error?: string;
}

/**
 * 从 File 对象解析文档内容
 */
export async function parseDocument(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    switch (extension) {
      case 'txt':
      case 'text':
        return await parseTxt(file);
      case 'docx':
      case 'doc':
        return await parseDocx(file);
      case 'pdf':
        return await parsePdf(file);
      default:
        return {
          success: false,
          content: '',
          error: `不支持的文件格式: .${extension}。支持的格式：txt, docx, pdf`
        };
    }
  } catch (error) {
    console.error('[DocumentParser] 解析失败:', error);
    return {
      success: false,
      content: '',
      error: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 解析 TXT 文件
 */
async function parseTxt(file: File): Promise<ParseResult> {
  try {
    const content = await file.text();
    return {
      success: true,
      content: content.trim()
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      error: `TXT 解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 解析 DOCX 文件
 */
async function parseDocx(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return {
      success: true,
      content: result.value.trim()
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      error: `DOCX 解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 解析 PDF 文件
 */
async function parsePdf(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }
    
    return {
      success: true,
      content: textParts.join('\n\n').trim()
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      error: `PDF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 验证文件类型
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['txt', 'text', 'docx', 'doc', 'pdf'];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `不支持的文件格式: .${extension || 'unknown'}。支持的格式：txt, docx, pdf`
    };
  }
  
  // 文件大小限制 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件过大，请上传小于 10MB 的文件`
    };
  }
  
  return { valid: true };
}
