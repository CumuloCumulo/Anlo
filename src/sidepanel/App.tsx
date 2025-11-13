import React, { useState, useEffect } from 'react';
import { Container, Box } from '@mui/material';
import type { InputInfo, SavedConfig, ExtractResult } from '@/types';
import { Messenger } from '@/utils/messaging';
import { ScanSection } from './components/ScanSection';
import { SelectSection } from './components/SelectSection';
import { ConfigSection } from './components/ConfigSection';
import { UtilSection } from './components/UtilSection';

export const SidePanelApp: React.FC = () => {
  const [scannedInputs, setScannedInputs] = useState<InputInfo[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  // 扫描输入框
  const handleScan = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await Messenger.sendToContent('SCAN_ALL');
      setScannedInputs(result || []);
      setSelectedIndexes(new Set());
      setMessage({
        type: 'success',
        text: `🔍 扫描到 ${result?.length || 0} 个输入框`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ 扫描失败: ${(error as Error).message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 切换输入框选择
  const toggleSelect = (index: number) => {
    const newSet = new Set(selectedIndexes);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndexes(newSet);

    // 高亮
    Messenger.sendToContent('HIGHLIGHT_BY_INDEX', { index }).catch(console.error);
  };

  // 保存配置
  const handleSaveConfig = async () => {
    if (selectedIndexes.size === 0) {
      setMessage({
        type: 'error',
        text: '❌ 请先选择输入框',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const indexes = Array.from(selectedIndexes);
      const result = await Messenger.sendToContent('SAVE_BY_INDEXES', { indexes });

      setSavedConfigs(result || []);
      setMessage({
        type: 'success',
        text: `✅ 已保存 ${result?.length || 0} 个配置`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ 保存失败: ${(error as Error).message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 提取输入框
  const handleExtract = async () => {
    if (savedConfigs.length === 0) {
      setMessage({
        type: 'error',
        text: '❌ 没有保存的配置',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await Messenger.sendToContent('EXTRACT_BY_CONFIG', {
        config: savedConfigs,
      });

      setMessage({
        type: 'success',
        text: `✅ 成功提取 ${result?.length || 0}/${savedConfigs.length} 个输入框`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ 提取失败: ${(error as Error).message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 导出配置
  const handleExportConfig = async () => {
    if (savedConfigs.length === 0) {
      setMessage({
        type: 'error',
        text: '❌ 没有配置可导出',
      });
      return;
    }

    try {
      const json = JSON.stringify(savedConfigs, null, 2);
      await navigator.clipboard.writeText(json);
      setMessage({
        type: 'success',
        text: '📤 配置已复制到剪贴板',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ 复制失败: ${(error as Error).message}`,
      });
    }
  };

  // 清除高亮
  const handleClearHighlight = async () => {
    try {
      await Messenger.sendToContent('CLEAR_HIGHLIGHT');
      setMessage({
        type: 'success',
        text: '✅ 已清除高亮',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ 清除失败: ${(error as Error).message}`,
      });
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 1.5 }}>
      <Container maxWidth="sm" disableGutters sx={{ px: 1.5 }}>
        <ScanSection
          loading={loading}
          onScan={handleScan}
          message={message}
          scannedCount={scannedInputs.length}
        />

        {scannedInputs.length > 0 && (
          <SelectSection
            inputs={scannedInputs}
            selectedIndexes={selectedIndexes}
            onToggle={toggleSelect}
            onSave={handleSaveConfig}
            loading={loading}
          />
        )}

        {savedConfigs.length > 0 && (
          <ConfigSection
            configs={savedConfigs}
            onExtract={handleExtract}
            onExport={handleExportConfig}
            onClearHighlight={handleClearHighlight}
            loading={loading}
          />
        )}

        <UtilSection
          configs={savedConfigs}
          onClearHighlight={handleClearHighlight}
        />
      </Container>
    </Box>
  );
};

