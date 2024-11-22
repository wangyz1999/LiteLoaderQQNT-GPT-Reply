const fs = require("fs");
const path = require("path");
const { BrowserWindow, ipcMain, shell } = require("electron");
const OpenAI = require("openai");
const { initChat } = require("duckduckgo-ai-chat-cjs")
let openai = null;
let duckai = null;

const pluginDataPath = LiteLoader.plugins["gpt_reply"].path.data;
const settingsPath = path.join(pluginDataPath, "settings.json");

const defaultSettings = {
    openai_api_key: "",
    openai_base_url: "",
    model: "gpt-4o-mini",
    reply_mode: "reply-mode-copy",
    system_message: "你在回复群聊消息，请使用以下说话风格\n- 你说话言简意赅\n- 你喜欢用颜文字卖萌",
    preset_in_context: "off",
    system_message_presets: [
        {
            "name": "翻译官",
            "message": "你是一个专业的翻译官，请使用以下说话风格\n- 你将对话内容翻译成英文\n- 准确翻译对话内容\n- 保持原文风格\n- 必要时提供多种翻译选项"
        },
        {
            "name": "专业解答",
            "message": "你是一个专业的问题解答者，请使用以下说话风格\n- 回答严谨专业\n- 逻辑清晰，分点论述\n- 必要时引用可靠来源\n- 对复杂概念做通俗解释"
        },
        {
            "name": "梗王",
            "message": "你是一个互联网梗王，请使用以下说话风格\n- 熟悉当下流行梗\n- 经常玩烂梗、谐音梗和双关语\n- 回复中适当融入流行梗和网络用语"
        },
        {
            "name": "情人",
            "message": "你是一个温柔的情人，请使用以下说话风格\n- 你说话不超过10个字，不用标点符号\n- 说话温柔体贴\n- 经常使用爱称和昵称\n- 回复充满关心和爱意\n- 撒娇和示爱\n- 用语亲密暧昧"
        },
        {
            "name": "抽象大师",
            "message": "你是一个抽象话语大师，请使用以下说话风格\n- 大量使用火星文\n- 故意打错字\n- 使用随机的emoji组合"
        }
    ],
    selected_preset_index: 0
};

if (!fs.existsSync(pluginDataPath)) {
    fs.mkdirSync(pluginDataPath, { recursive: true });
}


if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 4));
} else {
    const currentSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if (updateSettingsWithDefaults(currentSettings, defaultSettings)) {
        fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 4));
    }
}

const currentSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const apiKey = currentSettings.openai_api_key || process.env.OPENAI_API_KEY;
const baseURL = currentSettings.openai_base_url || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

try {
    openai = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
    });
    // duckai = initChat("gpt-4o-mini");
} catch (error) {
    openai = null;
}

// async function initializeDuckAI() {
//     try {
//         duckai = await initChat("mixtral");
//         console.log("duckai initialized");
//     } catch (error) {
//         duckai = null;
//     }
// }
// initializeDuckAI();

/**
 * 使用默认值更新现有设置对象中的缺失键。
 * @param {Object} existingSettings - 需要检查和更新的当前设置对象。
 * @param {Object} defaultSettings - 包含所需键及其默认值的默认设置对象。
 * @returns {boolean} - 如果向现有设置中添加了任何键，则返回 true，否则返回 false。
 */
function updateSettingsWithDefaults(existingSettings, defaultSettings) {
    let updated = false;
    for (const key in defaultSettings) {
        if (!existingSettings.hasOwnProperty(key)) {
            existingSettings[key] = defaultSettings[key];
            updated = true;
        } else if (key === 'system_message_presets' && Array.isArray(defaultSettings[key])) {
            if (!Array.isArray(existingSettings[key]) || existingSettings[key].length === 0) {
                existingSettings[key] = defaultSettings[key];
                updated = true;
            }
        }
    }
    return updated;
}

/**
 * 打印日志信息
 * @param {...any} args - 需要打印的日志内容
 */
function log(...args) {
    console.log(`[GPT-Reply]`, ...args);
}

/**
 * 打开指定的网页
 * @param {string} url - 要打开的网页URL
 */
function openWeb(url) {
    shell.openExternal(url);
}

/**
 * 监控设置文件的更改
 * @param {Electron.WebContents} webContents - Electron的WebContents对象
 * @param {string} settingsPath - 设置文件的路径
 */
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

ipcMain.handle("LiteLoader.gpt_reply.checkOpenAI", (event, message) => {
    return (openai || duckai) ? true : false;
});

