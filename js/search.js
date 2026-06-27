/*
==========================================================
SEARCH.JS
==========================================================
*/

let selectedSong = null;

function initSearch() {

    const input = document.getElementById("searchInput");

    input.addEventListener("input", () => {
        searchSongs(input.value);
    });

    searchSongs("");

}

function searchSongs(text) {

    text = text.trim().toLowerCase();

    const songs = getUniqueSongs();

    let results;

    if (text === "") {
        results = songs;
    } else {
        results = songs.filter(song => songMatchesSearch(song, text));
    }

    renderSearchResults(results);

}

function renderSearchResults(results) {

    const container = document.getElementById("searchResults");
    const current = getSelectedSong();

    container.innerHTML = "";

    if (results.length === 0) {

        container.innerHTML =
            `<div class="result-item">
                Nenhuma música encontrada.
            </div>`;

        return;

    }

    results.forEach(song => {

        const item = document.createElement("div");

        const isSelected = current &&
            current["Song Title"] === song["Song Title"] &&
            current["Artist Name"] === song["Artist Name"];

        item.className = "result-item" + (isSelected ? " selected" : "");

        item.innerHTML = `
            <div class="result-title">
                ${highlight(song["Song Title"])}
            </div>
            <div class="result-artist">
                ${highlight(song["Artist Name"])}
            </div>
            <div class="result-styles">
                ${getSongStyles(song).map(s =>
                    `<span class="style-chip">${formatStyleLabel(s)}</span>`
                ).join("")}
            </div>
            <div class="result-info">
                ${song.Key || "—"}
                • ${Math.round(song.BPM * 10) / 10} BPM
                • ${song.Year}
            </div>
        `;

        item.addEventListener("click", () => {

            setSelectedSong(song);
            clearFilters();
            clearTraitFilters();
            clearBpmAdjustment();
            clearScreen3Filters();
            openFilterScreen();

        });

        container.appendChild(item);

    });

}

function clearFilters() {

    document.querySelectorAll(".filters input")
        .forEach(cb => cb.checked = false);

    clearTraitFilters();

}

function highlight(text) {

    const value = document
        .getElementById("searchInput")
        .value
        .trim();

    if (value === "")
        return text;

    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return text.replace(
        new RegExp("(" + escaped + ")", "gi"),
        "<mark>$1</mark>"
    );

}

function getSelectedSong() {
    return selectedSong;
}

function setSelectedSong(song) {
    selectedSong = song;
    updateSelectedSongBanner();
}
