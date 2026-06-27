/*
==========================================================
UI.JS
==========================================================
*/

let countdown = null;
let seconds = 7;
let countdownEnabled = true;
let bpmAdjustment = null;
let screen3Filters = {
    artist: false,
    style: false,
    key: false,
    bpm: false,
    year: false
};
let traitFilters = {
    styles: new Set(),
    artists: new Set()
};
let currentResults = [];
let sortColumn = "similarity";
let sortDirection = "desc";

function initUI() {

    document.getElementById("btnCompare")
        .addEventListener("click", executeSimilarity);

    document.getElementById("btnHome1")
        .addEventListener("click", goHome);

    document.getElementById("btnHome2")
        .addEventListener("click", goHome);

    const countdownToggleButton = document.getElementById("countdownToggleButton");
    const countdownToggleButton2 = document.getElementById("countdownToggleButton2");

    const syncCountdownButtons = () => {
        [countdownToggleButton, countdownToggleButton2].forEach(btn => {
            if (!btn) return;
            btn.classList.toggle("active", countdownEnabled);
            btn.textContent = countdownEnabled
                ? "Busca automática: ligado"
                : "Busca automática: desligado";
        });
    };

    if (countdownToggleButton || countdownToggleButton2) {
        countdownEnabled = (countdownToggleButton?.classList.contains("active") ?? true) ||
            (countdownToggleButton2?.classList.contains("active") ?? false);

        [countdownToggleButton, countdownToggleButton2].forEach(btn => {
            if (!btn) return;
            btn.addEventListener("click", () => {
                countdownEnabled = !countdownEnabled;
                syncCountdownButtons();

                if (countdownEnabled) {
                    startCountdown();
                } else {
                    stopCountdown();
                }
            });
        });

        syncCountdownButtons();
    }

    document.querySelectorAll(".bpm-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            const value = btn.dataset.bpm;

            if (bpmAdjustment === value) {
                bpmAdjustment = null;
                btn.classList.remove("active");
            } else {
                bpmAdjustment = value;
                document.querySelectorAll(".bpm-btn")
                    .forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            }

        });

    });

    document.querySelectorAll(".filter-toggle").forEach(btn => {

        btn.addEventListener("click", () => {

            const filter = btn.dataset.filter;
            const song = getSelectedSong();

            screen3Filters[filter] = !screen3Filters[filter];
            btn.classList.toggle("active", screen3Filters[filter]);

            if (filter === "artist" && song) {

                if (screen3Filters.artist) {
                    extractArtistTokens(song["Artist Name"]).forEach(token => {
                        traitFilters.artists.add(token);
                    });
                } else {
                    traitFilters.artists.clear();
                }

                renderScreen3Traits();

            }

            refreshResults();

        });

    });

    document.querySelectorAll(".sortable").forEach(th => {

        th.addEventListener("click", () => {

            const col = th.dataset.sort;

            if (sortColumn === col) {
                sortDirection = sortDirection === "asc" ? "desc" : "asc";
            } else {
                sortColumn = col;
                sortDirection = col === "similarity" ? "desc" : "asc";
            }

            updateSortArrows();
            renderResults(currentResults);

        });

    });

}

function getTraitFilters() {

    return {
        styles: new Set(traitFilters.styles),
        artists: new Set(traitFilters.artists)
    };

}

function clearTraitFilters() {

    traitFilters.styles.clear();
    traitFilters.artists.clear();

    document.querySelectorAll(".trait-btn.active")
        .forEach(btn => btn.classList.remove("active"));

}

function toggleTraitSet(setName, value, button) {

    if (traitFilters[setName].has(value)) {
        traitFilters[setName].delete(value);
        button.classList.remove("active");
    } else {
        traitFilters[setName].add(value);
        button.classList.add("active");
    }

}

function updateStyleTraitButtonStates(song, styleContainer) {

    const styles = getSongStyles(song);
    const allSelected = styles.length > 1 && styles.every(style => traitFilters.styles.has(style));
    const allButton = styleContainer.querySelector(".trait-btn-all");

    if (allButton) {
        allButton.classList.toggle("active", allSelected);
    }

    styleContainer.querySelectorAll(".trait-btn-style").forEach(btn => {
        const style = btn.dataset.value;
        btn.classList.toggle("active", traitFilters.styles.has(style));
    });

}

function toggleAllSongStyles(song, button) {

    const styles = getSongStyles(song);
    const allSelected = styles.length > 1 && styles.every(style => traitFilters.styles.has(style));

    if (allSelected) {
        styles.forEach(style => traitFilters.styles.delete(style));
        button.classList.remove("active");
    } else {
        styles.forEach(style => traitFilters.styles.add(style));
        button.classList.add("active");
    }

    document.getElementById("filterStyle").checked = traitFilters.styles.size > 0;

}

