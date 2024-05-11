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

function fetchIcon(iconPath, element) {
    fetch(`local:///${PLUGIN_PATH}/${iconPath}`)
        .then((response) => response.text())
        .then((data) => {
            element.innerHTML = data;
        });
}

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

async function getGPTResponse(text, callback) {
    try {
        const settings = await gpt_reply.getSettings();
        const response = await gpt_reply.getGPTReply({
            system_message: settings.system_message,
            prompt: text,
            model: settings.model,
        });
        callback({ code: 200, data: response });
    } catch (error) {
        log("[回复错误]", error);
        callback({ code: -1, message: error.message });
    }
}

function createBarIcon(iconPath, innerText, clickEvent, mouseEnterEvent, mouseLeaveEvent) {
    const qTooltips = document.createElement("div");
    const qTooltipsContent = document.createElement("div");
    const icon = document.createElement("i");
    const barIcon = document.createElement("div");

    barIcon.classList.add("gpt-reply-bar-icon");
    barIcon.appendChild(qTooltips);

    qTooltips.classList.add("gpt-reply-q-tooltips");
    qTooltips.addEventListener("click", clickEvent);
    if (mouseEnterEvent) barIcon.addEventListener("mouseenter", mouseEnterEvent);
    if (mouseLeaveEvent) barIcon.addEventListener("mouseleave", mouseLeaveEvent);

    qTooltips.appendChild(icon);
    qTooltips.appendChild(qTooltipsContent);

    qTooltipsContent.classList.add("gpt-reply-q-tooltips__content");
    qTooltipsContent.innerText = innerText;

    icon.classList.add("gpt-reply-q-icon");
    fetchIcon(iconPath, icon);

    return barIcon;
}

function getMessageElement(target) {
    if (target.matches(".msg-content-container")) {
        return target;
    }
    return target.closest(".msg-content-container");
}

// 右键GPT回复
function handleContextMenu () {
    document.querySelector("#ml-root .ml-list").addEventListener("mousedown", (e) => {
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
            const messageText = messageEl.querySelector(".message-content").innerText;
            if (!messageText) return;

            let firstMenuItem = document.querySelector('.q-context-menu .q-context-menu-item');
            let clonedMenuItem = firstMenuItem.cloneNode(true);
            clonedMenuItem.querySelector('span').innerText = "GPT";
            fetchIcon(ICON_PATH, clonedMenuItem.querySelector('.q-icon'));

            clonedMenuItem.addEventListener("click", () => {
                qContextMenu.style.display = "none";
                document.getElementById("response-text").innerText = "GPT思考中...";
                showGPTResponse(messageText);
            });

            let separator = document.querySelector('.q-context-menu .q-context-menu-separator');
            qContextMenu.insertBefore(clonedMenuItem, separator);
            appended = true;
        }
        
    }).observe(document.body, { childList: true });
}

// 聊天框GPT回复
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
    document.querySelector("#gpt-reply-copy-button").addEventListener("click", () => {
        navigator.clipboard.writeText(gptResponseText.innerText);
        hideGPTResponse();
    });

    document.querySelector("#gpt-reply-cancel-button").addEventListener("click", () => {
        hideGPTResponse();
    });

    observeElement(".chat-func-bar", () => {
        const iconBarLeft = document.querySelector(".chat-func-bar").firstElementChild;
            if (iconBarLeft.querySelector(".gpt-reply-bar-icon")) return;

            const baricon = createBarIcon(
                ICON_PATH,
                "GPT回复",
                () => {
                    if (gptThinking) return;
                    const text = document.querySelector(".ck-content").innerText.trim();
                    gptResponseText.innerText = text ? "GPT思考中..." : "请在聊天框中输入内容";
                    showGPTResponse(text);
                }
            );

            iconBarLeft.appendChild(baricon);
        },
        true
    ); 
};

// GPT Response Functions
function showGPTResponse(text) {
    gptThinking = true;
    const gptResponse = document.getElementById("gpt-response");
    gptResponse.style.display = "block";
    gptResponse.animate([{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "translateY(0px)" }], {
        duration: 128,
        easing: "ease-out",
    });

    if (!text) {
        document.getElementById("response-text").innerText = "请在聊天框中输入内容";
        return;
    }

    getGPTResponse(text, json => {
        const gptResponseText = document.getElementById("response-text");
        if (json.code === 200 && json.data) {
            gptResponseText.innerText = json.data;
        } else {
            gptResponseText.innerText = "GPT回复失败: " + (json.message || "未接收到回复");
        }
    });
}

function hideGPTResponse() {
    const gptResponse = document.getElementById("gpt-response");
    gptResponse.animate([{ opacity: 1, transform: "translateY(0px)" }, { opacity: 0, transform: "translateY(20px)" }], {
        duration: 128,
        easing: "ease-in",
    }).onfinish = () => {
        gptResponse.style.display = "none";
        gptThinking = false;
    };
}

observeElement("#ml-root .ml-list", handleContextMenu);
observeElement(".chat-input-area .ck-editor", initializeResponseArea);

export const onSettingWindowCreated = async (view) => {
    try {
        const html_file_path = `local:///${PLUGIN_PATH}/src/settings.html`;

        view.innerHTML = await (await fetch(html_file_path)).text();

        const settings = await gpt_reply.getSettings();

        const openai_api_key = view.querySelector("#openai-api-key");
        const chat_model = view.querySelector("#chat-model");
        const custom_chat_model = view.querySelector("#custom-chat-model");
        const system_message = view.querySelector("#system-message");

        openai_api_key.value = settings.openai_api_key;

        if (settings.model !== "gpt-3.5-turbo" && settings.model !== "gpt-4-turbo") {
            custom_chat_model.value = settings.model;
        }

        const radioButtons = document.querySelectorAll('input[name="chat-model"]');
        radioButtons.forEach(radio => {
            if (radio.value === chat_model.value || radio.value === "custom" && settings.model !== "gpt-3.5-turbo" && settings.model !== "gpt-4-turbo") {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });
        system_message.value = settings.system_message;
    } catch (error) {
        log("[设置页面错误]", error);
    }
};
