// content.js - 完整增强版

(function() {
  'use strict';
  
  window.InputMapperContent = {
    scannedInputs: [],
    config: [],
    
    // 🆕 增强版：获取包含序号的稳定选择器
    getStableSelectorWithPosition(element) {
      if (!element) return null;
      
      const parts = [];
      let current = element;
      
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        
        // 1. 检查是否有稳定的 id
        if (current.id && !current.id.match(/jqx|random|dynamic|\d{6,}/i)) {
          selector += `#${current.id}`;
          parts.unshift(selector);
          break;  // id 唯一，停止
        }
        
        // 2. 添加稳定的 class
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.split(' ')
            .filter(c => c && !c.match(/jqx|random|dynamic|\d{5,}/i))
            .slice(0, 2);
          if (classes.length > 0) {
            selector += '.' + classes.join('.');
          }
        }
        
        // 3. 检查唯一属性
        const uniqueAttrs = ['data-name', 'data-field', 'data-caption', 'emap-role', 'data-role'];
        let foundUniqueAttr = false;
        
        for (const attr of uniqueAttrs) {
          if (current.hasAttribute(attr)) {
            const value = current.getAttribute(attr);
            if (value) {  // 确保属性值不为空
              selector += `[${attr}="${value}"]`;
              foundUniqueAttr = true;
              break;
            }
          }
        }
        
        // 4. 🔥 核心逻辑：如果没有唯一标识，添加 nth-child
        if (!foundUniqueAttr && current.parentElement) {
          // 检查是否有相同选择器的兄弟
          const baseSelector = selector;
          try {
            const matches = current.parentElement.querySelectorAll(`:scope > ${baseSelector}`);
            if (matches.length > 1) {
              // 有多个相同元素，需要序号
              const index = Array.from(current.parentElement.children).indexOf(current) + 1;
              selector += `:nth-child(${index})`;
            }
          } catch (e) {
            // 选择器可能有问题，保守添加序号
            const index = Array.from(current.parentElement.children).indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }
        
        parts.unshift(selector);
        current = current.parentElement;
        
        // 最多5层保证准确性
        if (parts.length >= 5) break;
      }
      
      return parts.join(' > ');
    },
    
    // 扫描所有输入框
    scanAll() {
      this.clearHighlight();
      
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
      this.scannedInputs = [];
      
      inputs.forEach((input, i) => {
        // 高亮显示
        input.style.outline = '2px solid #00bfff';
        input.style.boxShadow = '0 0 8px #00bfff';
        input.style.borderRadius = '4px';
        input.style.transition = 'all 0.3s ease';
        input.setAttribute('data-input-mapper-index', i);
        
        // 添加编号标签
        const existingTag = input.nextElementSibling?.classList.contains('input-mapper-tag');
        if (!existingTag) {
          const tag = document.createElement('span');
          tag.className = 'input-mapper-tag';
          tag.textContent = `#${i}`;
          tag.style.cssText = `
            position: absolute;
            background: #00bfff;
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
          
          if (input.parentElement.style.position === '' || input.parentElement.style.position === 'static') {
            input.parentElement.style.position = 'relative';
          }
          
          input.insertAdjacentElement('afterend', tag);
        }
        
        // 🔥 智能查找容器（优先找有唯一标识的，但确保不是 input 本身）
        let container = null;
        
        // 从父元素开始查找（避免选到 input 自己）
        const parent = input.parentElement;
        if (parent) {
          container = parent.closest('[data-name]') || 
                     parent.closest('[data-field]') ||
                     parent.closest('[data-caption]') ||
                     input.closest('.bh-form-group') || 
                     input.closest('div[class*="form"]') || 
                     input.closest('div[class*="field"]') ||
                     parent;
        } else {
          container = input.parentElement || input;
        }
        
        const label = container?.querySelector('.bh-form-label, label, [class*="label"]');
        
        const info = {
          index: i,
          label: label ? label.textContent.trim() : null,
          name: input.name || null,
          id: input.id || null,
          type: input.type,
          containerPath: this.getStableSelectorWithPosition(container),  // 🔥 使用增强版
          placeholder: input.placeholder || null
        };
        
        this.scannedInputs.push(info);
      });
      
      console.log(`🔍 扫描到 ${this.scannedInputs.length} 个输入框`, this.scannedInputs);
      return this.scannedInputs;
    },
    
    // ... 其他方法保持不变 ...
    
    highlightByIndex(index) {
      const input = document.querySelector(`input[data-input-mapper-index="${index}"]`);
      if (!input) return;
      
      const originalOutline = input.style.outline;
      const originalShadow = input.style.boxShadow;
      
      input.style.outline = '3px solid #4caf50';
      input.style.boxShadow = '0 0 15px #4caf50';
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        input.style.outline = originalOutline;
        input.style.boxShadow = originalShadow;
      }, 1000);
    },
    
    saveByIndexes(indexes) {
      this.config = [];
      
      indexes.forEach(i => {
        const info = this.scannedInputs.find(inp => inp.index === i);
        if (!info) {
          console.warn(`⚠️ 序号 ${i} 不存在`);
          return;
        }
        
        const input = document.querySelector(`input[data-input-mapper-index="${i}"]`);
        if (input) {
          input.style.outline = '3px solid #4caf50';
          input.style.boxShadow = '0 0 12px #4caf50';
          
          const tag = input.nextElementSibling;
          if (tag && tag.classList.contains('input-mapper-tag')) {
            tag.style.background = '#4caf50';
          }
        }
        
        this.config.push({
          index: i,
          label: info.label,
          name: info.name,
          containerSelector: info.containerPath,  // 已包含 nth-child
          fallbackName: info.name,
          placeholder: info.placeholder
        });
      });
      
      console.log('✅ 已保存配置:', this.config);
      return this.config;
    },
    
    extractByConfig(config = this.config) {
      if (!config || config.length === 0) {
        console.error('❌ 没有配置');
        return [];
      }
      
      this.clearHighlight();
      
      const result = [];
      
      config.forEach((item, idx) => {
        let input = null;
        let foundMethod = '';
        
        // 尝试1：通过容器选择器查找
        if (item.containerSelector) {
          try {
            const elements = document.querySelectorAll(item.containerSelector);
            
            // 遍历所有匹配的元素
            for (const element of elements) {
              let foundInput = null;
              
              // 🔥 判断匹配的元素是容器还是 input 本身
              if (element.tagName.toLowerCase() === 'input') {
                foundInput = element;
              } else {
                foundInput = element.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
              }
              
              // 如果找到了 input，验证 label 是否匹配（如果有 label 信息）
              if (foundInput) {
                if (item.label) {
                  const container = foundInput.closest('.bh-form-group, [class*="form"]');
                  const labelEl = container?.querySelector('.bh-form-label, label, [class*="label"]');
                  if (labelEl && labelEl.textContent.trim() === item.label) {
                    input = foundInput;
                    foundMethod = '容器选择器 + label 匹配';
                    break;
                  } else if (!labelEl) {
                    // 没有找到 label，可能是没有 label 的输入框
                    input = foundInput;
                    foundMethod = '容器选择器（无 label 验证）';
                    break;
                  }
                  // label 不匹配，继续查找下一个
                } else {
                  // 没有 label 信息，直接使用第一个找到的
                  input = foundInput;
                  foundMethod = '容器选择器';
                  break;
                }
              }
            }
            
            if (!input && elements.length > 0) {
              console.warn(`⚠️ [${idx}] 找到 ${elements.length} 个容器但未匹配到正确的 input`);
            }
          } catch (e) {
            console.warn(`⚠️ 容器选择器失效: ${item.containerSelector}`, e);
          }
        }
        
        // 尝试2：通过 name 属性
        if (!input && item.fallbackName) {
          const candidates = document.querySelectorAll(`input[name="${item.fallbackName}"]:not([type="hidden"])`);
          if (candidates.length === 1) {
            input = candidates[0];
            foundMethod = 'name 属性';
          } else if (candidates.length > 1) {
            // 多个匹配，尝试通过 label 匹配
            if (item.label) {
              for (const candidate of candidates) {
                const container = candidate.closest('.bh-form-group, [class*="form"]');
                const labelEl = container?.querySelector('.bh-form-label, label, [class*="label"]');
                if (labelEl && labelEl.textContent.trim() === item.label) {
                  input = candidate;
                  foundMethod = 'name 属性 + label 匹配';
                  break;
                }
              }
            }
            if (!input) {
              input = candidates[0];
              foundMethod = 'name 属性（第 1 个）';
            }
          }
        }
        
        // 尝试3：通过 placeholder
        if (!input && item.placeholder) {
          input = document.querySelector(`input[placeholder="${item.placeholder}"]:not([type="hidden"])`);
          if (input) foundMethod = 'placeholder';
        }
        
        if (input) {
          result.push({
            configIndex: idx,
            label: item.label,
            element: input,
            value: input.value,
            foundBy: foundMethod
          });
          
          // 高亮
          input.style.outline = '3px solid #ff9800';
          input.style.boxShadow = '0 0 12px #ff9800';
          input.style.borderRadius = '4px';
          input.style.transition = 'all 0.3s ease';
          
          const tag = document.createElement('span');
          tag.className = 'input-mapper-tag';
          tag.textContent = `✓${idx}`;
          tag.style.cssText = `
            position: absolute;
            background: #ff9800;
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
          
          if (input.parentElement.style.position === '' || input.parentElement.style.position === 'static') {
            input.parentElement.style.position = 'relative';
          }
          
          input.insertAdjacentElement('afterend', tag);
          
          if (idx === 0) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          console.log(`✅ [${idx}] 找到: ${item.label || item.fallbackName || item.name || '(无名称)'} (via ${foundMethod})`);
        } else {
          console.error(`❌ [${idx}] 未找到: ${item.label || item.fallbackName || item.name || '(无名称)'}`);
        }
      });
      
      console.log(`📊 成功提取 ${result.length}/${config.length} 个输入框`);
      console.table(result.map(r => ({
        序号: r.configIndex,
        标签: r.label || r.element.name || '(无)',
        方法: r.foundBy,
        值: r.value?.substring(0, 30) || '(空)'
      })));
      return result;
    },
    
    clearHighlight() {
      document.querySelectorAll('.input-mapper-tag').forEach(el => el.remove());
      document.querySelectorAll('input[data-input-mapper-index]').forEach(input => {
        input.style.outline = '';
        input.style.boxShadow = '';
        input.style.borderRadius = '';
        input.removeAttribute('data-input-mapper-index');
      });
      console.log('✅ 已清除高亮');
    }
  };
  
  console.log('🎯 输入框映射工具已加载 v2.1（修复容器识别 + 智能匹配）');
})();