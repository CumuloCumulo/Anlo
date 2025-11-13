/**
 * Content Script - 主要业务逻辑
 * 在页面上下文中执行，可以访问和操作 DOM
 */

import type { InputInfo, SavedConfig, ExtractResult, ElementType } from '@/types';
import { selectorGenerator } from '@/utils/selectorGenerator';
import { Messenger } from '@/utils/messaging';

class AnloContentScript {
  private scannedInputs: InputInfo[] = [];
  private config: SavedConfig[] = [];

  constructor() {
    this.initializeListeners();
    console.log('🎯 Anlo 内容脚本已加载');
  }

  /**
   * 初始化消息监听
   */
  private initializeListeners(): void {
    Messenger.onMessage(async (message, sender, sendResponse) => {
      const { type, payload } = message;

      try {
        let response;

        switch (type) {
          case 'SCAN_ALL':
            response = this.scanAll();
            break;

          case 'SAVE_BY_INDEXES':
            response = this.saveByIndexes(payload?.indexes || []);
            break;

          case 'EXTRACT_BY_CONFIG':
            response = this.extractByConfig(payload?.config || []);
            break;

          case 'HIGHLIGHT_BY_INDEX':
            response = this.highlightByIndex(payload?.index || 0);
            break;

          case 'CLEAR_HIGHLIGHT':
            response = this.clearHighlight();
            break;

          default:
            response = { error: `Unknown message type: ${type}` };
        }

        sendResponse(response);
      } catch (error) {
        console.error('❌ Content script error:', error);
        sendResponse({ error: (error as Error).message });
      }
    });
  }

  /**
   * 判断元素类型
   */
  private getElementType(element: HTMLElement): ElementType {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input') {
      return 'input';
    }
    
    // 判断是否为 select-display（可选择的显示元素）
    if (element.getAttribute('xtype') === 'select' || 
        (element.hasAttribute('data-name') && element.classList.contains('bh-form-static'))) {
      return 'select-display';
    }
    
    // 其他带 data-name 的显示元素
    if (element.hasAttribute('data-name')) {
      return 'text-display';
    }
    
