const plugin_path = LiteLoader.plugins["gpt_reply"].path.plugin;

function log(...args) {
    console.log(`[GPT-Reply]`, ...args);
}

function observeElement(selector, callback, continuous = false) {
    let elementExists = false;
    const timer = setInterval(() => {
        const element = document.querySelector(selector);
        if (element && !elementExists) {
            elementExists = true;
            callback();
            log("Detected", selector);
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
            system_message: "System",
            prompt: text,
            model: settings.model,
        });
        callback({ code: 200, data: response });
    } catch (error) {
        log("[回复错误]", error);
        callback({
            code: -1,
            message: error.message,
        });
    }
}

function barIcon(
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
    fetch(`local:///${plugin_path}/${iconPath}`)
        .then((response) => response.text())
        .then((data) => {
            icon.innerHTML = data;
        });

    return barIcon;
}


let chatTranslating = false;
let messageEl;
let appended = true;

function getMessageElement(target) {
    if (target.matches(".msg-content-container")) {
        return target;
    }
    return target.closest(".msg-content-container");
}

observeElement("#ml-root .ml-list", function () {
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
            log("右键菜单弹出", qContextMenu);
            log(messageEl.querySelector(".message-content").innerText);
            if (!messageEl.querySelector(".message-content").innerText) return;

            let firstMenuItem = document.querySelector('.q-context-menu .q-context-menu-item');
            let clonedMenuItem = firstMenuItem.cloneNode(true);
            let textSpan = clonedMenuItem.querySelector('span');
            textSpan.innerText = "GPT";
            let qIcon = clonedMenuItem.querySelector('.q-icon');
            const iconPath = "res/openai_tooltip.svg";
            fetch(`local:///${plugin_path}/${iconPath}`)
            .then((response) => response.text())
            .then((data) => {
                qIcon.innerHTML = data;
            });

            clonedMenuItem.addEventListener("click", () => {
                const text = messageEl.querySelector(".message-content").innerText;
                showGPTResponse(text);
            });
            
            let separator = document.querySelector('.q-context-menu .q-context-menu-separator');
            qContextMenu.insertBefore(clonedMenuItem, separator);
            appended = true;
        }
        
    }).observe(document.body, { childList: true });
});

function initializeResponseArea() {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `local:///${plugin_path}/src/style.css`;
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
        log("Copy button clicked");
        navigator.clipboard.writeText(gptResponseText.innerText).then(
            () => log("Copy successful"),
            () => log("Copy failed")
        );
        hideGPTResponse();
    });

    document.querySelector("#gpt-reply-cancel-button").addEventListener("click", () => {
        log("Cancel button clicked");
        hideGPTResponse();
    });

    observeElement(
        ".chat-func-bar",
        function () {
            const iconBarLeft =
                document.querySelector(".chat-func-bar").firstElementChild;
            if (iconBarLeft.querySelector(".gpt-reply-bar-icon")) {
                return;
            }

            const baricon = barIcon(
                "res/openai_tooltip.svg",
                "GPT回复",
                async () => {
                    log("点击了GPT回复");

                    const ckContent = document.querySelector(".ck-content");
                    const text = ckContent.innerText.trim();
                    gptResponseText.innerText = text ? "GPT thinking..." : "Please enter content in the chat box";
                    if (text) showGPTResponse(text);
                }
            );

            iconBarLeft.appendChild(baricon);
        },
        true
    ); 
};

function showGPTResponse(text) {
    chatTranslating = true;
    const gptResponse = document.getElementById("gpt-response");
    gptResponse.style.display = "block";
    gptResponse.animate([{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "translateY(0px)" }], {
        duration: 128,
        easing: "ease-out",
    });

    getGPTResponse(text, json => {
        const gptResponseText = document.getElementById("response-text");
        if (json.code === 200 && json.data) {
            gptResponseText.innerText = json.data;
        } else {
            gptResponseText.innerText = "GPT response failed: " + (json.message || "No data received");
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
        chatTranslating = false;
    };
}


observeElement(".chat-input-area .ck-editor", initializeResponseArea);

export const onSettingWindowCreated = async (view) => {
    try {
        const html_file_path = `local:///${plugin_path}/src/settings.html`;

        view.innerHTML = await (await fetch(html_file_path)).text();

        const settings = await gpt_reply.getSettings();

        const openai_api_key = view.querySelector("#openai-api-key");
        const chat_model = view.querySelector("#chat-model");
        openai_api_key.value = settings.openai_api_key;
        chat_model.value = settings.model;

    } catch (error) {
        log("[设置页面错误]", error);
    }
};
