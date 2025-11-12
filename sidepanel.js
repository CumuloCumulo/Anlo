// 侧边栏逻辑
let scannedInputs = [];
let selectedIndexes = new Set();
let savedConfig = [];

// DOM 元素
const scanBtn = document.getElementById('scanBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const extractBtn = document.getElementById('extractBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const clearHighlightBtn = document.getElementById('clearHighlightBtn');
const clearConfigBtn = document.getElementById('clearConfigBtn');
const inputList = document.getElementById('inputList');
const scanStatus = document.getElementById('scanStatus');
const saveStatus = document.getElementById('saveStatus');
const extractStatus = document.getElementById('extractStatus');
const configStatus = document.getElementById('configStatus');
const importArea = document.getElementById('importArea');
const savedConfigs = document.getElementById('savedConfigs');

// 获取当前标签页
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 执行脚本到页面
async function executeScript(func, args = []) {
  const tab = await getCurrentTab();
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: func,
    args: args
  });
  return results[0].result;
}

// 扫描所有输入框
scanBtn.addEventListener('click', async () => {
  scanStatus.innerHTML = '<div class="status info">正在扫描...</div>';
  
  try {
    scannedInputs = await executeScript(() => {
      return window.InputMapperContent?.scanAll() || [];
    });
    
    if (scannedInputs.length === 0) {
      scanStatus.innerHTML = '<div class="status error">未找到输入框</div>';
      return;
    }
    
    scanStatus.innerHTML = `<div class="status success">找到 <span class="counter">${scannedInputs.length}</span> 个输入框</div>`;
    
    // 显示列表
    renderInputList();
    
  } catch (error) {
    scanStatus.innerHTML = `<div class="status error">扫描失败: ${error.message}</div>`;
  }
});

// 渲染输入框列表
function renderInputList() {
  inputList.innerHTML = '';
  
  scannedInputs.forEach((input, index) => {
    const div = document.createElement('div');
    div.className = 'input-item';
    if (selectedIndexes.has(index)) {
      div.classList.add('selected');
    }
    
    div.innerHTML = `
      <div class="input-item-header">
        <span>#${index}</span>
        <span>${input.label || '(无标签)'}</span>
      </div>
      <div class="input-item-detail">
        name: ${input.name || '(无)'} | type: ${input.type}
      </div>
      <div class="input-item-detail" style="font-size: 10px; color: #999;">
        ${input.containerPath || '(无容器)'}
      </div>
    `;
    
    div.addEventListener('click', () => {
      if (selectedIndexes.has(index)) {
        selectedIndexes.delete(index);
        div.classList.remove('selected');
      } else {
        selectedIndexes.add(index);
        div.classList.add('selected');
      }
      
      // 高亮选中的
      highlightSelected(index);
    });
    
    inputList.appendChild(div);
  });
}

// 高亮选中的输入框
async function highlightSelected(index) {
  await executeScript((idx) => {
    window.InputMapperContent?.highlightByIndex(idx);
  }, [index]);
}

// 保存配置
saveConfigBtn.addEventListener('click', async () => {
  if (selectedIndexes.size === 0) {
    saveStatus.innerHTML = '<div class="status error">请先选择输入框</div>';
    return;
  }
  
  saveStatus.innerHTML = '<div class="status info">正在保存...</div>';
  
  try {
    const indexes = Array.from(selectedIndexes);
    const config = await executeScript((idxs) => {
      return window.InputMapperContent?.saveByIndexes(idxs) || [];
    }, [indexes]);
    
    if (config.length > 0) {
      savedConfig = config;
      
      // 保存到存储
      await chrome.storage.local.set({ 
        savedConfig: config,
        timestamp: Date.now()
      });
      
      saveStatus.innerHTML = `<div class="status success">已保存 <span class="counter">${config.length}</span> 个配置</div>`;
      
      renderSavedConfigs();
    } else {
      saveStatus.innerHTML = '<div class="status error">保存失败</div>';
    }
    
  } catch (error) {
    saveStatus.innerHTML = `<div class="status error">保存失败: ${error.message}</div>`;
  }
});

