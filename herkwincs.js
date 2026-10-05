/* =========================================================
   BASIC SETTINGS
========================================================= */

const correctPassword = "04032009";


/* =========================================================
   SPOTIFY PRELOADED LETTERS
========================================================= */

let preloadedLetters = [];

try {
  const preloadedElement =
    document.getElementById("preloadedData");

  if (preloadedElement) {
    const parsed =
      JSON.parse(preloadedElement.textContent || "[]");

    if (Array.isArray(parsed)) {
      preloadedLetters = parsed;
    }
  }
} catch (error) {
  console.error("Could not read preloaded letters:", error);
}


/* =========================================================
   LOAD LOCAL LETTERS
========================================================= */

let storedLetters = [];

try {
  storedLetters =
    JSON.parse(
      localStorage.getItem("lettersForHer")
    ) || [];
} catch (error) {
  storedLetters = [];
}


/*
  Published website:
  use letters embedded inside index.html.

  Writer/local development:
  use localStorage if there are no
  preloaded letters yet.
*/

let letters =
  preloadedLetters.length > 0
    ? preloadedLetters
    : storedLetters;


let selectedLetter = null;

let previousPage = "memories";

let spotifyController = null;

let spotifyApiReady = false;


/* =========================================================
   START WEBSITE
========================================================= */

startWebsite();


function startWebsite() {

  if (window.location.hash === "#write") {

    document
      .getElementById("writerPage")
      .classList
      .remove("hidden");

    updateLetterCount();

  } else {

    document
      .getElementById("lockPage")
      .classList
      .remove("hidden");

  }


  const passwordInput =
    document.getElementById("password");


  if (passwordInput) {

    passwordInput.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Enter") {
          unlockWebsite();
        }

      }
    );

  }

}


/* =========================================================
   ADD LETTER
========================================================= */

function addLetter() {

  const title =
    document
      .getElementById("letterTitle")
      .value
      .trim();


  const message =
    document
      .getElementById("letterMessage")
      .value
      .trim();


  const band =
    document
      .getElementById("bandName")
      .value;


  const song =
    document
      .getElementById("songTitle")
      .value
      .trim();


  const spotifyLink =
    document
      .getElementById("spotifyLink")
      .value
      .trim();


  if (
    !title ||
    !message ||
    !band ||
    !song ||
    !spotifyLink
  ) {

    alert(
      "Please complete the title, message, artist, song title, and Spotify link."
    );

    return;
  }


  const validSpotifyLink =
    normalizeSpotifyLink(spotifyLink);


  if (!validSpotifyLink) {

    alert(
      "Please paste a valid Spotify song link, such as https://open.spotify.com/track/..."
    );

    return;
  }


  const dateAdded =
    new Date().toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );


  const newLetter = {

    title: title,

    message: message,

    band: band,

    song: song,

    spotifyLink: validSpotifyLink,

    dateAdded: dateAdded

  };


  letters.unshift(newLetter);


  /*
    Save locally so the writer can continue
    working on the same browser.
  */

  localStorage.setItem(
    "lettersForHer",
    JSON.stringify(letters)
  );


  /* Clear fields */

  document
    .getElementById("letterTitle")
    .value = "";


  document
    .getElementById("letterMessage")
    .value = "";


  document
    .getElementById("bandName")
    .value = "Chase Atlantic";


  document
    .getElementById("songTitle")
    .value = "";


  document
    .getElementById("spotifyLink")
    .value = "";


  updateLetterCount();


  alert(
    "Your letter was saved ♡"
  );

}


/* =========================================================
   SPOTIFY LINK VALIDATION
========================================================= */

function normalizeSpotifyLink(value) {

  try {

    const url =
      new URL(value);


    const hostname =
      url.hostname.toLowerCase();


    const isSpotify =
      hostname === "open.spotify.com" ||
      hostname === "spotify.com" ||
      hostname.endsWith(".spotify.com");


    if (
      url.protocol !== "https:" ||
      !isSpotify
    ) {

      return "";

    }


    return url.href;

  } catch (error) {

    return "";

  }

}


