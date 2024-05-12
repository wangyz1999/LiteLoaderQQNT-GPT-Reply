const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gpt_reply", {
    /**
     * 获取配置信息
     * @returns {Promise<Object>} 配置信息对象
     */
    getSettings: () => ipcRenderer.invoke("LiteLoader.gpt_reply.getSettings"),

    /**
     * 设置配置信息
     * @param {Object} content - 新的配置信息内容
     * @returns {Promise<void>}
     */
    setSettings: (content) => ipcRenderer.invoke("LiteLoader.gpt_reply.setSettings", content),

    /**
     * 将日志记录到主进程
     * @param {...any} args - 需要记录的日志内容
     */
    logToMain: (...args) => ipcRenderer.invoke("LiteLoader.gpt_reply.logToMain", ...args),

    /**
     * 打开指定的网页
     * @param {string} url - 要打开的网页URL
     */
    openWeb: (url) => ipcRenderer.send("LiteLoader.gpt_reply.openWeb", url),

    /**
     * 获取GPT回复
     * @param {Object} params - 包含system_message, prompt, model的参数对象
     * @returns {Promise<string>} GPT回复内容
     */
    getGPTReply: (params) => ipcRenderer.invoke("LiteLoader.gpt_reply.getGPTReply", params),

    /**
     * 流式获取GPT回复
     * @param {Object} params - 包含system_message, prompt, model的参数对象
     * @param {string} streamElementId - 显示流式数据的HTML元素ID
     */
    streamGPTReply: (params, streamElementId) => {
        ipcRenderer.invoke("LiteLoader.gpt_reply.streamGPTReply", params);

        // 移除之前的监听器以避免重复事件
        ipcRenderer.removeAllListeners("LiteLoader.gpt_reply.streamData");
        ipcRenderer.removeAllListeners("LiteLoader.gpt_reply.streamError");

        /**
         * 处理流数据
         * @param {Event} event - 事件对象
         * @param {string} chunkContent - 流数据内容
         * @param {number} chunkIdx - 数据块索引
         */
        ipcRenderer.on("LiteLoader.gpt_reply.streamData", (event, chunkContent, chunkIdx) => {
            const streamElement = document.getElementById(streamElementId);
            if (streamElement) {
                if (chunkIdx === 0) {
                    streamElement.innerText = "";
                }
                streamElement.innerText += chunkContent;
            }
        });

        /**
         * 处理流错误
         * @param {Event} event - 事件对象
         * @param {string} errorMessage - 错误信息
         */
        ipcRenderer.on("LiteLoader.gpt_reply.streamError", (event, errorMessage) => {
            const streamElement = document.getElementById(streamElementId);
            if (streamElement) {
                streamElement.innerText += `\nError: ${errorMessage}`;
            }
        });
    }
});