// 渲染已保存的配置
function renderSavedConfigs() {
  if (savedConfig.length === 0) {
    savedConfigs.innerHTML = '<div class="status info" style="margin: 0;">暂无保存的配置</div>';
    return;
  }
  
  savedConfigs.innerHTML = '';
  savedConfig.forEach((cfg, idx) => {
    const div = document.createElement('div');
    div.className = 'config-item';
    div.innerHTML = `
      <div class="config-item-info">
        <strong>${cfg.label || cfg.fallbackName || '(无名称)'}</strong><br>
        <span style="color: #999;">${cfg.containerSelector || '(无选择器)'}</span>
      </div>
      <button class="danger" data-index="${idx}">删除</button>
    `;
    
    // 删除按钮
    div.querySelector('button').addEventListener('click', async (e) => {
      e.stopPropagation();
      savedConfig.splice(idx, 1);
      await chrome.storage.local.set({ savedConfig: savedConfig });
      renderSavedConfigs();
      saveStatus.innerHTML = '<div class="status success">配置已删除</div>';
    });
    
    savedConfigs.appendChild(div);
  });
}

// 根据配置提取
extractBtn.addEventListener('click', async () => {
  if (savedConfig.length === 0) {
    extractStatus.innerHTML = '<div class="status error">没有保存的配置，请先保存</div>';
    return;
  }
  
  extractStatus.innerHTML = '<div class="status info">正在提取...</div>';
  
  try {
    const result = await executeScript((config) => {
      return window.InputMapperContent?.extractByConfig(config) || [];
    }, [savedConfig]);
    
    if (result.length > 0) {
      extractStatus.innerHTML = `<div class="status success">成功提取 <span class="counter">${result.length}/${savedConfig.length}</span> 个输入框</div>`;
    } else {
      extractStatus.innerHTML = '<div class="status error">未能提取到任何输入框</div>';
    }
    
  } catch (error) {
    extractStatus.innerHTML = `<div class="status error">提取失败: ${error.message}</div>`;
  }
});

// 导出配置
exportBtn.addEventListener('click', async () => {
  if (savedConfig.length === 0) {
    configStatus.innerHTML = '<div class="status error">没有配置可导出</div>';
    return;
  }
  
  const json = JSON.stringify(savedConfig, null, 2);
  
  try {
    await navigator.clipboard.writeText(json);
    configStatus.innerHTML = '<div class="status success">配置已复制到剪贴板</div>';
  } catch (error) {
    // 如果剪贴板失败，显示在文本框
    importArea.value = json;
    configStatus.innerHTML = '<div class="status success">配置已显示在下方文本框</div>';
  }
});

// 导入配置
importBtn.addEventListener('click', async () => {
  const json = importArea.value.trim();
  
  if (!json) {
    configStatus.innerHTML = '<div class="status error">请输入配置JSON</div>';
    return;
  }
  
  try {
    const config = JSON.parse(json);
    
    if (!Array.isArray(config)) {
      throw new Error('配置格式错误，应为数组');
    }
    
    savedConfig = config;
    await chrome.storage.local.set({ 
      savedConfig: config,
      timestamp: Date.now()
    });
    
    renderSavedConfigs();
    configStatus.innerHTML = `<div class="status success">已导入 <span class="counter">${config.length}</span> 个配置</div>`;
    importArea.value = '';
    
  } catch (error) {
    configStatus.innerHTML = `<div class="status error">导入失败: ${error.message}</div>`;
  }
});

// 清除高亮
clearHighlightBtn.addEventListener('click', async () => {
  await executeScript(() => {
    window.InputMapperContent?.clearHighlight();
  });
  configStatus.innerHTML = '<div class="status success">已清除高亮</div>';
});

// 清除配置
clearConfigBtn.addEventListener('click', async () => {
  if (confirm('确定要清除所有配置吗？')) {
    savedConfig = [];
    selectedIndexes.clear();
    await chrome.storage.local.remove('savedConfig');
    renderSavedConfigs();
    configStatus.innerHTML = '<div class="status success">配置已清除</div>';
  }
});

// 页面加载时恢复配置
window.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get('savedConfig');
  if (data.savedConfig) {
    savedConfig = data.savedConfig;
    renderSavedConfigs();
  }
});

