// Electron 主进程 与 渲染进程 交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("gpt_reply", {
    getSettings: () => ipcRenderer.invoke(
        "LiteLoader.gpt_reply.getSettings"
    ),
    setSettings: content => ipcRenderer.invoke(
        "LiteLoader.gpt_reply.setSettings",
        content
    ),
    logToMain: (...args) => ipcRenderer.invoke(
        "LiteLoader.gpt_reply.logToMain",
        ...args
    ),
    getGPTReply: params => ipcRenderer.invoke(
        "LiteLoader.gpt_reply.getGPTReply",
        params
    ),
});
