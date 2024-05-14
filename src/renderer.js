// Constants
const PLUGIN_PATH = LiteLoader.plugins["gpt_reply"].path.plugin;
const ICON_PATH = "res/openai_tooltip.svg";

// Variables
let gptThinking = false;
let messageEl;
let appended = true;

// Utility Functions
function log(...args) {
    console.log(`[GPT-Reply]`, ...args);
}

/**
 * 获取并设置图标
 * @param {string} iconPath - 图标路径
 * @param {HTMLElement} element - 要设置图标的元素
 * @param {string} [id=null] - 可选，设置到图标的ID
 */
function fetchIcon(iconPath, element, id = null) {
    fetch(`local:///${PLUGIN_PATH}/${iconPath}`)
        .then((response) => response.text())
        .then((data) => {
            element.innerHTML = data;
            if (id) {
                element.querySelector("svg").id = id;
            }
        });
}

/**
 * 观察指定元素并执行回调
 * @param {string} selector - 选择器
 * @param {Function} callback - 元素出现时的回调函数
 * @param {boolean} [continuous=false] - 是否持续观察
 */
function observeElement(selector, callback, continuous = false) {
    let elementExists = false;
    const timer = setInterval(() => {
        const element = document.querySelector(selector);
        if (element && !elementExists) {
            elementExists = true;
            callback();
            if (!continuous) clearInterval(timer);
        } else if (!element) {
            elementExists = false;
        }
    }, 100);
}

/**
 * 获取GPT回复
 * @param {string} prompt - 用户输入的提示
 * @param {Function} callback - 回复结果的回调函数
 */
async function getGPTResponse(prompt, callback) {
    try {
        const settings = await gpt_reply.getSettings();
        const response = await gpt_reply.getGPTReply({
            system_message: settings.system_message,
            prompt: prompt,
            model: settings.model,
        });
        callback({ code: 200, data: response });
    } catch (error) {
        log("[回复错误]", error);
        callback({ code: -1, message: error.message });
    }
}

/**
 * 流式获取GPT回复
 * @param {string} prompt - 用户输入的提示
 * @param {string} streamElementId - 显示流式数据的HTML元素ID
 */
async function streamGPTResponse(prompt, streamElementId) {
    const settings = await gpt_reply.getSettings();
    const params = {
        system_message: settings.system_message,
        prompt: prompt,
        model: settings.model,
    };
    window.gpt_reply.streamGPTReply(params, streamElementId);
}

/**
 * 创建工具栏图标
 * @param {string} iconPath - 图标路径
 * @param {string} innerText - 图标内的文字
 * @param {Function} clickEvent - 点击事件
 * @param {Function} [mouseEnterEvent] - 鼠标进入事件
 * @param {Function} [mouseLeaveEvent] - 鼠标离开事件
 * @returns {HTMLElement} 创建的图标元素
 */
function createBarIcon(
    iconPath,
    innerText,
    clickEvent,
    mouseEnterEvent,
    mouseLeaveEvent
) {
    const qTooltips = document.createElement("div");
    const qTooltipsContent = document.createElement("div");
    const icon = document.createElement("i");
    const barIcon = document.createElement("div");

    barIcon.classList.add("gpt-reply-bar-icon");
    barIcon.appendChild(qTooltips);

    qTooltips.classList.add("gpt-reply-q-tooltips");
    qTooltips.addEventListener("click", clickEvent);
    if (mouseEnterEvent)
        barIcon.addEventListener("mouseenter", mouseEnterEvent);
    if (mouseLeaveEvent)
        barIcon.addEventListener("mouseleave", mouseLeaveEvent);

    qTooltips.appendChild(icon);
    qTooltips.appendChild(qTooltipsContent);

    qTooltipsContent.classList.add("gpt-reply-q-tooltips__content");
    qTooltipsContent.innerText = innerText;

    icon.classList.add("gpt-reply-q-icon");
    fetchIcon(iconPath, icon);

    return barIcon;
}