/**
 * 获取插件的配置信息
 * @returns {Object} 配置信息对象
 */
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

/**
 * 设置插件的配置信息
 * @param {Object} content - 新的配置信息
 */
ipcMain.handle("LiteLoader.gpt_reply.setSettings", (event, content) => {
    try {
        const new_config = JSON.stringify(content, null, 4);
        fs.writeFileSync(settingsPath, new_config, "utf-8");
        const apiKey = content.openai_api_key || process.env.OPENAI_API_KEY;
        const baseURL = content.openai_base_url || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL,
        });
    } catch (error) {
        log(error);
    }
});

/**
 * 打开指定的网页
 * @param {...string} message - 要打开的网页URL
 */
ipcMain.on("LiteLoader.gpt_reply.openWeb", (event, ...message) =>
    openWeb(...message)
);

/**
 * 将日志记录到主进程
 * @param {...any} args - 需要记录的日志内容
 */
ipcMain.handle("LiteLoader.gpt_reply.logToMain", (event, ...args) => {
    log(...args);
});

/**
 * 获取GPT回复
 * @param {Object} params - 包含system_message, prompt, model的参数对象
 * @returns {string} GPT回复内容
 */
ipcMain.handle("LiteLoader.gpt_reply.getGPTReply", async (event, params) => {
    try {
        const { system_message, prompt, model } = params;
        let response;

        if (model.endsWith('-ddg')) {
            // Handle DuckDuckGo models
            const modelName = model.replace('-ddg', '');
            duckai = await initChat(modelName);
            response = await duckai.fetchFull(system_message);
        } else {
            // Handle OpenAI models
            let messages;
            if (model === 'o1-preview' || model === 'o1-mini') {
                // For o1 models that don't support system role
                messages = [{
                    role: "user",
                    content: `${system_message}\n\nUser: ${prompt}`
                }];
            } else {
                // For other OpenAI models that support system role
                messages = [
                    { role: "system", content: system_message },
                    { role: "user", content: prompt }
                ];
            }

            const completion = await openai.chat.completions.create({
                messages: messages,
                model: model,
            });
            response = completion.choices[0].message.content;
        }

        return response;
    } catch (error) {
        log(error);
        return {};
    }
});

/**
 * 流式获取GPT回复
 * @param {Object} params - 包含system_message, prompt, model的参数对象
 */
ipcMain.handle("LiteLoader.gpt_reply.streamGPTReply", async (event, params) => {
    try {
        const { system_message, prompt, model, request_id } = params;
        let stream;
        let streamIdx = 0;

        const handleDuckAIStream = async (modelName) => {
            duckai = await initChat(modelName);
            const promptText = `prompt: 你是一个聊天机器人，这是当前使用你的人设置的系统提示词，${system_message}
接下来是你要回答的问题。你回复的所有内容都要有关于问题，而不要对prompt部分中存���的内容进行回答
questions: ${prompt}`;
            
            stream = await duckai.fetchStream(promptText);
            for await (const data of stream) {
                const dataContent = data ?? "";
                if (dataContent) {
                    event.sender.send(
                        "LiteLoader.gpt_reply.streamData",
                        dataContent,
                        streamIdx++,
                        request_id
                    );
                }
            }
        };

        if (model.endsWith('-ddg')) {
            await handleDuckAIStream(model.replace('-ddg', ''));
        } else {
            const messages = (model === 'o1-preview' || model === 'o1-mini') 
                ? [{
                    role: "user",
                    content: `${system_message}\n\nUser: ${prompt}`
                }]
                : [
                    { role: "system", content: system_message },
                    { role: "user", content: prompt }
                ];

            const completion = await openai.chat.completions.create({
                messages: messages,
                model: model,
                stream: true,
            });

            let chunkIdx = 0;
            for await (const chunk of completion) {
                const chunkContent = chunk?.choices?.[0]?.delta?.content ?? "";
                if (chunkContent) {
                    event.sender.send(
                        "LiteLoader.gpt_reply.streamData",
                        chunkContent,
                        chunkIdx++,
                        request_id
                    );
                }
            }
        }
    } catch (error) {
        log("[回复错误]", error);
        event.sender.send(
            "LiteLoader.gpt_reply.streamError", 
            error.message || "未知错误",
            params.request_id
        );
    }
});


/**
 * 建窗口时的触发事件
 * @param {Electron.BrowserWindow} window - Electron的BrowserWindow实例
 */
module.exports.onBrowserWindowCreated = (window) => {
    // window 为 Electron 的 BrowserWindow 实例
};
