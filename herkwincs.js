"use strict";

(() => {
  // Change these passwords to your own.
  const READER_PASSWORD = "040309";
  const OWNER_PASSWORD = "041509";

  const STORAGE_KEY = "for-you-someday-letters-v2";

  const $ = (id) => document.getElementById(id);

  const views = [
    "lock-view",
    "home-view",
    "write-view",
    "preview-view",
    "archive-view",
    "letter-view"
  ];

  let letters = loadLetters();
  let readerUnlocked = false;
  let ownerMode = false;
  let writerRequested = false;
  let draft = null;
  let openedLetterId = null;

  function loadLetters() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved)
        ? saved.filter((item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.message === "string"
          )
        : [];
    } catch {
      return [];
    }
  }

  function persistLetters() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
      return true;
    } catch {
      return false;
    }
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function showView(viewId) {
    if (!views.includes(viewId)) return;

    views.forEach((id) => {
      $(id).hidden = id !== viewId;
    });

    $("main-nav").hidden = !readerUnlocked;
    $("site-footer")?.removeAttribute("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (viewId === "home-view") renderEnvelopes();
    if (viewId === "archive-view") renderArchive();
  }

  function showLock(forWriting = false) {
    writerRequested = forWriting;
    $("lock-title").textContent = forWriting
      ? "A page for the writer."
      : "For you, someday.";

    $("lock-description").textContent = forWriting
      ? "Enter the writer password to create and save a new letter."
      : "These letters are tucked away for you. Enter the password to open the memories.";

    $("reader-password").value = "";
    $("unlock-error").hidden = true;
    showView("lock-view");
    $("reader-password").focus();
  }

  function goHome() {
    if (!readerUnlocked) {
      showLock(false);
      return;
    }

    showView("home-view");
  }

  function openWriter() {
    if (ownerMode) {
      clearForm();
      showView("write-view");
      $("title").focus();
      return;
    }

    showLock(true);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function getSpotifyTrackId(value) {
    if (!value) return null;

    try {
      const url = new URL(value.trim());
      const allowedHosts = [
        "open.spotify.com",
        "www.open.spotify.com"
      ];

      if (!allowedHosts.includes(url.hostname)) return null;

      const match = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?track\/([a-zA-Z0-9]+)\/?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function renderSong(container, letter) {
    container.replaceChildren();

    const hasSong = Boolean(letter.artist || letter.songTitle || letter.spotifyLink);
    if (!hasSong) return;

    const heading = document.createElement("p");
    heading.textContent = "A song to keep with this letter";
    heading.className = "song-heading";
    container.append(heading);

    const details = [letter.songTitle, letter.artist].filter(Boolean).join(" — ");
    if (details) {
      const detail = document.createElement("p");
      detail.textContent = details;
      container.append(detail);
    }

    const trackId = getSpotifyTrackId(letter.spotifyLink);

    if (letter.spotifyLink && trackId) {
      const link = document.createElement("a");
      link.href = `https://open.spotify.com/track/${trackId}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open this song on Spotify ↗";
      container.append(link);

      const iframe = document.createElement("iframe");
      iframe.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
      iframe.title = "Spotify song player";
      iframe.loading = "lazy";
      iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      container.append(iframe);
    } else if (letter.spotifyLink) {
      const note = document.createElement("p");
      note.textContent = "The Spotify link wasn't recognized as a track link.";
      container.append(note);
    }
  }

  function makeLetterCard(letter) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-card";
    button.addEventListener("click", () => openLetter(letter.id));

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✉";

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = letter.title;

    const date = document.createElement("span");
    date.className = "card-date";
    date.textContent = formatDate(letter.createdAt);

    button.append(icon, title, date);

    if (letter.songTitle || letter.artist) {
      const song = document.createElement("span");
      song.className = "card-song";
      song.textContent = [letter.songTitle, letter.artist].filter(Boolean).join(" — ");
      button.append(song);
    }

    return button;
  }

  function renderEnvelopes() {
    const list = $("envelope-list");
    list.replaceChildren();

    const sorted = [...letters].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    sorted.forEach((letter) => list.append(makeLetterCard(letter)));
    $("envelope-empty").hidden = sorted.length > 0;
  }

  function renderArchive() {
    const list = $("archive-list");
    const query = $("archive-search").value.trim().toLowerCase();

    list.replaceChildren();

    const filtered = [...letters]
      .filter((letter) => {
        const searchable = [
          letter.title,
          letter.message,
          letter.artist,
          letter.songTitle
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    filtered.forEach((letter) => list.append(makeLetterCard(letter)));

    $("archive-empty").hidden = filtered.length > 0;
    $("archive-actions").hidden = letters.length === 0;
  }

  function openLetter(id) {
    const letter = letters.find((item) => item.id === id);
    if (!letter) return;

    openedLetterId = id;
    $("letter-title").textContent = letter.title;
    $("letter-date").textContent = formatDate(letter.createdAt);
    $("letter-message").textContent = letter.message;
    renderSong($("letter-music"), letter);
    showView("letter-view");
  }

  function clearForm() {
    $("letter-form").reset();
    $("form-error").hidden = true;
    draft = null;
  }

  function collectDraft() {
    const title = $("title").value.trim();
    const message = $("message").value.trim();
    const artist = $("artist").value.trim();
    const songTitle = $("song-title").value.trim();
    const spotifyLink = $("spotify-link").value.trim();

    if (!title || !message) {
      $("form-error").textContent = "Please add a title and write your letter before previewing.";
      $("form-error").hidden = false;
      return null;
    }

    if (spotifyLink) {
      const trackId = getSpotifyTrackId(spotifyLink);
      if (!trackId) {
        $("form-error").textContent = "Please paste a valid Spotify track link, or leave that field empty.";
        $("form-error").hidden = false;
        $("spotify-link").focus();
        return null;
      }
    }

    $("form-error").hidden = true;

    return {
      id: makeId(),
      title,
      message,
      artist,
      songTitle,
      spotifyLink,
      createdAt: new Date().toISOString()
    };
  }

  function showPreview() {
    if (!ownerMode) {
      showLock(true);
      return;
    }

    const nextDraft = collectDraft();
    if (!nextDraft) return;

    draft = nextDraft;
    $("preview-title").textContent = draft.title;
    $("preview-message").textContent = draft.message;
    renderSong($("preview-song"), draft);
    $("save-error").hidden = true;
    showView("preview-view");
  }

  function saveDraft() {
    if (!ownerMode || !draft) {
      $("save-error").textContent = "Your letter couldn't be saved. Please return to the writing page and try again.";
      $("save-error").hidden = false;
      return;
    }

    letters.push(draft);

    if (!persistLetters()) {
      letters.pop();
      $("save-error").textContent =
        "Your browser couldn't save this letter. Check your browser's storage settings and try again.";
      $("save-error").hidden = false;
      return;
    }

    draft = null;
    clearForm();
    $("archive-status").textContent = "Your letter was saved in this browser.";
    showView("home-view");
  }

  function openArchive() {
    $("archive-search").value = "";
    showView("archive-view");
  }

  function downloadLetters() {
    if (!letters.length) {
      $("archive-status").textContent = "There are no letters to download yet.";
      return;
    }

    const sorted = [...letters].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    const content = sorted.map((letter) => `
      <article class="letter">
        <h2>${escapeHtml(letter.title)}</h2>
        <p class="date">${escapeHtml(formatDate(letter.createdAt))}</p>
        <p class="message">${escapeHtml(letter.message).replace(/\n/g, "<br>")}</p>
        ${letter.songTitle || letter.artist
          ? `<p class="song">${escapeHtml([letter.songTitle, letter.artist].filter(Boolean).join(" — "))}</p>`
          : ""}
        ${letter.spotifyLink
          ? `<p><a href="${escapeHtml(letter.spotifyLink)}" rel="noopener noreferrer">Open song</a></p>`
          : ""}
      </article>
    `).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>For You, Someday — Saved Letters</title>
<style>
body{max-width:760px;margin:40px auto;padding:0 22px;background:#fffaf7;color:#29392f;font-family:Georgia,serif;line-height:1.9}
h1{color:#397a54}h2{color:#397a54}
.letter{margin:35px 0;padding:28px;background:#fffefa;border:1px solid #d9e5d8;border-radius:20px}
.date,.song{font:14px Arial,sans-serif;color:#69756b}
.message{white-space:normal;overflow-wrap:anywhere}
a{color:#397a54}
</style>
</head>
<body>
<h1>For You, Someday</h1>
<p>A saved collection of letters.</p>
${content}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "for-you-someday-letters.html";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    $("archive-status").textContent = "Your download should begin shortly.";
  }

  function deleteAllLetters() {
    const previous = letters;
    letters = [];

    if (!persistLetters()) {
      letters = previous;
      $("archive-status").textContent =
        "Your browser couldn't update storage. No letters were deleted.";
      return;
    }

    $("delete-confirmation").hidden = true;
    $("archive-status").textContent = "All saved letters were deleted from this browser.";
    renderArchive();
  }

  $("unlock-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const entered = $("reader-password").value;

    if (writerRequested) {
      if (entered !== OWNER_PASSWORD) {
        $("unlock-error").textContent = "That isn't the writer password. Please try again.";
        $("unlock-error").hidden = false;
        $("reader-password").select();
        return;
      }

      readerUnlocked = true;
      ownerMode = true;
      writerRequested = false;
      $("unlock-error").hidden = true;
      clearForm();
      showView("write-view");
      $("title").focus();
      return;
    }

    if (entered !== READER_PASSWORD) {
      $("unlock-error").textContent = "That password doesn't open this collection. Please try again.";
      $("unlock-error").hidden = false;
      $("reader-password").select();
      return;
    }

    readerUnlocked = true;
    $("unlock-error").hidden = true;
    showView("home-view");
  });

  $("brand-home").addEventListener("click", goHome);
  $("nav-home").addEventListener("click", goHome);
  $("hero-write").addEventListener("click", openWriter);
  $("nav-write").addEventListener("click", openWriter);
  $("nav-archive").addEventListener("click", openArchive);

  $("letter-form").addEventListener("submit", (event) => {
    event.preventDefault();
    showPreview();
  });

  $("writer-cancel").addEventListener("click", () => {
    clearForm();
    goHome();
  });

  $("edit-letter").addEventListener("click", () => {
    showView("write-view");
    $("title").focus();
  });

  $("save-letter").addEventListener("click", saveDraft);

  $("archive-search").addEventListener("input", renderArchive);

  $("back-to-archive").addEventListener("click", openArchive);
  $("letter-home").addEventListener("click", goHome);

  $("download-button").addEventListener("click", downloadLetters);

  $("delete-all-button").addEventListener("click", () => {
    $("delete-confirmation").hidden = false;
  });

  $("cancel-delete").addEventListener("click", () => {
    $("delete-confirmation").hidden = true;
  });

  $("confirm-delete").addEventListener("click", deleteAllLetters);

  // Start on the password screen every time the page is loaded.
  showView("lock-view");
})();
