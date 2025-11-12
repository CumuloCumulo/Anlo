// 后台服务
chrome.action.onClicked.addListener(async (tab) => {
  // 点击插件图标时打开侧边栏
  await chrome.sidePanel.open({ tabId: tab.id });
});

// 监听侧边栏打开
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

console.log('🎯 输入框映射工具后台服务已启动');

