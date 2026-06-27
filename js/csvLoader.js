/*
==========================================================
CSV LOADER
==========================================================
*/

let allSongs = [];

async function loadCSVText() {

    try {

        const response = await fetch("data/musicas.csv");

        if (response.ok)
            return await response.text();

    } catch (e) {
        console.warn("Fetch falhou, tentando cache offline...", e);
    }

    if ("caches" in window) {

        const cache = await caches.open("music-finder-v2");
        const cached = await cache.match("data/musicas.csv");

        if (cached)
            return await cached.text();

        const cachedAlt = await cache.match("./data/musicas.csv");

        if (cachedAlt)
            return await cachedAlt.text();

    }

    throw new Error("CSV não disponível offline");

}

async function loadCSV() {

    const text = await loadCSVText();

    allSongs = parseCSV(text);

    allSongs.forEach(song => {
        song.Style = (song.Style || "").trim();
    });

    buildStyleSimilarity(allSongs);

    console.log(`${allSongs.length} músicas carregadas.`);

}

function parseCSV(csvText) {

    const lines = csvText.trim().split(/\r?\n/);

    const headers = parseCSVLine(lines[0]);

    const songs = [];

    for (let i = 1; i < lines.length; i++) {

        if (lines[i].trim() === "")
            continue;

        const values = parseCSVLine(lines[i]);

        const song = {};

        headers.forEach((header, index) => {
            song[header] = (values[index] || "").trim();
        });

        song.BPM = Number(song.BPM);
        song.Year = Number(song.Year);

        songs.push(song);

    }

    return songs;

}

function parseCSVLine(line) {

    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;

}

function getAllSongs() {
    return allSongs;
}

function normalizeSearchText(text) {

    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

}

function getSongId(song) {

    return normalizeSearchText(song["Song Title"]) +
        "|" +
        normalizeSearchText(song["Artist Name"]);

}

function normalizeArtistField(artistName) {

    return (artistName || "")
        .replace(/\uFF06/g, "&")
        .replace(/\s*&\s*/g, " & ")
        .replace(/\s+/g, " ")
        .trim();

}

function extractArtistTokens(artistName) {

    const tokens = [];

    artistName = normalizeArtistField(artistName);

    const parenMatches = artistName.match(/\(([^)]+)\)/g) || [];

    parenMatches.forEach(match => {

        const token = normalizeSearchText(match.replace(/[()]/g, ""));

        if (token.length >= 2)
            tokens.push(token);

    });

    artistName
        .replace(/\([^)]*\)/g, " ")
        .split(/\s*(?:&|,|\bfeat\.?\b|\bft\.?\b|\bx\b|\bwith\b|\be\b)\s*/i)
        .forEach(part => {

            const token = normalizeSearchText(part);

            if (token.length >= 2)
                tokens.push(token);

        });

    return [...new Set(tokens)];

}

function artistsShareMember(artistA, artistB) {

    const normA = normalizeSearchText(normalizeArtistField(artistA));
    const normB = normalizeSearchText(normalizeArtistField(artistB));

    if (normA === normB)
        return true;

    const tokensA = extractArtistTokens(artistA);
    const tokensB = extractArtistTokens(artistB);

    if (tokensA.some(a => tokensB.some(b => a === b)))
        return true;

    return tokensA.some(token => normB.includes(token)) ||
        tokensB.some(token => normA.includes(token));

}
function artistMatchesQuery(artistName, query) {

    const normalizedQuery = normalizeSearchText(query);

    if (normalizedQuery === "")
        return true;

    const normArtist = normalizeSearchText(normalizeArtistField(artistName));

    if (normArtist.includes(normalizedQuery))
        return true;

    return extractArtistTokens(artistName).some(token =>
        token.includes(normalizedQuery) ||
        normalizedQuery.includes(token)
    );

}

function songMatchesSearch(song, text) {

    const query = normalizeSearchText(text);

    if (query === "")
        return true;

    return (
        normalizeSearchText(song["Song Title"]).includes(query) ||
        artistMatchesQuery(song["Artist Name"], text) ||
        normalizeSearchText(song.Style).includes(query) ||
        normalizeSearchText(song.Key).includes(query) ||
        String(song.BPM).includes(query) ||
        String(song.Year).includes(query)
    );

}

function getUniqueSongs() {

    const map = new Map();

    allSongs.forEach(song => {

        const key = getSongId(song);

        if (!map.has(key)) {
            map.set(key, song);
        }

    });

    return [...map.values()];

}

function formatStyleLabel(style) {

    if (!style)
        return "";

    return style
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

}

function formatSongStyles(song) {

    return getSongStyles(song)
        .map(formatStyleLabel)
        .join(", ");

}

function formatArtistToken(token) {

    return token
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

}

function songMatchesArtistTokens(song, targetTokens) {

    if (!targetTokens || targetTokens.size === 0)
        return true;

    const songTokens = extractArtistTokens(song["Artist Name"]);
    const normArtist = normalizeSearchText(normalizeArtistField(song["Artist Name"]));

    return [...targetTokens].some(target =>
        songTokens.some(st => st === target) ||
        normArtist.includes(target)
    );

}

function songMatchesStyleTargets(song, targetStyles) {

    if (!targetStyles || targetStyles.length === 0)
        return true;

    const songStyles = getSongStyles(song);

    return targetStyles.some(style => songStyles.includes(style));

}

function getMatchedStyles(song, targetStyles) {

    const songStyles = getSongStyles(song);

    return targetStyles.filter(style => songStyles.includes(style));

}