function renderTraitButtons() {

    const song = getSelectedSong();
    const panel = document.getElementById("traitFiltersPanel");

    if (!song || !panel) {
        if (panel)
            panel.classList.add("hidden");
        return;
    }

    panel.classList.remove("hidden");

    const styleContainer = document.getElementById("styleTraitButtons");
    const artistContainer = document.getElementById("artistTraitButtons");
    const metaContainer = document.getElementById("metaTraitButtons");

    styleContainer.innerHTML = "";
    artistContainer.innerHTML = "";
    metaContainer.innerHTML = "";

    const songStyles = getSongStyles(song);

    if (songStyles.length > 1) {
        const allBtn = document.createElement("button");

        allBtn.type = "button";
        allBtn.className = "trait-btn trait-btn-all" +
            (songStyles.length > 1 && songStyles.every(style => traitFilters.styles.has(style)) ? " active" : "");
        allBtn.textContent = "Todos";

        allBtn.addEventListener("click", () => {
            toggleAllSongStyles(song, allBtn);
            updateStyleTraitButtonStates(song, styleContainer);
        });

        styleContainer.appendChild(allBtn);
    }

    songStyles.forEach(style => {

        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "trait-btn trait-btn-style" +
            (traitFilters.styles.has(style) ? " active" : "");
        btn.textContent = formatStyleLabel(style);
        btn.dataset.value = style;

        btn.addEventListener("click", () => {
            toggleTraitSet("styles", style, btn);
            updateStyleTraitButtonStates(song, styleContainer);
            document.getElementById("filterStyle").checked =
                traitFilters.styles.size > 0;
        });

        styleContainer.appendChild(btn);

    });

    updateStyleTraitButtonStates(song, styleContainer);

    extractArtistTokens(song["Artist Name"]).forEach(token => {

        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "trait-btn trait-btn-artist" +
            (traitFilters.artists.has(token) ? " active" : "");
        btn.textContent = formatArtistToken(token);
        btn.dataset.value = token;

        btn.addEventListener("click", () => {
            toggleTraitSet("artists", token, btn);
            document.getElementById("filterArtist").checked =
                traitFilters.artists.size > 0;
        });

        artistContainer.appendChild(btn);

    });

    if (song.Key) {

        const keyBtn = document.createElement("button");

        keyBtn.type = "button";
        keyBtn.className = "trait-btn trait-btn-meta" +
            (document.getElementById("filterKey").checked ? " active" : "");
        keyBtn.textContent = `Tom ${song.Key}`;

        keyBtn.addEventListener("click", () => {

            const input = document.getElementById("filterKey");
            input.checked = !input.checked;
            keyBtn.classList.toggle("active", input.checked);

        });

        metaContainer.appendChild(keyBtn);

    }

    if (song.Year) {

        const yearBtn = document.createElement("button");

        yearBtn.type = "button";
        yearBtn.className = "trait-btn trait-btn-meta" +
            (document.getElementById("filterYear").checked ? " active" : "");
        yearBtn.textContent = `Ano ${song.Year}`;

        yearBtn.addEventListener("click", () => {

            const input = document.getElementById("filterYear");
            input.checked = !input.checked;
            yearBtn.classList.toggle("active", input.checked);

        });

        metaContainer.appendChild(yearBtn);

    }

    const bpmBtn = document.createElement("button");

    bpmBtn.type = "button";
    bpmBtn.className = "trait-btn trait-btn-meta" +
        (document.getElementById("filterBPM").checked ? " active" : "");
    bpmBtn.textContent = `BPM ${Math.round(song.BPM)} (±15)`;

    bpmBtn.addEventListener("click", () => {

        const input = document.getElementById("filterBPM");
        input.checked = !input.checked;
        bpmBtn.classList.toggle("active", input.checked);

    });

    metaContainer.appendChild(bpmBtn);

}

