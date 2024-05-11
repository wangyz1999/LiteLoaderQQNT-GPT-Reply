const fs = require("fs");
const path = require("path");
const { BrowserWindow, ipcMain, shell, net, ipcRenderer  } = require("electron");
const OpenAI = require("openai");

const openai = new OpenAI();

const pluginDataPath = LiteLoader.plugins["gpt_reply"].path.data;
const settingsPath = path.join(pluginDataPath, "settings.json");

if (!fs.existsSync(pluginDataPath)) {
    fs.mkdirSync(pluginDataPath, { recursive: true });
}
if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(
        settingsPath,
        JSON.stringify(
            {
                openai_api_key: "",
                model: "gpt-3.5-turbo",
                system_message:
                    "你在回复群聊消息，请使用以下说话风格\n- 你说话言简意赅\n- 你喜欢用颜文字卖萌",
            },
            null,
            4
        )
    );
} else {
    const data = fs.readFileSync(settingsPath, "utf-8");
    const config = JSON.parse(data);
}

function log(...args) {
    console.log(`[GPT-Reply]`, ...args);
}

function watchSettingsChange(webContents, settingsPath) {
    fs.watch(
        settingsPath,
        "utf-8",
        debounce(() => {
            updateStyle(webContents, settingsPath);
        }, 100)
    );
}

ipcMain.on(
    "LiteLoader.gpt_reply.watchSettingsChange",
    (event, settingsPath) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        watchSettingsChange(window.webContents, settingsPath);
    }
);


ipcMain.handle("LiteLoader.gpt_reply.getSettings", (event, message) => {
    try {
        const data = fs.readFileSync(settingsPath, "utf-8");
        const config = JSON.parse(data);
        return config;
    } catch (error) {
        log(error);
        return {};
    }
});

ipcMain.handle("LiteLoader.gpt_reply.setSettings", (event, content) => {
    try {
        const new_config = JSON.stringify(content);
        fs.writeFileSync(settingsPath, new_config, "utf-8");
    } catch (error) {
        log(error);
    }
});

ipcMain.handle("LiteLoader.gpt_reply.logToMain", (event, ...args) => {
    log(...args);
});

ipcMain.handle("LiteLoader.gpt_reply.getGPTReply", async (event, params) => {
    try {
        const { system_message, prompt, model } = params;
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: system_message },
                { role: "user", content: prompt },
            ],
            model: model,
        });

        const response = completion.choices[0].message.content;
        return response;
    } catch (error) {
        log(error);
        return {};
    }
});

ipcMain.handle(
    "LiteLoader.gpt_reply.streamGPTReply",
    async (event, params) => {
        try {
            const { system_message, prompt, model } = params;
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: system_message },
                    { role: "user", content: prompt },
                ],
                model: model,
                stream: true,
            });

            let chunkIdx = 0;
            for await (const chunk of completion) {
                const chunkContent = chunk.choices[0].delta?.content || "";
                event.sender.send("LiteLoader.gpt_reply.streamData", chunkContent, chunkIdx);
                chunkIdx++;
            }
        } catch (error) {
            log(error);
            event.sender.send("LiteLoader.gpt_reply.streamError", error.message);
        }
    }
);

// 创建窗口时触发
module.exports.onBrowserWindowCreated = (window) => {
    // window 为 Electron 的 BrowserWindow 实例
};
