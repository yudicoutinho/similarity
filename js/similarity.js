/*
==========================================================
SIMILARITY.JS
==========================================================
*/

const BPM_RANGES = {
    up1:   { minOffset: 10,  maxOffset: 15  },
    up2:   { minOffset: 15,  maxOffset: 20  },
    down1: { minOffset: -15, maxOffset: -10 },
    down2: { minOffset: -20, maxOffset: -15 }
};

function getBpmRange(baseBpm, adjustment) {

    if (!adjustment || !BPM_RANGES[adjustment])
        return null;

    const range = BPM_RANGES[adjustment];

    return {
        min: baseBpm + range.minOffset,
        max: baseBpm + range.maxOffset
    };

}

function mergeFilters(screen2, screen3) {

    return {
        artist: screen2.artist || screen3.artist,
        style:  screen2.style  || screen3.style,
        bpm:    screen2.bpm    || screen3.bpm,
        year:   screen2.year   || screen3.year,
        key:    screen2.key    || screen3.key
    };

}

function resolveTargetStyles(baseSong, traitFilters, filters) {

    if (traitFilters?.styles?.size > 0)
        return [...traitFilters.styles];

    if (filters.style)
        return getSongStyles(baseSong);

    return getSongStyles(baseSong);

}

function resolveTargetArtists(baseSong, traitFilters, filters) {

    const targets = new Set();

    if (traitFilters?.artists?.size > 0) {
        traitFilters.artists.forEach(token => targets.add(token));
    } else if (filters.artist) {
        extractArtistTokens(baseSong["Artist Name"]).forEach(token => targets.add(token));
    }

    return targets;

}

function findSimilarSongs(baseSong, screen2Filters, bpmAdjustment, screen3Filters, traitFilters) {

    const songs = getAllSongs();
    const filters = mergeFilters(screen2Filters, screen3Filters || {});
    const traits = traitFilters || { styles: new Set(), artists: new Set() };
    const bpmRange = getBpmRange(baseSong.BPM, bpmAdjustment);
    const targetStyles = resolveTargetStyles(baseSong, traits, filters);
    const targetArtists = resolveTargetArtists(baseSong, traits, filters);
    const styleFilterActive = filters.style || traits.styles.size > 0;
    const artistFilterActive = targetArtists.size > 0;
    const results = new Map();

    songs.forEach(song => {

        if (getSongId(song) === getSongId(baseSong)) {
            return;
        }

        if (artistFilterActive && !songMatchesArtistTokens(song, targetArtists)) {
            return;
        }

        const matchedStyles = getMatchedStyles(song, targetStyles);
        const sharedStyles = matchedStyles.length > 0
            ? matchedStyles
            : getMatchedStyles(song, getSongStyles(baseSong));

        if (styleFilterActive && matchedStyles.length === 0) {
            return;
        }

        const styleSim = getCrossStyleSimilarity(baseSong, song);

        if (
            styleSim === 0 &&
            !artistFilterActive &&
            !styleFilterActive &&
            !bpmRange
        ) {
            return;
        }

        if (bpmRange) {
            if (song.BPM < bpmRange.min || song.BPM > bpmRange.max)
                return;
        }

        const sharesArtist = artistFilterActive
            ? songMatchesArtistTokens(song, targetArtists)
            : artistsShareMember(baseSong["Artist Name"], song["Artist Name"]);

        const result = calculateSimilarity(
            baseSong,
            song,
            filters,
            styleSim,
            sharedStyles,
            matchedStyles,
            bpmRange,
            sharesArtist,
            styleFilterActive,
            artistFilterActive
        );

        if (result.similarity > 0) {

            const id = getSongId(song);
            const existing = results.get(id);

            const entry = {
                ...song,
                allStyles: getSongStyles(song),
                similarity: result.similarity,
                reasons: result.reasons
            };

            if (!existing || existing.similarity < result.similarity) {
                results.set(id, entry);
            }

        }

    });

    const list = [...results.values()];

    list.sort((a, b) => b.similarity - a.similarity);

    return list;

}