/* =========================================================
   LETTER COUNT
========================================================= */

function updateLetterCount() {

  const countText =
    letters.length === 1
      ? "letter"
      : "letters";


  const countElement =
    document.getElementById("letterCount");


  if (countElement) {

    countElement.textContent =
      "You have " +
      letters.length +
      " " +
      countText +
      " saved.";

  }

}


/* =========================================================
   PREVIEW
========================================================= */

function showPreview() {

  if (letters.length === 0) {

    alert(
      "Add at least one letter first."
    );

    return;
  }


  document
    .getElementById("writerPage")
    .classList
    .add("hidden");


  document
    .getElementById("lockPage")
    .classList
    .remove("hidden");

}


/* =========================================================
   UNLOCK
========================================================= */

function unlockWebsite() {

  const password =
    document
      .getElementById("password")
      .value;


  if (password === correctPassword) {

    document
      .getElementById("lockPage")
      .classList
      .add("hidden");


    document
      .getElementById("memoriesPage")
      .classList
      .remove("hidden");


    document
      .getElementById("error")
      .textContent = "";


    renderEnvelopes();

  } else {

    document
      .getElementById("error")
      .textContent =
        "Not quite. Try the date that began your story.";

  }

}


/* =========================================================
   RENDER ENVELOPES
========================================================= */

function renderEnvelopes() {

  const envelopeGrid =
    document
      .getElementById("envelopeGrid");


  envelopeGrid.innerHTML = "";


  letters.forEach(
    function (letter, index) {

      const button =
        document.createElement("button");


      button.className =
        "envelope";


      button.type =
        "button";


      button.onclick =
        function () {

          openLetter(
            index,
            "memories"
          );

        };


      button.innerHTML = `

        <span class="envelope-icon">
          ✉
        </span>

        <span class="envelope-title">
          letter no.
          ${String(index + 1).padStart(2, "0")}
        </span>

        <span class="envelope-subtitle">
          ${escapeHTML(letter.title)}
        </span>

      `;


      envelopeGrid.appendChild(button);

    }
  );

}


/* =========================================================
   OPEN ARCHIVE
========================================================= */

function openArchive() {

  document
    .getElementById("memoriesPage")
    .classList
    .add("hidden");


  document
    .getElementById("archivePage")
    .classList
    .remove("hidden");


  document
    .getElementById("searchInput")
    .value = "";


  renderArchive();

}


/* =========================================================
   RENDER ARCHIVE
========================================================= */

function renderArchive() {

  const searchText =
    document
      .getElementById("searchInput")
      .value
      .toLowerCase()
      .trim();


  const archiveList =
    document
      .getElementById("archiveList");


  const filteredLetters =
    letters.filter(
      function (letter) {

        const searchableText = (

          letter.title +
          " " +
          letter.message +
          " " +
          letter.band +
          " " +
          letter.song +
          " " +
          letter.dateAdded

        ).toLowerCase();


        return searchableText.includes(
          searchText
        );

      }
    );


  archiveList.innerHTML = "";


  if (filteredLetters.length === 0) {

    archiveList.innerHTML =
      '<p class="empty-text">No letters matched that search.</p>';

    return;
  }


  filteredLetters.forEach(
    function (letter) {

      const actualIndex =
        letters.indexOf(letter);


      const archiveButton =
        document.createElement("button");


      archiveButton.className =
        "archive-item";


      archiveButton.type =
        "button";


      archiveButton.onclick =
        function () {

          openLetter(
            actualIndex,
            "archive"
          );

        };


      archiveButton.innerHTML = `

        <span class="archive-title">
          ✉ ${escapeHTML(letter.title)}
        </span>

        <span class="archive-info">
          ${escapeHTML(letter.song)}
          —
          ${escapeHTML(letter.band)}
        </span>

        <span class="archive-info">
          saved on
          ${escapeHTML(letter.dateAdded)}
        </span>

      `;


      archiveList.appendChild(
        archiveButton
      );

    }
  );

}


