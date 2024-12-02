# LiteLoaderQQNT-GPT-Reply

简体中文 | [English](./README.en.md)

[LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT) 插件，直接在 QQNT 使用 ChatGPT 回复消息

> [!NOTE]  
> 2.0 更新添加了 DuckDuckGo 免费模型， 并且添加了 `系统提示词` 预设  

## 功能描述

支持 **右键回复** 和 **消息框内回复**

支持 **自定义API接口**，和 **自选模型编号**。只要是遵循OpenAI API格式的第三方API都可以用此设定使用，如 [DeepSeek](https://www.deepseek.com/)，[OpenRouter](https://openrouter.ai/)，[V3 API](https://api.v3.cm/) 等 （教程看下面）

支持 **自定义系统提示词** 

支持 [OpenAI 模型](https://platform.openai.com/docs/models/models) 和 [DuckDuckGo AI Chat 模型](https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1)

## 功能展示

### 设置界面
<img src="./res/demo/settings.jpg" alt="设置界面" width="600"/>

### 消息框模式
<img src="./res/demo/chat_mode.gif" alt="消息框模式" width="600"/>

### 右键模式
<img src="./res/demo/right_click_mode.gif" alt="右键模式" width="600"/>

### 自定义多种预设提示词
<img src="./res/demo/presets.gif" alt="右键模式" width="600"/>

### 在设置界面中开启`右键菜单预设`可以在右键菜单中选择预设提示词
<img src="./res/demo/right-click-presets.gif" alt="右键模式" width="600"/>

## 安装

请确保你已经安装了 LiteLoaderQQNT 并且能正常运作 -> [LightLoaderQQNT安装教程](https://liteloaderqqnt.github.io/guide/install.html)
-   前往本仓库 [Release](https://github.com/wangyz1999/LiteLoaderQQNT-GPT-Reply/releases) 下载最新版的插件压缩包
-   将从本仓库 Release 中下载的压缩包解压至 LiteLoaderQQNT 的插件目录中
-   启动或重启 QQNT

## 使用方法

-   两种方法设置 OpenAI API 密钥。网上一堆教程：[官方英文教程](https://platform.openai.com/docs/quickstart/step-2-set-up-your-api-key)
    1. 设置系统环境变量`OPENAI_API_KEY`。设置里的 API 密钥可以留为空（推荐）
    2. 复制 API 密钥到插件设置中，然后重启
-   在设置 `系统提示词` 中定义你想要 GPT 怎么回复
-   右键消息选`GPT`回复，或在消息框内输入提示词然后点击 GPT 图标
-   在设置界面中开启`右键菜单预设`，可以在右键菜单中选择预设提示词

### 使用第三方API如 DeepSeek，OpenRouter 等
- 去 DeepSeek 或 OpenRouter 注册账号，获取并设置 API 密钥
- 在设置界面中模型选择`自定义`，然后输入模型编号，比如 `deepseek-chat`
- 在设置界面中API接口选择`自定义`，然后输入API接口，比如 `https://api.deepseek.com`
- **注意：** 有的API接口会带版本号，请查阅开发手册 [#10](https://github.com/wangyz1999/LiteLoaderQQNT-GPT-Reply/issues/10)

## 鸣谢

-   [LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT/)
-   UI 参考[LiteLoaderQQNT-DeepL](https://github.com/MUKAPP/LiteLoaderQQNT-DeepL/tree/main)