function calculateSimilarity(
    base,
    compare,
    filters,
    styleSim,
    sharedStyles,
    matchedStyles,
    bpmRange,
    sharesArtist,
    styleFilterActive,
    artistFilterActive
) {

    let total = 0;
    let points = 0;
    let reasons = [];

    const stylesForReason = matchedStyles.length > 0
        ? matchedStyles
        : sharedStyles;

    if (stylesForReason.length > 0) {
        reasons.push(
            stylesForReason.length === 1
                ? `Gênero (${formatStyleLabel(stylesForReason[0])})`
                : `Gêneros (${stylesForReason.map(formatStyleLabel).join(", ")})`
        );
    } else if (styleSim === 100) {
        reasons.push("Mesmo gênero");
    } else if (styleSim > 0) {
        reasons.push(`Gênero similar (${formatSongStyles(compare)})`);
    }

    if (artistFilterActive || filters.artist) {

        total += 20;

        if (sharesArtist) {
            points += 20;
            reasons.push("Mesmo artista");
        }

    }

    if (styleFilterActive) {

        total += 20;

        if (stylesForReason.length > 0) {
            points += 20;
        } else {
            points += (20 * styleSim) / 100;
        }

    }

    if (filters.bpm) {

        total += 20;

        const diff = Math.abs(base.BPM - compare.BPM);

        if (diff <= 15) {
            points += 20 * (1 - diff / 15);
            reasons.push(diff === 0 ? "Mesmo BPM" : `BPM ±${Math.round(diff)}`);
        }

    } else if (bpmRange) {

        total += 20;

        const diff = compare.BPM - base.BPM;
        const sign = diff > 0 ? "+" : "";
        points += 20;
        reasons.push(`BPM ${sign}${Math.round(diff * 10) / 10}`);

    }

    if (filters.year) {

        total += 15;

        const diff = Math.abs(base.Year - compare.Year);

        if (diff <= 15) {
            points += 15 * (1 - diff / 15);
            reasons.push(diff === 0 ? "Mesmo ano" : `Ano ±${diff}`);
        }

    }

    if (filters.key) {

        total += 15;

        if (base.Key === compare.Key) {
            points += 15;
            reasons.push("Mesmo tom");
        } else if (isRelativeKey(base.Key, compare.Key)) {
            points += 15;
            reasons.push(`Tom relativo (${compare.Key})`);
        }

    }

    if (total === 0) {

        if (artistFilterActive && sharesArtist) {
            return {
                similarity: 100,
                reasons: [...new Set(reasons)]
            };
        }

        const baseScore = styleSim >= 100 ? 85 : Math.max(40, styleSim);

        return {
            similarity: baseScore,
            reasons: [...new Set(reasons)]
        };

    }

    if (artistFilterActive && sharesArtist && points === 0) {
        return {
            similarity: 0,
            reasons: [...new Set(reasons)]
        };
    }

    return {
        similarity: Math.round(points / total * 100),
        reasons: [...new Set(reasons)]
    };

}

function sortResults(list, column, direction) {

    const dir = direction === "desc" ? -1 : 1;

    list.sort((a, b) => {

        let valA, valB;

        switch (column) {

            case "title":
                valA = a["Song Title"];
                valB = b["Song Title"];
                return valA.localeCompare(valB) * dir;

            case "artist":
                valA = a["Artist Name"];
                valB = b["Artist Name"];
                return valA.localeCompare(valB) * dir;

            case "style":
                valA = formatSongStyles(a);
                valB = formatSongStyles(b);
                return valA.localeCompare(valB) * dir;

            case "key":
                valA = a.Key;
                valB = b.Key;
                return valA.localeCompare(valB) * dir;

            case "bpm":
                return (a.BPM - b.BPM) * dir;

            case "year":
                return (a.Year - b.Year) * dir;

            case "similarity":
            default:
                return (a.similarity - b.similarity) * dir;

        }

    });

    return list;

}

function similarityClass(score) {

    if (score >= 85)
        return "sim-high";

    if (score >= 60)
        return "sim-medium";

    return "sim-low";

}
