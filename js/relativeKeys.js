/*
==========================================================
RELATIVE KEYS
==========================================================
*/

const relativeKeys = {

    "C":  ["C", "Am", "F", "G", "Em", "Dm"],

    "Db": ["Db", "Bbm", "Gb", "Ab", "Fm", "Ebm"],
    "C#": ["C#", "A#m", "F#", "G#", "Fm", "D#m"],

    "D":  ["D", "Bm", "G", "A", "Em", "F#m"],

    "Eb": ["Eb", "Cm", "Ab", "Bb", "Gm", "Fm"],
    "D#": ["D#", "Cm", "G#", "A#", "Gm", "Fm"],

    "E":  ["E", "C#m", "A", "B", "F#m", "G#m"],

    "F":  ["F", "Dm", "Bb", "C", "Am", "Gm"],

    "Gb": ["Gb", "Ebm", "Cb", "Db", "Abm", "Bbm"],
    "F#": ["F#", "D#m", "B", "C#", "G#m", "A#m"],

    "G":  ["G", "Em", "C", "D", "Am", "Bm"],

    "Ab": ["Ab", "Fm", "Db", "Eb", "Bbm", "Cm"],
    "G#": ["G#", "Fm", "C#", "D#", "A#m", "Cm"],

    "A":  ["A", "F#m", "D", "E", "Bm", "C#m"],

    "Bb": ["Bb", "Gm", "Eb", "F", "Cm", "Dm"],
    "A#": ["A#", "Gm", "D#", "F", "Cm", "Dm"],

    "B":  ["B", "G#m", "E", "F#", "C#m", "D#m"],

    "Cb": ["Cb", "Abm", "Gb", "Ab", "Ebm", "Bbm"]

};


/*
==========================================================
Retorna todos os tons aceitos
==========================================================
*/

function getRelativeKeys(key){

    if(!key)
        return [];

    key = key.trim();

    if(relativeKeys[key])
        return relativeKeys[key];

    for(const family of Object.values(relativeKeys)){

        if(family.includes(key))
            return family;

    }

    return [key];

}


/*
==========================================================
Verifica se dois tons são compatíveis
==========================================================
*/

function isRelativeKey(baseKey, compareKey){

    if(!baseKey || !compareKey)
        return false;

    baseKey = baseKey.trim();
    compareKey = compareKey.trim();

    if(baseKey === compareKey)
        return true;

    for(const family of Object.values(relativeKeys)){

        if(family.includes(baseKey) && family.includes(compareKey))
            return true;

    }

    return false;

}
