/**
 * Script Upload & Extract Component
 * 文件上传和智能提取组件
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Users, MapPin, Check, AlertCircle } from "lucide-react";
import { parseDocument, validateFile } from "@/lib/document-parser";
import { extractCharacters, extractScenes, type ExtractedCharacter, type ExtractedScene } from "@/lib/script-extractor";
import { toast } from "sonner";

interface ScriptUploadExtractProps {
  onScriptParsed: (content: string) => void;
  onCharactersExtracted?: (characters: ExtractedCharacter[]) => void;
  onScenesExtracted?: (scenes: ExtractedScene[]) => void;
  disabled?: boolean;
}

export function ScriptUploadExtract({
  onScriptParsed,
  onCharactersExtracted,
  onScenesExtracted,
  disabled = false,
}: ScriptUploadExtractProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingCharacters, setIsExtractingCharacters] = useState(false);
  const [isExtractingScenes, setIsExtractingScenes] = useState(false);
  const [extractedCharacters, setExtractedCharacters] = useState<ExtractedCharacter[] | null>(null);
  const [extractedScenes, setExtractedScenes] = useState<ExtractedScene[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentScript, setCurrentScript] = useState<string>("");

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      // 验证文件
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || "文件验证失败");
        toast.error(validation.error || "文件验证失败");
        setIsUploading(false);
        return;
      }

      // 解析文档
      const result = await parseDocument(file);
      
      if (!result.success) {
        setUploadError(result.error || "文档解析失败");
        toast.error(result.error || "文档解析失败");
        setIsUploading(false);
        return;
      }

      // 检查内容是否为空
      if (!result.content.trim()) {
        setUploadError("文档内容为空");
        toast.error("文档内容为空");
        setIsUploading(false);
        return;
      }

      setCurrentScript(result.content);
      onScriptParsed(result.content);
      toast.success(`成功解析 ${file.name}`);
      
      // 清空已提取的数据
      setExtractedCharacters(null);
      setExtractedScenes(null);
      
    } catch (error) {
      console.error('[ScriptUploadExtract] 文件上传失败:', error);
      const errorMsg = error instanceof Error ? error.message : "文件上传失败";
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
      // 清空文件输入，允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 提取角色
  const handleExtractCharacters = async () => {
    if (!currentScript.trim()) {
      toast.error("请先上传剧本");
      return;
    }

    setIsExtractingCharacters(true);
    setExtractedCharacters(null);

    try {
      const result = await extractCharacters(currentScript);
      
      if (!result.success) {
        toast.error(result.error || "角色提取失败");
        return;
      }

      setExtractedCharacters(result.data?.characters || []);
      onCharactersExtracted?.(result.data?.characters || []);
      toast.success(`成功提取 ${result.data?.characters?.length || 0} 个角色`);
      
    } catch (error) {
      console.error('[ScriptUploadExtract] 角色提取失败:', error);
      toast.error(error instanceof Error ? error.message : "角色提取失败");
    } finally {
      setIsExtractingCharacters(false);
    }
  };

  // 提取场景
  const handleExtractScenes = async () => {
    if (!currentScript.trim()) {
      toast.error("请先上传剧本");
      return;
    }

    setIsExtractingScenes(true);
    setExtractedScenes(null);

    try {
      const result = await extractScenes(currentScript);
      
      if (!result.success) {
        toast.error(result.error || "场景提取失败");
        return;
      }

      setExtractedScenes(result.data?.scenes || []);
      onScenesExtracted?.(result.data?.scenes || []);
      toast.success(`成功提取 ${result.data?.scenes?.length || 0} 个场景`);
      
    } catch (error) {
      console.error('[ScriptUploadExtract] 场景提取失败:', error);
      toast.error(error instanceof Error ? error.message : "场景提取失败");
    } finally {
      setIsExtractingScenes(false);
    }
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">上传剧本文件</Label>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx,.doc,.pdf"
        onChange={handleFileUpload}
        disabled={disabled || isUploading}
        className="hidden"
      />
      
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            解析中...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            上传剧本（txt/docx/pdf）
          </>
        )}
      </Button>

      {uploadError && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {uploadError}
        </div>
      )}

      {/* 提取按钮 */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs text-muted-foreground">智能提取</Label>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExtractCharacters}
            disabled={disabled || isExtractingCharacters || !currentScript.trim()}
          >
            {isExtractingCharacters ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                提取中...
              </>
            ) : extractedCharacters ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-500" />
                {extractedCharacters.length} 角色
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-1" />
                提取角色
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExtractScenes}
            disabled={disabled || isExtractingScenes || !currentScript.trim()}
          >
            {isExtractingScenes ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                提取中...
              </>
            ) : extractedScenes ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-500" />
                {extractedScenes.length} 场景
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-1" />
                提取场景
              </>
            )}
          </Button>
        </div>

        {currentScript.trim() && (
          <p className="text-[10px] text-muted-foreground">
            已加载 {currentScript.length} 字符的剧本内容
          </p>
        )}
      </div>
    </div>
  );
}