/**
 * 获取消息元素
 * @param {HTMLElement} target - 目标元素
 * @returns {HTMLElement} 消息内容容器元素
 */
function getMessageElement(target) {
    if (target.matches(".msg-content-container")) {
        return target;
    }
    return target.closest(".msg-content-container");
}

/**
 * 处理右键GPT回复菜单
 */
function handleContextMenu() {
    document
        .querySelector("#ml-root .ml-list")
        .addEventListener("mousedown", (e) => {
            if (e.button !== 2) {
                appended = true;
                return;
            }
            messageEl = getMessageElement(e.target);
            log("右键点击消息", messageEl);
            appended = false;
        });

    new MutationObserver(() => {
        if (appended) return;
        const qContextMenu = document.querySelector(".q-context-menu");
        if (qContextMenu && messageEl) {
            const messageText =
                messageEl.querySelector(".message-content").innerText;
            if (!messageText) return;

            let firstMenuItem = document.querySelector(
                ".q-context-menu .q-context-menu-item"
            );
            let clonedMenuItem = firstMenuItem.cloneNode(true);
            clonedMenuItem.querySelector("span").innerText = "GPT";
            fetchIcon(ICON_PATH, clonedMenuItem.querySelector(".q-icon"), "gpt-context-menu-icon");

            clonedMenuItem.addEventListener("click", () => {
                qContextMenu.style.display = "none";
                document.getElementById("response-text").innerText =
                    "GPT思考中...";
                showGPTResponse(messageText);
            });

            let separator = document.querySelector(
                ".q-context-menu .q-context-menu-separator"
            );
            qContextMenu.insertBefore(clonedMenuItem, separator);
            appended = true;
        }
    }).observe(document.body, { childList: true });
}

/**
 * 聊天框GPT回复
 */
function initializeResponseArea() {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `local:///${PLUGIN_PATH}/src/style.css`;
    document.head.appendChild(style);

    const gptResponse = document.createElement("div");
    gptResponse.id = "gpt-response";
    gptResponse.zIndex = 999;
    gptResponse.innerHTML = `
        <div class="response-bar">
            <div class="response-title">GPT回复</div>
            <div class="response-buttons">
                <button id="gpt-reply-copy-button" class="q-button q-button--small q-button--primary">复制</button>
                <button id="gpt-reply-cancel-button" class="q-button q-button--small q-button--secondary">取消</button>
            </div>
        </div>
        <div id="response-text"></div>
    `;

    const ckEditor = document.querySelector(".ck-editor");
    ckEditor.appendChild(gptResponse);

    const gptResponseText = document.querySelector("#response-text");
    document
        .querySelector("#gpt-reply-copy-button")
        .addEventListener("click", () => {
            navigator.clipboard.writeText(gptResponseText.innerText);
            hideGPTResponse();
        });

    document
        .querySelector("#gpt-reply-cancel-button")
        .addEventListener("click", () => {
            hideGPTResponse();
        });

    observeElement(
        ".chat-func-bar",
        () => {
            const iconBarLeft =
                document.querySelector(".chat-func-bar").firstElementChild;
            if (iconBarLeft.querySelector(".gpt-reply-bar-icon")) return;

            const baricon = createBarIcon(ICON_PATH, "GPT回复", () => {
                if (gptThinking) return;
                const text = document
                    .querySelector(".ck-content")
                    .innerText.trim();
                gptResponseText.innerText = text
                    ? "GPT思考中..."
                    : "请在聊天框中输入内容";
                showGPTResponse(text);
            });

            iconBarLeft.appendChild(baricon);
        },
        true
    );
}

/**
 * 显示GPT回复
 * @param {string} text - 用户输入的文本
 */
function showGPTResponse(text) {
    gptThinking = true;
    const gptResponse = document.getElementById("gpt-response");
    gptResponse.style.display = "block";
    gptResponse.animate(
        [
            { opacity: 0, transform: "translateY(20px)" },
            { opacity: 1, transform: "translateY(0px)" },
        ],
        {
            duration: 128,
            easing: "ease-out",
        }
    );

    if (!text) {
        document.getElementById("response-text").innerText =
            "请在聊天框中输入内容";
        return;
    }
    streamGPTResponse(text, "response-text");
}

