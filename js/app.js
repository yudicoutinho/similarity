/*
==========================================================
APP.JS
==========================================================
*/

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./sw.js")
            .then(() => console.log("App pronto para uso offline."))
            .catch(err => console.warn("Service Worker não registrado:", err));

    });

}

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadCSV();

        initSearch();
        initUI();

        showScreen("screen-search");

        const input = document.getElementById("searchInput");

        if (input && !("ontouchstart" in window)) {
            input.focus();
        }

        console.log("Music Similar Finder iniciado.");

    } catch (error) {

        console.error(error);

        alert(
            "Erro ao carregar as músicas. " +
            "Abra o app uma vez com internet para salvar os dados offline."
        );

    }

});