/* =========================================================
   OPEN LETTER
========================================================= */

function openLetter(
  index,
  sourcePage
) {

  selectedLetter =
    letters[index];


  previousPage =
    sourcePage;


  pauseSpotify();


  document
    .getElementById("memoriesPage")
    .classList
    .add("hidden");


  document
    .getElementById("archivePage")
    .classList
    .add("hidden");


  document
    .getElementById("notePage")
    .style
    .display = "block";


  document
    .getElementById("openedTitle")
    .textContent =
      "Letter no. " +
      String(index + 1).padStart(2, "0") +
      " — " +
      selectedLetter.title;


  document
    .getElementById("openedDate")
    .textContent =
      "saved on " +
      selectedLetter.dateAdded;


  document
    .getElementById("openedMessage")
    .textContent =
      selectedLetter.message;


  document
    .getElementById("openedSongTitle")
    .textContent =
      "“" +
      selectedLetter.song +
      "” — " +
      selectedLetter.band;


  createSpotifyPlayer(
    selectedLetter.spotifyLink
  );


  window.scrollTo(
    0,
    0
  );

}


/* =========================================================
   CREATE SPOTIFY PLAYER
========================================================= */

function createSpotifyPlayer(
  spotifyLink
) {

  const player =
    document
      .getElementById("spotifyPlayer");


  const message =
    document
      .getElementById("spotifyMessage");


  player.innerHTML = "";


  if (!spotifyLink) {

    message.textContent =
      "No Spotify link was added for this letter.";

    return;
  }


  const trackInfo =
    getSpotifyTrackInfo(
      spotifyLink
    );


  if (!trackInfo) {

    message.textContent =
      "This Spotify link could not be loaded.";

    return;
  }


  if (spotifyApiReady) {

    createSpotifyController(
      trackInfo.url
    );

    message.textContent =
      "Press play and let the song stay with you while you read ♡";

    return;
  }


  createSpotifyFallback(
    spotifyLink
  );


  message.textContent =
    "Press play and let the song stay with you while you read ♡";

}


/* =========================================================
   GET SPOTIFY TRACK INFORMATION
========================================================= */

function getSpotifyTrackInfo(
  spotifyLink
) {

  try {

    const url =
      new URL(spotifyLink);


    const pathParts =
      url.pathname
        .split("/")
        .filter(Boolean);


    const trackIndex =
      pathParts.indexOf("track");


    if (
      trackIndex === -1 ||
      !pathParts[trackIndex + 1]
    ) {

      return null;

    }


    const trackId =
      pathParts[trackIndex + 1];


    return {

      url:
        "https://open.spotify.com/track/" +
        trackId,

      embedUrl:
        "https://open.spotify.com/embed/track/" +
        trackId +
        "?utm_source=generator"

    };

  } catch (error) {

    return null;

  }

}


/* =========================================================
   SPOTIFY API READY
========================================================= */

window.onSpotifyIframeApiReady =
  function (IFrameAPI) {

    spotifyApiReady = true;

    window.spotifyIframeAPI =
      IFrameAPI;

  };


/* =========================================================
   CREATE SPOTIFY CONTROLLER
========================================================= */

function createSpotifyController(
  spotifyUrl
) {

  const player =
    document
      .getElementById("spotifyPlayer");


  player.innerHTML = "";


  if (
    !window.spotifyIframeAPI
  ) {

    createSpotifyFallback(
      spotifyUrl
    );

    return;

  }


  const element =
    document.createElement("div");


  element.id =
    "spotifyEmbed";


  player.appendChild(
    element
  );


  const options = {

    width: "100%",

    height: "152",

    url: spotifyUrl

  };


  window.spotifyIframeAPI.createController(

    element,

    options,

    function (EmbedController) {

      spotifyController =
        EmbedController;


      EmbedController.addListener(
        "ready",
        function () {

          console.log(
            "Spotify player ready."
          );

        }
      );

    }

  );

}