/**
 * 隐藏GPT回复
 */
function hideGPTResponse() {
    const gptResponse = document.getElementById("gpt-response");
    gptResponse.animate(
        [
            { opacity: 1, transform: "translateY(0px)" },
            { opacity: 0, transform: "translateY(20px)" },
        ],
        {
            duration: 128,
            easing: "ease-in",
        }
    ).onfinish = () => {
        gptResponse.style.display = "none";
        gptThinking = false;
    };
}

observeElement("#ml-root .ml-list", handleContextMenu);
observeElement(".chat-input-area .ck-editor", initializeResponseArea);

/**
 * 设置窗口创建时的初始化
 * @param {HTMLElement} view - 设置窗口的HTML元素
 */
export const onSettingWindowCreated = async (view) => {
    try {
        const html_file_path = `local:///${PLUGIN_PATH}/src/settings.html`;

        view.innerHTML = await (await fetch(html_file_path)).text();
        const settings = await gpt_reply.getSettings();

        const openai_api_key = view.querySelector("#openai-api-key");
        const chat_model = view.querySelectorAll('input[name="chat-model"]');
        const custom_chat_model = view.querySelector("#custom-chat-model");
        const system_message = view.querySelector("#system-message");

        const keep_memory = view.querySelector("#keep-memory");

        // 设置默认值
        const keep_memory_setting = view.querySelector("#keep-memory-settings");
        if (settings.enableRemote) {
            keep_memory.setAttribute("is-active", "");
            keep_memory_setting.style.display = "block";
        } else {
            keep_memory.removeAttribute("is-active");
            keep_memory_setting.style.display = "none";
        }
        keep_memory.addEventListener("click", (event) => {
            const isActive = event.currentTarget.hasAttribute("is-active");
            if (isActive) {
                event.currentTarget.removeAttribute("is-active");
                settings.enableRemote = false;
                keep_memory_setting.style.display = "none";
            } else {
                event.currentTarget.setAttribute("is-active", "");
                settings.enableRemote = true;
                keep_memory_setting.style.display = "block";
            }
            gpt_reply.setSettings(settings);
        });

        openai_api_key.value = settings.openai_api_key;
        system_message.value = settings.system_message;

        if (
            settings.model !== "gpt-3.5-turbo" &&
            settings.model !== "gpt-4o"
        ) {
            custom_chat_model.value = settings.model;
        }

        chat_model.forEach((radio) => {
            if (
                radio.value === settings.model ||
                (radio.value === "custom" &&
                    settings.model !== "gpt-3.5-turbo" &&
                    settings.model !== "gpt-4o")
            ) {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });

        chat_model.forEach((radio) => {
            radio.addEventListener("change", async () => {
                if (radio.checked) {
                    if (radio.value === "custom") {
                        settings.model = custom_chat_model.value;
                    } else {
                        settings.model = radio.value;
                    }
                    await gpt_reply.setSettings(settings);
                }
            });
        });

        custom_chat_model.addEventListener("input", async () => {
            const customRadio = view.querySelector(
                'input[name="chat-model"][value="custom"]'
            );
            if (customRadio.checked) {
                settings.model = custom_chat_model.value;
                await gpt_reply.setSettings(settings);
            }
        });

        openai_api_key.addEventListener("input", async () => {
            settings.openai_api_key = openai_api_key.value;
            await gpt_reply.setSettings(settings);
        });

        system_message.addEventListener("input", async () => {
            settings.system_message = system_message.value;
            await gpt_reply.setSettings(settings);
        });

        const githubLink = view.querySelector("#settings-github-link");
        githubLink.addEventListener("click", () => {
            gpt_reply.openWeb(
                "https://github.com/wangyz1999/LiteLoaderQQNT-GPT-Reply"
            );
        });
    } catch (error) {
        console.error("[设置页面错误]", error);
    }
};
