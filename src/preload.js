const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gpt_reply", {
    getSettings: () => ipcRenderer.invoke("LiteLoader.gpt_reply.getSettings"),
    setSettings: (content) => ipcRenderer.invoke("LiteLoader.gpt_reply.setSettings", content),
    logToMain: (...args) => ipcRenderer.invoke("LiteLoader.gpt_reply.logToMain", ...args),
    getGPTReply: (params) => ipcRenderer.invoke("LiteLoader.gpt_reply.getGPTReply", params),
    streamGPTReply: (params, streamElementId) => {
        ipcRenderer.invoke("LiteLoader.gpt_reply.streamGPTReply", params);

        // Remove previous listeners to avoid duplicate events
        ipcRenderer.removeAllListeners("LiteLoader.gpt_reply.streamData");
        ipcRenderer.removeAllListeners("LiteLoader.gpt_reply.streamError");
        
        ipcRenderer.on("LiteLoader.gpt_reply.streamData", (event, chunkContent, chunkIdx) => {
            const streamElement = document.getElementById(streamElementId);
            if (streamElement) {
                if (chunkIdx === 0) {
                    streamElement.innerText = "";
                }
                streamElement.innerText += chunkContent;
            }
        });

        ipcRenderer.on("LiteLoader.gpt_reply.streamError", (event, errorMessage) => {
            const streamElement = document.getElementById(streamElementId);
            if (streamElement) {
                streamElement.innerText += `\nError: ${errorMessage}`;
            }
        });
    }
});
