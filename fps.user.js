// ==UserScript==
// @name         FPS Counter 
// @namespace    http://tampermonkey.net
// @version      1.0
// @description  FPS counter with graphs, colors, draggable. Press Alt+Ctrl+F to toggle.
// @author       Itz_Krishna AKA Everlasting
// @match        https://minefun.io/*
// @match        https://*.minefun.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=minefun.io
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Settings
    let visible = true;
    let posX = 20, posY = 20;
    let showGraph = true;
    let showBar = true;
    let showMinMax = true;
    let goodColor = '#0ff';
    let mediumColor = '#ffaa44';
    let lowColor = '#ff4444';
    let textColor = '#e0e0ff';
    let borderColor = '#0ff';
    let maxFpsTarget = 240;
    let panelScale = 1;
    let panelOpacity = 0.95;

    try {
        visible = localStorage.getItem('fps_visible') !== 'false';
        posX = parseInt(localStorage.getItem('fps_x')) || 20;
        posY = parseInt(localStorage.getItem('fps_y')) || 20;
        showGraph = localStorage.getItem('fps_graph') !== 'false';
        showBar = localStorage.getItem('fps_bar') !== 'false';
        showMinMax = localStorage.getItem('fps_minmax') !== 'false';
        goodColor = localStorage.getItem('fps_good') || '#0ff';
        mediumColor = localStorage.getItem('fps_medium') || '#ffaa44';
        lowColor = localStorage.getItem('fps_low') || '#ff4444';
        textColor = localStorage.getItem('fps_text') || '#e0e0ff';
        borderColor = localStorage.getItem('fps_border') || '#0ff';
        maxFpsTarget = parseInt(localStorage.getItem('fps_max_target')) || 240;
        panelScale = parseFloat(localStorage.getItem('fps_scale')) || 1;
        panelOpacity = parseFloat(localStorage.getItem('fps_opacity')) || 0.95;
    } catch(e) {}

    let panel = null;
    let settingsModal = null;
    let drag = false, offX = 0, offY = 0;

    // FPS
    let lastTime = performance.now();
    let frames = 0;
    let fps = 60;
    let fpsHistory = [];
    let maxFpsObserved = 0;
    let minFpsObserved = Infinity;
    const historySize = 60;

    function isTyping() {
        const el = document.activeElement;
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }

    function getActiveColor() {
        return fps >= 90 ? goodColor : fps >= 50 ? mediumColor : lowColor;
    }

    function updatePanelStyle() {
        if (!panel) return;
        panel.style.transform = `scale(${panelScale})`;
        panel.style.transformOrigin = 'top left';
        panel.style.background = `rgba(10,10,26,${panelOpacity})`;
    }

    function updateColorsDynamic() {
        if (!panel) return;
        const active = getActiveColor();
        const fpsVal = panel.querySelector('.fps-val');
        const fpsBar = panel.querySelector('.fps-bar');
        const fpsStatus = panel.querySelector('.fps-status');
        const fpsMin = panel.querySelector('.fps-min');
        const fpsMax = panel.querySelector('.fps-max');
        const fpsTime = panel.querySelector('.fps-time');
        if (fpsVal) fpsVal.style.color = active;
        if (fpsBar) fpsBar.style.background = active;
        if (fpsStatus) fpsStatus.style.color = active;
        if (fpsMin) fpsMin.style.color = goodColor;
        if (fpsMax) fpsMax.style.color = goodColor;
        if (fpsTime) fpsTime.style.color = textColor;
        panel.style.borderColor = borderColor;
        panel.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3), 0 0 8px ${borderColor}`;
        const btns = panel.querySelectorAll('.settings-btn, .close-btn');
        btns.forEach(btn => btn.style.color = borderColor);
        updatePanelStyle();
    }

    function redrawGraph() {
        const canvas = panel?.querySelector('.fps-graph');
        if (!canvas || !showGraph) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, w, h);
        if (fpsHistory.length < 2) return;
        const step = w / (fpsHistory.length - 1);
        const maxY = Math.max(maxFpsObserved, 1);
        ctx.beginPath();
        ctx.strokeStyle = getActiveColor();
        ctx.lineWidth = 1.5;
        for (let i = 0; i < fpsHistory.length; i++) {
            let x = i * step;
            let y = h - (Math.min(fpsHistory[i], maxY) / maxY) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function updateDisplay() {
        if (!panel) return;
        const active = getActiveColor();
        const fpsVal = panel.querySelector('.fps-val');
        const fpsBar = panel.querySelector('.fps-bar');
        const fpsStatus = panel.querySelector('.fps-status');
        const fpsMin = panel.querySelector('.fps-min');
        const fpsMax = panel.querySelector('.fps-max');
        const fpsTime = panel.querySelector('.fps-time');

        if (fpsVal) {
            fpsVal.textContent = fps;
            fpsVal.style.color = active;
        }
        if (fpsBar) {
            let percent = Math.min((fps / maxFpsTarget) * 100, 100);
            fpsBar.style.width = percent + '%';
            fpsBar.style.background = active;
        }
        let status = fps >= 90 ? 'EXCELLENT' : fps >= 50 ? 'GOOD' : 'LOW';
        if (fpsStatus) {
            fpsStatus.textContent = status;
            fpsStatus.style.color = active;
        }
        if (fpsTime) {
            let safeFps = Math.max(fps, 1);
            fpsTime.textContent = Math.round(1000 / safeFps) + 'ms';
        }
        if (fpsMin) fpsMin.textContent = minFpsObserved === Infinity ? 0 : minFpsObserved;
        if (fpsMax) fpsMax.textContent = maxFpsObserved;

        redrawGraph();
    }

    function createPanelElement() {
        const div = document.createElement('div');
        div.id = 'fps-panel';
        div.style.cssText = `
            position: fixed; left: ${posX}px; top: ${posY}px;
            background: rgba(10,10,26,${panelOpacity});
            border: 1px solid ${borderColor};
            border-radius: 12px; padding: 8px 12px;
            z-index: 2147483647; cursor: grab;
            font-family: 'Segoe UI', monospace;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 8px ${borderColor};
            display: ${visible ? 'block' : 'none'};
            min-width: 160px; backdrop-filter: blur(4px);
            transform: scale(${panelScale}); transform-origin: top left;
        `;
        div.innerHTML = `
            <div class="drag-area" style="cursor: grab; margin-bottom: 6px;">
                <div style="display: flex; justify-content: flex-end; gap: 6px;">
                    <button class="settings-btn" style="background:none; border:none; color:${borderColor}; cursor:pointer; font-size:12px;">⚙️</button>
                    <button class="close-btn" style="background:none; border:none; color:${borderColor}; cursor:pointer; font-size:14px;">✕</button>
                </div>
            </div>
            <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px;">
                <span class="fps-val" style="font-size: 24px; font-weight: bold; color: ${goodColor};">60</span>
                <span style="font-size: 9px; color: ${textColor};">FPS</span>
                ${showMinMax ? `<span style="font-size: 8px; color: ${textColor}; margin-left: auto;">
                    <span class="fps-max" style="color: ${goodColor};">0</span> /
                    <span class="fps-min" style="color: ${lowColor};">999</span>
                </span>` : ''}
            </div>
            ${showBar ? `<div style="width:100%; height:3px; background:rgba(0,0,0,0.5); border-radius:2px; margin-bottom:6px; overflow:hidden;"><div class="fps-bar" style="width:50%; height:100%; background:${goodColor}; transition:width 0.2s;"></div></div>` : ''}
            ${showGraph ? `<canvas class="fps-graph" width="200" height="30" style="width:100%; height:30px; margin-top:4px; border-radius:3px;"></canvas>` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                <span class="fps-status" style="font-size: 7px; color: ${goodColor};">EXCELLENT</span>
                <span class="fps-time" style="font-size: 7px; color: ${textColor};">0ms</span>
            </div>
        `;
        return div;
    }

    function attachEventsToPanel() {
        const dragArea = panel.querySelector('.drag-area');
        const settingsBtn = panel.querySelector('.settings-btn');
        const closeBtn = panel.querySelector('.close-btn');

        dragArea.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('settings-btn') || e.target.classList.contains('close-btn')) return;
            drag = true;
            const rect = panel.getBoundingClientRect();
            offX = (e.clientX - rect.left) / panelScale;
            offY = (e.clientY - rect.top) / panelScale;
            panel.style.cursor = 'grabbing';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!drag) return;
            let left = e.clientX - offX * panelScale;
            let top = e.clientY - offY * panelScale;
            left = Math.min(Math.max(0, left), window.innerWidth - panel.offsetWidth * panelScale);
            top = Math.min(Math.max(0, top), window.innerHeight - panel.offsetHeight * panelScale);
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (drag) {
                drag = false;
                const rect = panel.getBoundingClientRect();
                posX = rect.left; posY = rect.top;
                localStorage.setItem('fps_x', posX);
                localStorage.setItem('fps_y', posY);
                panel.style.cursor = 'grab';
            }
        });

        closeBtn.onclick = () => {
            visible = false;
            panel.style.display = 'none';
            localStorage.setItem('fps_visible', false);
        };
        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            toggleSettings();
        };
    }

    function rebuildPanel() {
        if (panel) panel.remove();
        panel = createPanelElement();
        document.body.appendChild(panel);
        attachEventsToPanel();
        updateDisplay();
    }

    // UI
    function buildSettingsModal() {
        if (settingsModal) settingsModal.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'fps-backdrop';
        backdrop.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.7); z-index: 2147483647; display: flex;
            align-items: center; justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 320px; max-height: 85vh; background: #0a0a1a;
            border: 1px solid ${borderColor}; border-radius: 20px;
            font-family: 'Segoe UI', system-ui, monospace;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${borderColor};
            backdrop-filter: blur(12px); display: flex; flex-direction: column;
            overflow: hidden;
        `;

        modal.innerHTML = `
            <div style="padding: 14px 18px; background: #05050f; border-bottom: 1px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                <span style="color: ${borderColor}; font-size: 14px; font-weight: bold; letter-spacing: 1px;">⚙️ FPS SETTINGS</span>
                <button id="close-settings" style="background: none; border: none; color: ${borderColor}; font-size: 18px; cursor: pointer; padding: 0 4px;">✕</button>
            </div>
            <div style="padding: 16px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px;">

                <div style="background: #111; border-radius: 10px; padding: 10px 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: ${textColor}; font-size: 11px;">PANEL SIZE</span>
                        <span style="color: ${borderColor}; font-size: 11px; font-weight: bold;" id="size-val">${Math.round(panelScale*100)}%</span>
                    </div>
                    <input type="range" id="fps-scale" min="0.5" max="1.5" step="0.02" value="${panelScale}" style="width:100%; accent-color:${borderColor};">
                </div>

                <div style="background: #111; border-radius: 10px; padding: 10px 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: ${textColor}; font-size: 11px;">PANEL OPACITY</span>
                        <span style="color: ${borderColor}; font-size: 11px; font-weight: bold;" id="opacity-val">${Math.round(panelOpacity*100)}%</span>
                    </div>
                    <input type="range" id="fps-opacity" min="0.3" max="1" step="0.01" value="${panelOpacity}" style="width:100%; accent-color:${borderColor};">
                </div>

                <div style="background: #111; border-radius: 10px; padding: 10px 12px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <div style="flex:1; min-width: 90px;">
                            <div style="color: ${textColor}; font-size: 9px; margin-bottom: 4px;">GOOD (≥90)</div>
                            <input type="color" id="clr-good" value="${goodColor}" style="width:100%; height:32px; background:#1a1a2a; border:1px solid ${borderColor}; border-radius:6px; cursor:pointer;">
                        </div>
                        <div style="flex:1; min-width: 90px;">
                            <div style="color: ${textColor}; font-size: 9px; margin-bottom: 4px;">MEDIUM (50-89)</div>
                            <input type="color" id="clr-medium" value="${mediumColor}" style="width:100%; height:32px; background:#1a1a2a; border:1px solid ${borderColor}; border-radius:6px; cursor:pointer;">
                        </div>
                        <div style="flex:1; min-width: 90px;">
                            <div style="color: ${textColor}; font-size: 9px; margin-bottom: 4px;">LOW (&lt;50)</div>
                            <input type="color" id="clr-low" value="${lowColor}" style="width:100%; height:32px; background:#1a1a2a; border:1px solid ${borderColor}; border-radius:6px; cursor:pointer;">
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <div style="flex:1;">
                            <div style="color: ${textColor}; font-size: 9px; margin-bottom: 4px;">TEXT COLOR</div>
                            <input type="color" id="clr-text" value="${textColor}" style="width:100%; height:32px; background:#1a1a2a; border:1px solid ${borderColor}; border-radius:6px; cursor:pointer;">
                        </div>
                        <div style="flex:1;">
                            <div style="color: ${textColor}; font-size: 9px; margin-bottom: 4px;">BORDER COLOR</div>
                            <input type="color" id="clr-border" value="${borderColor}" style="width:100%; height:32px; background:#1a1a2a; border:1px solid ${borderColor}; border-radius:6px; cursor:pointer;">
                        </div>
                    </div>
                </div>

                <div style="background: #111; border-radius: 10px; padding: 10px 12px;">
                    <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: ${textColor}; font-size: 11px;">SHOW GRAPH</span>
                        <input type="checkbox" id="opt-graph" ${showGraph ? 'checked' : ''} style="width:18px; height:18px; accent-color:${borderColor}; cursor:pointer;">
                    </div>
                    <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: ${textColor}; font-size: 11px;">SHOW BAR</span>
                        <input type="checkbox" id="opt-bar" ${showBar ? 'checked' : ''} style="width:18px; height:18px; accent-color:${borderColor}; cursor:pointer;">
                    </div>
                    <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: ${textColor}; font-size: 11px;">SHOW MIN/MAX</span>
                        <input type="checkbox" id="opt-minmax" ${showMinMax ? 'checked' : ''} style="width:18px; height:18px; accent-color:${borderColor}; cursor:pointer;">
                    </div>
                    <div style="margin-top: 8px;">
                        <div style="color: ${textColor}; font-size: 11px; margin-bottom: 4px;">MAX FPS FOR BAR</div>
                        <input type="number" id="max-fps" value="${maxFpsTarget}" step="10" style="width:100%; background:#1a1a2a; border:1px solid ${borderColor}; border-radius:6px; padding:6px; color:${textColor};">
                    </div>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button id="reset-stats" style="flex:1; background:#1a1a2a; border:1px solid #ff6666; color:#ff6666; border-radius:8px; padding:8px; font-size:11px; cursor:pointer; font-weight:bold;">RESET STATS</button>
                    <button id="reset-position" style="flex:1; background:#1a1a2a; border:1px solid ${borderColor}; color:${borderColor}; border-radius:8px; padding:8px; font-size:11px; cursor:pointer; font-weight:bold;">RESET POS</button>
                </div>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        settingsModal = backdrop;

        function saveAndApply() {
            panelScale = parseFloat(document.getElementById('fps-scale').value);
            panelOpacity = parseFloat(document.getElementById('fps-opacity').value);
            goodColor = document.getElementById('clr-good').value;
            mediumColor = document.getElementById('clr-medium').value;
            lowColor = document.getElementById('clr-low').value;
            textColor = document.getElementById('clr-text').value;
            borderColor = document.getElementById('clr-border').value;
            showGraph = document.getElementById('opt-graph').checked;
            showBar = document.getElementById('opt-bar').checked;
            showMinMax = document.getElementById('opt-minmax').checked;
            maxFpsTarget = parseInt(document.getElementById('max-fps').value) || 240;

            document.getElementById('size-val').textContent = Math.round(panelScale*100) + '%';
            document.getElementById('opacity-val').textContent = Math.round(panelOpacity*100) + '%';

            localStorage.setItem('fps_scale', panelScale);
            localStorage.setItem('fps_opacity', panelOpacity);
            localStorage.setItem('fps_good', goodColor);
            localStorage.setItem('fps_medium', mediumColor);
            localStorage.setItem('fps_low', lowColor);
            localStorage.setItem('fps_text', textColor);
            localStorage.setItem('fps_border', borderColor);
            localStorage.setItem('fps_graph', showGraph);
            localStorage.setItem('fps_bar', showBar);
            localStorage.setItem('fps_minmax', showMinMax);
            localStorage.setItem('fps_max_target', maxFpsTarget);

            updateColorsDynamic();
            if (showGraph) redrawGraph();
            updateDisplay();
        }

        document.getElementById('close-settings').onclick = () => backdrop.remove();
        backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

        document.getElementById('fps-scale').oninput = saveAndApply;
        document.getElementById('fps-opacity').oninput = saveAndApply;
        document.getElementById('clr-good').oninput = saveAndApply;
        document.getElementById('clr-medium').oninput = saveAndApply;
        document.getElementById('clr-low').oninput = saveAndApply;
        document.getElementById('clr-text').oninput = saveAndApply;
        document.getElementById('clr-border').oninput = saveAndApply;
        document.getElementById('opt-graph').onchange = saveAndApply;
        document.getElementById('opt-bar').onchange = saveAndApply;
        document.getElementById('opt-minmax').onchange = saveAndApply;
        document.getElementById('max-fps').onchange = saveAndApply;

        document.getElementById('reset-stats').onclick = () => {
            maxFpsObserved = 0;
            minFpsObserved = Infinity;
            fpsHistory = [];
            updateDisplay();
            if (settingsModal) settingsModal.remove();
        };
        document.getElementById('reset-position').onclick = () => {
            posX = 20; posY = 20;
            panel.style.left = posX + 'px';
            panel.style.top = posY + 'px';
            localStorage.setItem('fps_x', posX);
            localStorage.setItem('fps_y', posY);
            if (settingsModal) settingsModal.remove();
        };
    }

    function toggleSettings() {
        if (settingsModal) { settingsModal.remove(); settingsModal = null; }
        else buildSettingsModal();
    }

    // FPS Monitor
    function startMonitor() {
        function tick(now) {
            frames++;
            if (now >= lastTime + 1000) {
                fps = Math.round((frames * 1000) / (now - lastTime));
                frames = 0;
                lastTime = now;
                fpsHistory.push(fps);
                if (fpsHistory.length > historySize) fpsHistory.shift();
                if (fps > maxFpsObserved) maxFpsObserved = fps;
                if (fps < minFpsObserved) minFpsObserved = fps;
                updateDisplay();
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // Hotkey Alt+Ctrl+F
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.ctrlKey && e.key.toLowerCase() === 'f') {
            if (isTyping()) return;
            e.preventDefault();
            visible = !visible;
            if (panel) panel.style.display = visible ? 'block' : 'none';
            localStorage.setItem('fps_visible', visible);
        }
    });

    rebuildPanel();
    startMonitor();
})();
