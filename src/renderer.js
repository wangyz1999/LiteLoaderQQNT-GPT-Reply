const plugin_path = LiteLoader.plugins["gpt_reply"].path.plugin;

function log(...args) {
    console.log(`[GPT-Reply]`, ...args);
}

function observeElement(selector, callback, continuous = false) {
    let elementExists = false;
    try {
        const timer = setInterval(function () {
            const element = document.querySelector(selector);
            if (element && !elementExists) {
                elementExists = true;
                callback();
                log("已检测到", selector);
            } else if (!element) {
                elementExists = false;
            }
            if (element && !continuous) {
                clearInterval(timer);
            }
        }, 100);
    } catch (error) {
        log("[检测元素错误]", error);
    }
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
        if (appended) {
            return;
        }
        const qContextMenu = document.querySelector(".q-context-menu");
        if (qContextMenu && messageEl) {
            log("右键菜单弹出", qContextMenu);
            log(messageEl.querySelector(".message-content").innerText);
            if (!messageEl.querySelector(".message-content").innerText) {
                return;
            }
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
            let separator = document.querySelector('.q-context-menu .q-context-menu-separator');
            qContextMenu.insertBefore(clonedMenuItem, separator);
            appended = true;
        }
        
    }).observe(document.querySelector("body"), { childList: true });
});


observeElement(".chat-input-area .ck-editor", function () {
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

    function showgptResponse() {
        chatTranslating = true;
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
    }

    function hidegptResponse() {
        gptResponse.animate(
            [
                { opacity: 1, transform: "translateY(0px)" },
                { opacity: 0, transform: "translateY(20px)" },
            ],
            {
                duration: 128,
                easing: "ease-in",
            }
        ).onfinish = function () {
            gptResponse.style.display = "none";
            chatTranslating = false;
        };
    }

    let ckEditor = document.querySelector(".ck-editor");
    ckEditor.appendChild(gptResponse);

    let ckContent = document.querySelector(".ck-content");

    let copyButton = document.querySelector("#gpt-reply-copy-button");
    let cancelButton = document.querySelector("#gpt-reply-cancel-button");
    let gptResponseText = document.querySelector("#response-text");

    const clipboardObj = navigator.clipboard;
    function copygptResponseText() {
        clipboardObj.writeText(gptResponseText.innerText).then(
            function () {
                log("复制成功");
            },
            function () {
                log("复制失败");
            }
        );
    }

    copyButton.addEventListener("click", function () {
        log("点击了复制按钮");
        copygptResponseText();
        hidegptResponse();
    });

    cancelButton.addEventListener("click", function () {
        log("点击了取消按钮");
        hidegptResponse();
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

                    showgptResponse();

                    console.log(ckContent);
                    const ckContentIsEmpty = ckContent.innerText.trim() === "";

                    console.log(ckContentIsEmpty);
                    gptResponseText.innerText = ckContentIsEmpty
                        ? "请先在聊天框输入内容"
                        : "GPT思考中...";

                    if (ckContentIsEmpty) {
                        return;
                    }

                    const content = document.querySelector(
                        ".ck-editor__editable"
                    );

                    const text = content.innerText;
                    const settings = await gpt_reply.getSettings();
                    const model = settings.model;

                    getGPTResponse(text, function (json) {
                        console.log(json);
                        if (json.code === 200) {
                            const result = json.data;
                            if (result) {
                                gptResponseText.innerText = result;
                            } else {
                                gptResponseText.innerText =
                                    "GPT回复失败， 回复结果为空";
                            }
                        } else {
                            gptResponseText.innerText =
                                "回复失败：" + json.message;
                        }
                    });
                }
            );

            iconBarLeft.appendChild(baricon);
        },
        true
    ); 
});


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