    return 'text-display';
  }

  /**
   * 扫描所有可提取元素（输入框、显示元素等）
   */
  private scanAll(): InputInfo[] {
    this.clearHighlight();

    // 扫描多种类型的可提取元素
    const elements = document.querySelectorAll(`
      input:not([type="hidden"]):not([type="submit"]):not([type="button"]),
      p[xtype="select"],
      p[data-name],
      span[data-name],
      div.bh-form-static[data-name]
    `.trim());

    this.scannedInputs = [];

    elements.forEach((element, i) => {
      const htmlElement = element as HTMLElement;
      const elementType = this.getElementType(htmlElement);

      // 高亮显示
      htmlElement.style.outline = '2px solid #00bfff';
      htmlElement.style.boxShadow = '0 0 8px #00bfff';
      htmlElement.style.borderRadius = '4px';
      htmlElement.style.transition = 'all 0.3s ease';
      htmlElement.setAttribute('data-anlo-index', String(i));

      // 添加编号标签
      this.addIndexTag(htmlElement, i, '#00bfff');

      // 查找容器和标签
      const parent = htmlElement.parentElement;
      let container = parent?.closest('[data-name]') ||
        parent?.closest('[data-field]') ||
        parent?.closest('[data-caption]') ||
        htmlElement.closest('.bh-form-group') ||
        htmlElement.closest('div[class*="form"]') ||
        htmlElement.closest('div[class*="field"]') ||
        parent;

      const label = container?.querySelector('.bh-form-label, label, [class*="label"]');

      // 根据元素类型提取不同的属性
      let name: string | null = null;
      let id: string | null = null;
      let type: string = '';
      let placeholder: string | null = null;

      if (elementType === 'input') {
        const inputElement = htmlElement as HTMLInputElement;
        name = inputElement.name || null;
        id = inputElement.id || null;
        type = inputElement.type;
        placeholder = inputElement.placeholder || null;
      } else {
        // 对于显示元素，使用 tagName 作为 type
        type = htmlElement.tagName.toLowerCase();
      }

      const info: InputInfo = {
        index: i,
        label: label ? label.textContent?.trim() || null : null,
        name: name,
        id: id,
        type: type,
        elementType: elementType,
        dataName: htmlElement.getAttribute('data-name'),
        xtype: htmlElement.getAttribute('xtype'),
        containerPath: container ? selectorGenerator.generateStableSelector(container) : '',
        placeholder: placeholder,
      };

      this.scannedInputs.push(info);
    });

    console.log(`🔍 扫描到 ${this.scannedInputs.length} 个可提取元素`);
    return this.scannedInputs;
  }

  /**
   * 根据索引保存配置
   */
  private saveByIndexes(indexes: number[]): SavedConfig[] {
    this.config = [];

    indexes.forEach(i => {
      const info = this.scannedInputs.find(inp => inp.index === i);
      if (!info) {
        console.warn(`⚠️ 序号 ${i} 不存在`);
        return;
      }

      // 使用通用选择器查找元素
      const element = document.querySelector(
        `[data-anlo-index="${i}"]`
      ) as HTMLElement;

      if (element) {
        // 高亮保存的
        element.style.outline = '3px solid #4caf50';
        element.style.boxShadow = '0 0 12px #4caf50';

        // 标签变绿
        const tag = element.nextElementSibling;
        if (tag?.classList.contains('anlo-tag')) {
          (tag as HTMLElement).style.background = '#4caf50';
        }
      }

      this.config.push({
        index: i,
        label: info.label,
        name: info.name,
        containerSelector: info.containerPath,
        fallbackName: info.name,
        placeholder: info.placeholder,
        elementType: info.elementType,
        dataName: info.dataName,
        xtype: info.xtype,
      });
    });

    console.log('✅ 已保存配置:', this.config);
    return this.config;
  }

  /**
   * 根据元素类型提取值
   */
  private getElementValue(element: HTMLElement, elementType: ElementType): string {
    if (elementType === 'input') {
      return (element as HTMLInputElement).value;
    } else {
      // 对于显示元素，提取文本内容
      return element.textContent?.trim() || '';
    }
  }

  /**
   * 根据配置提取元素
   */
  private extractByConfig(config: SavedConfig[]): ExtractResult[] {
    if (!config || config.length === 0) {
      console.error('❌ 没有配置');
      return [];
    }

    this.clearHighlight();
    const result: ExtractResult[] = [];

    config.forEach((item, idx) => {
      let element: HTMLElement | null = null;
      let foundMethod = '';

      // 尝试1：通过容器选择器查找
      if (item.containerSelector) {
        try {
          const containers = document.querySelectorAll(item.containerSelector);

          for (const container of containers) {
            let foundElement: HTMLElement | null = null;

            // 根据元素类型查找
            if (item.elementType === 'input') {
              if (container.tagName.toLowerCase() === 'input') {
                foundElement = container as HTMLElement;
              } else {
                foundElement = container.querySelector(
                  'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
                ) as HTMLElement;
              }
            } else {
              // 对于显示元素，优先通过 data-name 查找
              if (item.dataName) {
                foundElement = container.querySelector(`[data-name="${item.dataName}"]`) as HTMLElement;
              }
              
              // 如果没找到，尝试通过 xtype 查找
              if (!foundElement && item.xtype) {
                foundElement = container.querySelector(`[xtype="${item.xtype}"]`) as HTMLElement;
              }
              
              // 如果还是没找到，查找任何带 data-name 的元素
              if (!foundElement) {
                foundElement = container.querySelector('[data-name]') as HTMLElement;
              }
            }

            if (foundElement) {
              if (item.label) {
                const parentContainer = foundElement.closest('.bh-form-group, [class*="form"]');
                const labelEl = parentContainer?.querySelector('.bh-form-label, label, [class*="label"]');

                if (labelEl && labelEl.textContent?.trim() === item.label) {
                  element = foundElement;
                  foundMethod = '容器选择器 + label 匹配';
                  break;
                } else if (!labelEl) {
                  element = foundElement;
                  foundMethod = '容器选择器（无 label 验证）';
                  break;
                }
              } else {
                element = foundElement;
                foundMethod = '容器选择器';
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`⚠️ 容器选择器失效: ${item.containerSelector}`, e);
        }
      }

      // 尝试2：通过 data-name 属性（针对显示元素）
      if (!element && item.dataName && item.elementType !== 'input') {
        const candidates = document.querySelectorAll(
          `[data-name="${item.dataName}"]`
        ) as NodeListOf<HTMLElement>;

        if (candidates.length === 1) {
          element = candidates[0];
          foundMethod = 'data-name 属性';
        } else if (candidates.length > 1) {
          if (item.label) {
            for (const candidate of candidates) {
              const container = candidate.closest('.bh-form-group, [class*="form"]');
              const labelEl = container?.querySelector('.bh-form-label, label, [class*="label"]');

              if (labelEl && labelEl.textContent?.trim() === item.label) {
                element = candidate;
                foundMethod = 'data-name 属性 + label 匹配';
                break;
              }
            }
          }

          if (!element) {
            element = candidates[0];
            foundMethod = 'data-name 属性（第 1 个）';
          }
        }
      }

      // 尝试3：通过 name 属性（针对 input 元素）
      if (!element && item.fallbackName && item.elementType === 'input') {
        const candidates = document.querySelectorAll(
          `input[name="${item.fallbackName}"]:not([type="hidden"])`
        ) as NodeListOf<HTMLElement>;

        if (candidates.length === 1) {
          element = candidates[0];
          foundMethod = 'name 属性';
        } else if (candidates.length > 1) {
          if (item.label) {
            for (const candidate of candidates) {
              const container = candidate.closest('.bh-form-group, [class*="form"]');
              const labelEl = container?.querySelector('.bh-form-label, label, [class*="label"]');

              if (labelEl && labelEl.textContent?.trim() === item.label) {
                element = candidate;
                foundMethod = 'name 属性 + label 匹配';
                break;
              }
            }
          }

          if (!element) {
            element = candidates[0];
            foundMethod = 'name 属性（第 1 个）';
          }
        }
      }

      // 尝试4：通过 placeholder（针对 input 元素）
      if (!element && item.placeholder && item.elementType === 'input') {
        element = document.querySelector(
          `input[placeholder="${item.placeholder}"]:not([type="hidden"])`
        ) as HTMLElement;

        if (element) {
          foundMethod = 'placeholder';
        }
      }

      // 处理结果
      if (element) {
        const value = this.getElementValue(element, item.elementType);
        
        result.push({
          configIndex: idx,
          label: item.label,
          element: element,
          value: value,
          foundBy: foundMethod,
        });

        // 高亮
        element.style.outline = '3px solid #ff9800';
        element.style.boxShadow = '0 0 12px #ff9800';
        element.style.borderRadius = '4px';
        element.style.transition = 'all 0.3s ease';

        this.addIndexTag(element, idx, '#ff9800', `✓${idx}`);

        if (idx === 0) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        console.log(`✅ [${idx}] 找到: ${item.label || item.fallbackName || item.name} (via ${foundMethod})`);
      } else {
        console.error(`❌ [${idx}] 未找到: ${item.label || item.fallbackName || item.name}`);
      }
    });

    console.log(`📊 成功提取 ${result.length}/${config.length} 个元素`);
    return result;
  }

  /**
   * 高亮指定索引的元素
   */
  private highlightByIndex(index: number): void {
    const element = document.querySelector(
      `[data-anlo-index="${index}"]`
    ) as HTMLElement;

    if (!element) return;

    const originalOutline = element.style.outline;
    const originalShadow = element.style.boxShadow;

    element.style.outline = '3px solid #4caf50';
    element.style.boxShadow = '0 0 15px #4caf50';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalShadow;
    }, 1000);
  }

  /**
   * 清除所有高亮
   */
  private clearHighlight(): void {
    // 移除标签
    document.querySelectorAll('.anlo-tag').forEach(el => el.remove());

    // 清除样式 - 查找所有带 data-anlo-index 的元素
    document.querySelectorAll('[data-anlo-index]').forEach(element => {
      (element as HTMLElement).style.outline = '';
      (element as HTMLElement).style.boxShadow = '';
      (element as HTMLElement).style.borderRadius = '';
      element.removeAttribute('data-anlo-index');
    });

    console.log('✅ 已清除高亮');
  }

  /**
   * 添加索引标签
   */
  private addIndexTag(
    element: HTMLElement,
    index: number,
    bgColor: string,
    text?: string
  ): void {
    const existingTag = element.nextElementSibling?.classList.contains('anlo-tag');
    if (existingTag) return;

    const tag = document.createElement('span');
    tag.className = 'anlo-tag';
    tag.textContent = text || `#${index}`;
    tag.style.cssText = `
      position: absolute;
      background: ${bgColor};
      color: white;
      font-size: 12px;
      font-weight: bold;
      padding: 3px 6px;
      border-radius: 3px;
      margin-left: 6px;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    const parent = element.parentElement;
    if (parent && (parent.style.position === '' || parent.style.position === 'static')) {
      parent.style.position = 'relative';
    }

    element.insertAdjacentElement('afterend', tag);
  }
}

// 初始化
const anloContent = new AnloContentScript();

export {};