function renderScreen3Traits() {

    const song = getSelectedSong();
    const container = document.getElementById("screen3TraitButtons");

    if (!song || !container) {
        if (container)
            container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = "";

    getSongStyles(song).forEach(style => {

        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "trait-btn" +
            (traitFilters.styles.has(style) ? " active" : "");
        btn.textContent = formatStyleLabel(style);

        btn.addEventListener("click", () => {
            toggleTraitSet("styles", style, btn);
            refreshResults();
        });

        container.appendChild(btn);

    });

    extractArtistTokens(song["Artist Name"]).forEach(token => {

        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "trait-btn trait-btn-artist" +
            (traitFilters.artists.has(token) ? " active" : "");
        btn.textContent = formatArtistToken(token);

        btn.addEventListener("click", () => {
            toggleTraitSet("artists", token, btn);
            refreshResults();
        });

        container.appendChild(btn);

    });

}

function showScreen(id) {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    document.getElementById(id).classList.add("active");

}

function updateSelectedSongBanner() {

    const song = getSelectedSong();

    document.querySelectorAll(".selected-banner").forEach(banner => {

        if (!song) {
            banner.classList.add("hidden");
            banner.innerHTML = "";
            return;
        }

        banner.classList.remove("hidden");

        banner.innerHTML = `
            <div class="banner-title">${song["Song Title"]}</div>
        `;

    });

}

function stopCountdown() {

    clearInterval(countdown);
    countdown = null;

    const countdownEl = document.getElementById("countdown");

    if (countdownEl && document.getElementById("screen-filters").classList.contains("active")) {
        countdownEl.textContent = "Contagem regressiva desativada";
    }

}

function startCountdown() {

    clearInterval(countdown);

    if (!countdownEnabled) {
        stopCountdown();
        return;
    }

    if (!document.getElementById("screen-filters").classList.contains("active")) {
        return;
    }

    seconds = 7;

    const countdownEl = document.getElementById("countdown");

    if (countdownEl) {
        countdownEl.innerHTML = `Busca automática em <span id="timer">${seconds}</span>s`;
    }

    countdown = setInterval(() => {
        seconds--;
        const timer = document.getElementById("timer");

        if (timer) {
            timer.textContent = seconds;
        }

        if (seconds <= 0) {
            clearInterval(countdown);
            countdown = null;
            executeSimilarity();
        }
    }, 1000);

}

function openFilterScreen() {

    clearInterval(countdown);
    countdown = null;

    updateSelectedSongBanner();
    renderTraitButtons();
    showScreen("screen-filters");
    startCountdown();

}

function getFilters() {

    const styleFromTraits = traitFilters.styles.size > 0;
    const artistFromTraits = traitFilters.artists.size > 0;

    return {
        artist: document.getElementById("filterArtist").checked || artistFromTraits,
        style: document.getElementById("filterStyle").checked || styleFromTraits,
        bpm: document.getElementById("filterBPM").checked,
        year: document.getElementById("filterYear").checked,
        key: document.getElementById("filterKey").checked
    };

}

function executeSimilarity() {

    clearInterval(countdown);
    countdown = null;

    const baseSong = getSelectedSong();

    if (!baseSong) {
        alert("Selecione uma música.");
        return;
    }

    const filters = getFilters();

    currentResults = findSimilarSongs(
        baseSong,
        filters,
        bpmAdjustment,
        screen3Filters,
        getTraitFilters()
    );

    sortColumn = "similarity";
    sortDirection = "desc";
    updateSortArrows();
    updateSelectedSongBanner();
    syncScreen3FilterButtons();
    renderScreen3Traits();
    renderResults(currentResults);
    showScreen("screen-results");

}

function refreshResults() {

    const baseSong = getSelectedSong();

    if (!baseSong)
        return;

    const filters = getFilters();

    currentResults = findSimilarSongs(
        baseSong,
        filters,
        bpmAdjustment,
        screen3Filters,
        getTraitFilters()
    );

    renderScreen3Traits();
    renderResults(currentResults);

}

function syncScreen3FilterButtons() {

    document.querySelectorAll(".filter-toggle").forEach(btn => {
        const filter = btn.dataset.filter;
        btn.classList.toggle("active", screen3Filters[filter]);
    });

}

function updateSortArrows() {

    document.querySelectorAll(".sortable").forEach(th => {

        const arrow = th.querySelector(".sort-arrow");
        const col = th.dataset.sort;

        if (col === sortColumn) {
            arrow.textContent = sortDirection === "asc" ? " ▲" : " ▼";
            th.classList.add("sorted");
        } else {
            arrow.textContent = "";
            th.classList.remove("sorted");
        }

    });

}

function renderResults(results) {

    const tbody = document.getElementById("resultBody");

    tbody.innerHTML = "";

    if (results.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    Nenhuma música encontrada com os filtros selecionados.
                </td>
            </tr>
        `;

        return;

    }

    const sorted = sortResults([...results], sortColumn, sortDirection);

    sorted.forEach(song => {

        const tr = document.createElement("tr");

        tr.className = similarityClass(song.similarity) + " result-row";

        tr.innerHTML = `
            <td class="percent">
                <strong>${song.similarity}%</strong>
            </td>
            <td>${song["Song Title"]}</td>
            <td>${Math.round(song.BPM * 10) / 10}</td>
            <td>${song.Year}</td>
            <td class="styles-cell">${formatSongStyles(song)}</td>
        `;

        tr.addEventListener("click", () => {

            setSelectedSong(song);
            clearBpmAdjustment();
            openFilterScreen();

        });

        tbody.appendChild(tr);

    });

}

function clearBpmAdjustment() {

    bpmAdjustment = null;

    document.querySelectorAll(".bpm-btn")
        .forEach(btn => btn.classList.remove("active"));

}

function clearScreen3Filters() {

    screen3Filters = {
        artist: false,
        style: false,
        key: false,
        bpm: false,
        year: false
    };

    document.querySelectorAll(".filter-toggle")
        .forEach(btn => btn.classList.remove("active"));

}

function goHome() {

    clearInterval(countdown);

    setSelectedSong(null);
    clearBpmAdjustment();
    clearScreen3Filters();
    clearTraitFilters();
    currentResults = [];

    document.getElementById("searchInput").value = "";
    clearFilters();
    searchSongs("");

    showScreen("screen-search");
    document.getElementById("searchInput").focus();

}
