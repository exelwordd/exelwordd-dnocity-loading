/**
 * ==========================================================================
 *  ДНО-СИТИ // CLEAN MINIMALIST LOADING SCREEN SCRIPT
 * ==========================================================================
 */

(function () {
    'use strict';

    const cfg = window.DNO_CONFIG || {
        slideshowSpeed: 6000,
        defaultOnline: 24,
        defaultMaxPlayers: 64
    };

    // DOM Элементы
    const dom = {
        loadingStatus: document.getElementById('loading-status'),
        loadingPercent: document.getElementById('loading-percent'),
        progressBar: document.getElementById('progress-bar'),
        loadingFile: document.getElementById('loading-file'),
        loadingCount: document.getElementById('loading-count'),
        slides: document.querySelectorAll('.slide'),
        
        playerAvatar: document.getElementById('player-avatar'),
        playerSteamId: document.getElementById('player-steamid'),
        serverOnline: document.getElementById('server-online')
    };

    let totalFiles = 100;
    let neededFiles = 100;
    let downloadedFiles = 0;
    let isGMod = false;
    let maxSlots = cfg.defaultMaxPlayers || 64;
    let currentPlayers = cfg.defaultOnline || 24;

    /* --------------------------------------------------------------------------
       1. СЛАЙДШОУ (Случайная смена скриншотов)
       -------------------------------------------------------------------------- */
    let currentSlide = (window.__INITIAL_SLIDE__ !== undefined) ? window.__INITIAL_SLIDE__ : 0;
    function initSlideshow() {
        if (dom.slides.length <= 1) return;

        // Проверяем, что случайный слайд активен
        if (!dom.slides[currentSlide].classList.contains('active')) {
            dom.slides.forEach(s => s.classList.remove('active'));
            dom.slides[currentSlide].classList.add('active');
        }

        // Случайный переход на следующий кадр без повторений подряд
        setInterval(() => {
            let nextSlide;
            do {
                nextSlide = Math.floor(Math.random() * dom.slides.length);
            } while (nextSlide === currentSlide && dom.slides.length > 1);

            dom.slides[currentSlide].classList.remove('active');
            dom.slides[nextSlide].classList.add('active');
            currentSlide = nextSlide;
        }, cfg.slideshowSpeed || 6000);
    }

    /* --------------------------------------------------------------------------
       2. GARRYS MOD API
       -------------------------------------------------------------------------- */
    window.GameDetails = function (servername, serverurl, mapname, maxplayers, steamid, gamemode, volume, lang) {
        isGMod = true;
        if (maxplayers) {
            maxSlots = maxplayers;
            updateOnlineDisplay();
        }
        if (steamid) {
            applySteamID(steamid);
        }
    };

    window.SetStatusChanged = function (status) {
        isGMod = true;
        if (dom.loadingStatus) {
            dom.loadingStatus.textContent = status.toUpperCase();
        }
    };

    window.DownloadingFile = function (fileName) {
        isGMod = true;
        if (dom.loadingFile) {
            dom.loadingFile.textContent = fileName;
        }
        downloadedFiles++;
        updateProgress();
    };

    window.SetFilesNeeded = function (needed) {
        isGMod = true;
        neededFiles = needed;
        updateProgress();
    };

    window.SetFilesTotal = function (total) {
        isGMod = true;
        totalFiles = Math.max(total, 1);
        updateProgress();
    };

    function updateProgress() {
        let pct = 0;
        if (totalFiles > 0) {
            pct = Math.min(Math.round(((totalFiles - neededFiles) / totalFiles) * 100), 100);
        }
        if (pct === 0 && downloadedFiles > 0) {
            pct = Math.min(Math.round((downloadedFiles / 50) * 100), 95);
        }

        setProgress(pct, `${totalFiles - neededFiles} / ${totalFiles} файлов`);
    }

    function setProgress(pct, countText) {
        if (dom.progressBar) dom.progressBar.style.width = `${pct}%`;
        if (dom.loadingPercent) dom.loadingPercent.textContent = `${pct}%`;
        if (countText && dom.loadingCount) dom.loadingCount.textContent = countText;
    }

    function updateOnlineDisplay() {
        if (dom.serverOnline) {
            dom.serverOnline.textContent = `${currentPlayers} / ${maxSlots} игроков онлайн`;
        }
    }

    /* --------------------------------------------------------------------------
       ОБРАБОТКА РЕАЛЬНОГО STEAM ID И АВАТАРКИ ИГРОКА
       -------------------------------------------------------------------------- */
    function applySteamID(steamid) {
        if (!steamid || steamid === "%s") return;

        // Если это 64-битный SteamID (начинается с 7656119...)
        if (/^\d{17}$/.test(steamid)) {
            // Конвертируем в формат STEAM_0:X:Y для красивого отображения
            const legacyId = steam64ToLegacy(steamid);
            if (dom.playerSteamId) dom.playerSteamId.textContent = legacyId || steamid;
            fetchSteamAvatar(steamid);
        } else if (steamid.startsWith("STEAM_")) {
            if (dom.playerSteamId) dom.playerSteamId.textContent = steamid;
            const steam64 = legacyToSteam64(steamid);
            if (steam64) fetchSteamAvatar(steam64);
        } else {
            if (dom.playerSteamId) dom.playerSteamId.textContent = steamid;
        }
    }

    // Загрузка реальной аватарки заходящего игрока из Steam
    function fetchSteamAvatar(steam64) {
        if (!dom.playerAvatar) return;

        // Публичный Steam XML профиля
        const profileXmlUrl = `https://steamcommunity.com/profiles/${steam64}/?xml=1`;
        
        // Пробуем запросить через быстрый CORS-прокси
        fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(profileXmlUrl)}`)
            .then(res => res.text())
            .then(xmlStr => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
                const avatarFull = xmlDoc.querySelector("avatarFull");
                if (avatarFull && avatarFull.textContent) {
                    dom.playerAvatar.src = avatarFull.textContent;
                }
            })
            .catch(() => {
                // Если нет интернета или ошибка CORS, аватарка остается аккуратной по умолчанию
            });
    }

    // Конвертер 64-bit SteamID в классический STEAM_0:X:Y
    function steam64ToLegacy(steam64Str) {
        try {
            const base = BigInt("76561197960265728");
            const idNum = BigInt(steam64Str);
            const diff = idNum - base;
            if (diff < 0n) return null;
            const y = diff % 2n;
            const z = (diff - y) / 2n;
            return `STEAM_0:${y}:${z}`;
        } catch (e) {
            return null;
        }
    }

    // Конвертер классического STEAM_0:Y:Z в 64-bit SteamID
    function legacyToSteam64(legacyStr) {
        try {
            const parts = legacyStr.split(":");
            if (parts.length < 3) return null;
            const y = BigInt(parts[1]);
            const z = BigInt(parts[2]);
            const base = BigInt("76561197960265728");
            return (base + (z * 2n) + y).toString();
        } catch (e) {
            return null;
        }
    }

    /* --------------------------------------------------------------------------
       3. ПАРСИНГ URL (?steamid=%s&mapname=%m)
       -------------------------------------------------------------------------- */
    function parseURLParams() {
        const params = new URLSearchParams(window.location.search);
        const steamid = params.get('steamid');
        if (steamid && steamid !== "%s") {
            applySteamID(steamid);
        }
    }

    /* --------------------------------------------------------------------------
       4. ДЕМО РЕЖИМ (При открытии в обычном браузере для проверки)
       -------------------------------------------------------------------------- */
    function initBrowserDemo() {
        updateOnlineDisplay();
        parseURLParams();

        setTimeout(() => {
            if (isGMod) return;

            const demoFiles = [
                "models/weapons/v_knife.mdl",
                "materials/models/player/dno_citizen.vtf",
                "sound/homigrad/ambience.mp3",
                "maps/rp_bloc42_v2.bsp",
                "lua/autorun/homigrad_init.lua",
                "materials/zcity/hud.png",
                "models/props_junk/wood_crate001a.mdl"
            ];

            const demoStatuses = [
                "ПОДКЛЮЧЕНИЕ К СЕРВЕРУ...",
                "СИНХРОНИЗАЦИЯ РЕСУРСОВ...",
                "ПРОВЕРКА ФАЙЛОВ КЛИЕНТА...",
                "ЗАГРУЗКА ТЕКСТУР И КАРТЫ...",
                "ИНИЦИАЛИЗАЦИЯ МИРА...",
                "ВХОД В ИГРУ..."
            ];

            let demoPct = 5;
            let fileIdx = 0;

            const demoInterval = setInterval(() => {
                if (isGMod) {
                    clearInterval(demoInterval);
                    return;
                }

                demoPct += Math.floor(Math.random() * 9) + 4;
                if (demoPct > 100) demoPct = 100;

                fileIdx = (fileIdx + 1) % demoFiles.length;
                const statusIdx = Math.min(Math.floor((demoPct / 100) * demoStatuses.length), demoStatuses.length - 1);

                if (dom.loadingStatus) dom.loadingStatus.textContent = demoStatuses[statusIdx];
                if (dom.loadingFile) dom.loadingFile.textContent = demoFiles[fileIdx];
                setProgress(demoPct, `${Math.round(demoPct * 0.7)} / 70`);

                if (demoPct >= 100) {
                    clearInterval(demoInterval);
                    if (dom.loadingStatus) dom.loadingStatus.textContent = "ДОБРО ПОЖАЛОВАТЬ НА ДНО-СИТИ!";
                    if (dom.loadingFile) dom.loadingFile.textContent = "Все ресурсы загружены";
                }
            }, 600);
        }, 1000);
    }

    window.addEventListener('DOMContentLoaded', () => {
        initSlideshow();
        initBrowserDemo();
    });

})();
