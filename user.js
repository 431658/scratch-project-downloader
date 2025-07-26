// ==UserScript==
// @name         盗作神器pro
// @version      1.1.2
// @description  可以在任何社区盗作的工具
// @match        https://scratch.mit.edu/*
// @match        https://gonfunko.github.io/scratch-gui/*
// @match        https://aerfaying.com/*
// @match        https://www.ccw.site/*
// @match        https://gitblock.cn/*
// @match        https://world.xiaomawang.com/*
// @match        https://www.cocrea.world/*
// @match        https://create.codelab.club/*
// @match        https://addon.codelab.club/*
// @match        https://www.scratch-cn.cn/*
// @match        https://40code.com/*
// @match        https://turbowarp.org/*
// @match        https://codingclip.com/*
// @match        https://editor.turbowarp.cn/*
// @match        https://0832.ink/rc/*
// @match        https://studio.penguinmod.com/*
// @author       不想上学、博士
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    function addStyle(style) {
        const elem = document.createElement("style");
        elem.textContent = style;
        document.documentElement.appendChild(elem);
    }
    // 添加UI样式
    addStyle(`
        #project-toolbar {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 10px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        #project-toolbar button {
            padding: 8px 12px;
            border: none;
            border-radius: 5px;
            background: #4CAF50;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        #project-toolbar button:hover {
            background: #45a049;
        }
        #project-toolbar button.save-sprite {
            background: #2196F3;
        }
        #project-toolbar button.save-sprite:hover {
            background: #0b7dda;
        }
        #project-toolbar button.close-btn {
            background: #f44336;
            margin-top: 5px;
        }
        #project-toolbar button.close-btn:hover {
            background: #d32f2f;
        }
    `);

    const sleep = time => new Promise(resolve => setTimeout(resolve, time));
    function patch(obj, p, fn) {
        if (obj[p]) obj[p] = fn(obj[p]);
    }
    // 获取vm
    let VMdetected = null;
    function trap(resolve, reject) {
        setTimeout(() => reject(new Error("Timeout")), 15000);
        patch(Function.prototype, 'bind', _bind => {
            return function (self2, ...args) {
                if (
                    typeof self2 === 'object' &&
                    self2 !== null &&
                    Object.prototype.hasOwnProperty.call(self2, 'editingTarget') &&
                    Object.prototype.hasOwnProperty.call(self2, 'runtime')
                ) {
                    Function.prototype.bind = _bind;
                    resolve(self2);
                    return _bind.call(this, self2, ...args);
                }
                return _bind.call(this, self2, ...args);
            };
        });
    }
    function checkVM() {
        // 如果有iframe，读取iframe的vm
        if (window.project.vm !== vm) return vm = window.project.vm;
    }
    function download(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = name;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
    }
    console.log("正在获取vm");
    let vm = window.eureka?.vm ? Promise.resolve(eureka.vm) : new Promise(trap);
    vm.then((vm) => {
        console.log(window.eureka?.vm ? "已通过eureka获取vm" : "已获取vm", vm); // 兼容eureka
        // 有些社区(如40code)的作品在iframe里
        if (window.parent?.project) window.parent.project.vm = Promise.resolve(vm);
        VMdetected = vm;
    }).catch((e) => {
        if (!checkVM()) console.log("获取vm失败", e);
    });
    async function saveProject() {
        try {
            checkVM();
            const VMdetected = await vm;
            console.log("正在保存作品");
            let blob = await VMdetected.saveProjectSb3();
            console.log("已保存作品", blob);
            let name = prompt("输入文件名", "Project.sb3");
            if (!name) return;
            download(blob, name);
        }
        catch (e) {
            console.log("错误", e);
            throw e;
        }
    }
    async function saveSprite() {
        try {
            checkVM();
            const VMdetected = await vm;
            console.log("正在保存角色");
            for (let target of VMdetected.runtime.targets) {
                await VMdetected.exportSprite(target.id).then(blob => download(blob, (target.isStage ? "舞台_" : "角色_") + target.getName() + ".sprite3"));
                await sleep(1000);
            }
        }
        catch (e) {
            console.log("错误", e);
            throw e;
        }
    }
    function patchXHR() {
        function modifyData(data) {
            data.body.forEveryone = true;
            data.body.status = "PUBLISHED";
            data.body.isOpenSource = true;
            data.body.sourceOpenLevel = "PUBLIC";
            data.body.title += "(开源)";
            return data;
        }
        patch(window, "XMLHttpRequest", originalXHR => function () {
            const realXHR = new originalXHR();
            const self = this;
            // 重写open方法
            this.open = function (method, url, async, user, password) {
                realXHR.open(...arguments);
            };

            // 重写send方法
            this.send = function (body) {
                realXHR.send(body);
                realXHR.onreadystatechange = function () {
                    if (realXHR.readyState === 4) { // 请求完成
                        if (realXHR.status === 200) { // 成功响应
                            // 修改响应数据
                            self.responseText = (
                                realXHR.__sentry_xhr__.url = "https://community-web.ccw.site/creation/detail" ?
                                    JSON.stringify(
                                        modifyData(JSON.parse(realXHR.responseText))
                                    ) :
                                    realXHR.responseText
                            );
                            // 触发onload事件（如果有的话）
                            if (self.onload) {
                                self.onload();
                            }
                        }
                    }
                };
            };
            return this;
        });
    }
    // 创建UI界面
    function createUI() {
        // 检查是否已存在工具栏
        if (document.getElementById('project-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.id = 'project-toolbar';
        toolbar.style.display = 'none';

        const saveProjectBtn = document.createElement('button');
        saveProjectBtn.textContent = '保存作品';
        saveProjectBtn.onclick = saveProject;

        const saveSpriteBtn = document.createElement('button');
        saveSpriteBtn.textContent = '保存所有角色';
        saveSpriteBtn.className = 'save-sprite';
        saveSpriteBtn.onclick = saveSprite;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭工具栏';
        closeBtn.className = 'close-btn';
        closeBtn.onclick = () => {
            toolbar.style.display = 'none';
            openButton.style.display = '';
        };

        toolbar.appendChild(saveProjectBtn);
        toolbar.appendChild(saveSpriteBtn);
        toolbar.appendChild(closeBtn);

        document.documentElement.appendChild(toolbar);

        // 添加拖拽功能
        let isDragging = false;
        let offsetX, offsetY;

        toolbar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - toolbar.getBoundingClientRect().left;
            offsetY = e.clientY - toolbar.getBoundingClientRect().top;
            toolbar.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            toolbar.style.left = (e.clientX - offsetX) + 'px';
            toolbar.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            toolbar.style.cursor = 'grab';
        });

        const openButton = document.createElement('div'); // button会被反CSense检查出来
        openButton.style.position = 'fixed';
        openButton.style.bottom = '20px';
        openButton.style.right = '60px';
        openButton.style.zIndex = '9999';
        openButton.style.padding = '10px';
        openButton.style.color = 'white';
        openButton.style.border = 'none';
        openButton.style.cursor = 'pointer';
        openButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)' // Modern shadow;
        openButton.style.width = '50px';
        openButton.style.height = '50px';
        openButton.style.borderRadius = '50%';
        openButton.style.background = '#d3d3d3';
        openButton.textContent = '盗作';
        openButton.addEventListener("mouseover", () => {
            if (openButton.textContent == "错误") return;
            openButton.textContent = VMdetected ? "打开" : "获取vm";
        });
        openButton.addEventListener("mouseleave", () => {
            if (openButton.textContent == "错误") return;
            openButton.textContent = VMdetected ? "盗作" : "稍等";
        });

        // 允许移动按钮
        let isDraggingButton = false;
        openButton.addEventListener('mousedown', e => {
            isDraggingButton = true;
            // 计算鼠标位置与元素左上角的偏移量
            const rect = openButton.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            // 防止文本选中和默认行为
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!isDraggingButton) return;

            // 更新按钮位置
            openButton.style.left = (e.clientX - offsetX) + 'px';
            openButton.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', e => {
            isDraggingButton = false;
        });
        document.documentElement.appendChild(openButton);
        openButton.textContent = "稍等";
        checkVM();
        vm.then(VMdetected => {
            openButton.textContent = "盗作";
            openButton.style.background = 'linear-gradient(45deg, #00ff00, #00ffbd)';
            openButton.addEventListener("click", async () => {
                toolbar.style.display = '';
                openButton.style.display = 'none';
            });
        }).catch(e => {
            openButton.textContent = "错误";
            openButton.style.background = 'linear-gradient(45deg, #ff0000, #ff7600)';
            openButton.addEventListener("click", async () => {
                alert("错误，看控制台");
            });
        });
    }
    window.project = { patch, vm, trap, saveProject, saveSprite, VMdetected, patchXHR };
    createUI();
    // patchXHR();
})();
