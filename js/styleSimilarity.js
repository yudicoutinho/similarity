/*
==========================================================
STYLE SIMILARITY
==========================================================
*/

let styleMatrix = {};
let songStyleCache = new Map();

/*
==========================================================
Normaliza texto
==========================================================
*/

function normalizeStyle(style) {

    return (style || "")
        .trim()
        .toLowerCase();

}

function parseStyles(styleStr) {

    return (styleStr || "")
        .split(/[,;/]/)
        .map(part => normalizeStyle(part))
        .filter(Boolean);

}

function getSongStyles(song) {

    const cached = songStyleCache.get(getSongId(song));

    if (cached)
        return [...cached];

    return parseStyles(song.Style);

}

function getSharedStyles(songA, songB) {

    const stylesA = new Set(getSongStyles(songA));
    const stylesB = getSongStyles(songB);

    return stylesB.filter(style => stylesA.has(style));

}

/*
==========================================================
Cria matriz de similaridade
==========================================================
*/

function buildStyleSimilarity(songs) {

    styleMatrix = {};
    songStyleCache = new Map();

    const groups = {};

    /*
    Agrupa estilos por Música + Artista
    */

    songs.forEach(song => {

        const id = getSongId(song);

        if (!groups[id]) {

            groups[id] = new Set();

        }

        parseStyles(song.Style).forEach(style => {
            groups[id].add(style);
        });

        if (!songStyleCache.has(id)) {
            songStyleCache.set(id, new Set());
        }

        parseStyles(song.Style).forEach(style => {
            songStyleCache.get(id).add(style);
        });

    });

    /*
    Conta quantas vezes cada combinação aparece
    */

    const counter = {};

    Object.values(groups).forEach(styles => {

        const list = [...styles];

        list.forEach(a => {

            if (!counter[a]) {

                counter[a] = {};

            }

            list.forEach(b => {

                if (!counter[a][b]) {

                    counter[a][b] = 0;

                }

                counter[a][b]++;

            });

        });

    });

    /*
    Converte em porcentagem
    */

    Object.keys(counter).forEach(a => {

        styleMatrix[a] = {};

        const max = Math.max(...Object.values(counter[a]));

        Object.keys(counter[a]).forEach(b => {

            styleMatrix[a][b] = Math.round(

                counter[a][b] / max * 100

            );

        });

    });

    console.log("Style Matrix criada.");

}

/*
==========================================================
Consulta Similaridade
==========================================================
*/

function getStyleSimilarity(styleA, styleB) {

    styleA = normalizeStyle(styleA);
    styleB = normalizeStyle(styleB);

    if (styleA === styleB)
        return 100;

    if (
        styleMatrix[styleA] &&
        styleMatrix[styleA][styleB]
    ) {

        return styleMatrix[styleA][styleB];

    }

    return 0;

}

function getCrossStyleSimilarity(songA, songB) {

    const stylesA = getSongStyles(songA);
    const stylesB = getSongStyles(songB);

    if (stylesA.length === 0 || stylesB.length === 0)
        return 0;

    if (getSharedStyles(songA, songB).length > 0)
        return 100;

    let maxSim = 0;

    stylesA.forEach(a => {
        stylesB.forEach(b => {
            maxSim = Math.max(maxSim, getStyleSimilarity(a, b));
        });
    });

    return maxSim;

}