/* =========================================================
   FALLBACK SPOTIFY PLAYER
========================================================= */

function createSpotifyFallback(
  spotifyUrl
) {

  const info =
    getSpotifyTrackInfo(
      spotifyUrl
    );


  if (!info) return;


  const player =
    document
      .getElementById("spotifyPlayer");


  player.innerHTML = "";


  const iframe =
    document.createElement("iframe");


  iframe.src =
    info.embedUrl;


  iframe.width =
    "100%";


  iframe.height =
    "152";


  iframe.frameBorder =
    "0";


  iframe.allow =
    "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";


  iframe.allowFullscreen =
    true;


  iframe.loading =
    "lazy";


  iframe.title =
    "Spotify music player";


  player.appendChild(
    iframe
  );

}


/* =========================================================
   PAUSE SPOTIFY
========================================================= */

function pauseSpotify() {

  if (
    spotifyController &&
    typeof spotifyController.pause === "function"
  ) {

    try {

      spotifyController.pause();

    } catch (error) {

      console.log(
        "Could not pause Spotify:",
        error
      );

    }

  }


  spotifyController = null;

}


/* =========================================================
   BACK FROM LETTER
========================================================= */

function goBackFromLetter() {

  pauseSpotify();


  document
    .getElementById("notePage")
    .style
    .display = "none";


  if (
    previousPage === "archive"
  ) {

    document
      .getElementById("archivePage")
      .classList
      .remove("hidden");

  } else {

    document
      .getElementById("memoriesPage")
      .classList
      .remove("hidden");

  }


  window.scrollTo(
    0,
    0
  );

}


/* =========================================================
   HOME
========================================================= */

function goHome() {

  pauseSpotify();


  document
    .getElementById("archivePage")
    .classList
    .add("hidden");


  document
    .getElementById("notePage")
    .style
    .display = "none";


  document
    .getElementById("memoriesPage")
    .classList
    .remove("hidden");


  renderEnvelopes();


  window.scrollTo(
    0,
    0
  );

}


/* =========================================================
   DELETE ALL LETTERS
========================================================= */

function deleteAllLetters() {

  const confirmed =
    confirm(
      "Are you sure you want to permanently delete all saved letters?"
    );


  if (!confirmed) {
    return;
  }


  letters = [];


  localStorage.removeItem(
    "lettersForHer"
  );


  updateLetterCount();

}


/* =========================================================
   EXPORT FINISHED WEBSITE
========================================================= */

function exportFinishedWebsite() {

  if (letters.length === 0) {

    alert(
      "Add at least one letter before downloading the finished website."
    );

    return;
  }


  /*
    Put the current letters directly
    inside the HTML before exporting.
  */

  const preloadedElement =
    document
      .getElementById("preloadedData");


  if (!preloadedElement) {

    alert(
      "The preloadedData element could not be found in index.html."
    );

    return;
  }


  const originalData =
    preloadedElement.textContent;


  const safeLetters =
    JSON.stringify(letters)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");


  preloadedElement.textContent =
    safeLetters;


  const finalWebsite =
    "<!DOCTYPE html>\n" +
    document.documentElement.outerHTML;


  preloadedElement.textContent =
    originalData;


  const blob =
    new Blob(
      [finalWebsite],
      {
        type: "text/html"
      }
    );


  const downloadURL =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement("a");


  link.href =
    downloadURL;


  link.download =
    "for-her-finished.html";


  document.body.appendChild(
    link
  );


  link.click();


  document.body.removeChild(
    link
  );


  URL.revokeObjectURL(
    downloadURL
  );


  alert(
    "Your finished website was downloaded. Keep for-her-finished.html, herc.css, and herkwincs.js together."
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(text) {

  const temporaryElement =
    document.createElement("div");


  temporaryElement.textContent =
    text ?? "";


  return temporaryElement.innerHTML;

}
