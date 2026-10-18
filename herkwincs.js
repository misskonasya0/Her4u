(() => {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================

  const STORAGE_KEY = 'for-you-someday-letters-v1';

  // Change these passwords if you want.
  // These are only a casual access gate, not secure authentication.
  const READER_PASSWORD = '040309';
  const OWNER_PASSWORD = '041509';

  const VIEWS = [
    'lock',
    'home',
    'write',
    'preview',
    'archive',
    'letter'
  ];

  const $ = (id) => document.getElementById(id);

  let letters = loadLetters();
  let draft = null;
  let readerUnlocked = false;
  let ownerMode = false;
  let writerRequested = location.hash === '#write';

  // ==========================================
  // STORAGE
  // ==========================================

  function loadLetters() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );

      if (!Array.isArray(saved)) {
        return [];
      }

      return saved.filter((letter) => (
        letter &&
        typeof letter.id === 'string' &&
        typeof letter.title === 'string' &&
        typeof letter.message === 'string'
      ));
    } catch (error) {
      console.error('Could not load saved letters:', error);
      return [];
    }
  }

  function saveLetters(updatedLetters) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedLetters)
      );

      letters = updatedLetters;
      return true;
    } catch (error) {
      console.error('Could not save letters:', error);
      return false;
    }
  }

  function createId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === 'function'
    ) {
      return window.crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2)
    );
  }

  // ==========================================
  // PAGE NAVIGATION
  // ==========================================

  function showView(viewName) {
    if (!VIEWS.includes(viewName)) {
      return;
    }

    if (!readerUnlocked && viewName !== 'lock') {
      viewName = 'lock';
    }

    if (
      !ownerMode &&
      ['write', 'preview'].includes(viewName)
    ) {
      viewName = 'lock';
    }

    VIEWS.forEach((name) => {
      const section = $(name + '-view');

      if (section) {
        section.hidden = name !== viewName;
      }
    });

    const isLocked = viewName === 'lock';

    document.body.classList.toggle('locked', isLocked);
    document.body.classList.toggle(
      'reader-mode',
      readerUnlocked && !ownerMode
    );

    $('main-nav').hidden = isLocked;

    if (isLocked) {
      $('lock-title').textContent = writerRequested
        ? 'The writing desk.'
        : 'For you, someday.';

      $('lock-description').textContent = writerRequested
        ? 'Enter the writer password to create and manage letters.'
        : 'These letters are tucked away for you. Enter the password to open the memories.';
    }

    if (viewName === 'home') {
      renderEnvelopes();
    }

    if (viewName === 'archive') {
      renderArchive();
    }

    if (viewName === 'write') {
      $('title').focus();
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function openWriter() {
    if (ownerMode && readerUnlocked) {
      showView('write');
      return;
    }

    writerRequested = true;

    // The URL hash can open the writer login directly.
    if (location.hash !== '#write') {
      history.replaceState(
        null,
        '',
        location.pathname + location.search + '#write'
      );
    }

    $('unlock-error').hidden = true;
    $('reader-password').value = '';

    showView('lock');
    $('reader-password').focus();
  }

  // ==========================================
  // PASSWORD FORM
  // ==========================================

  $('unlock-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const passwordInput = $('reader-password');
    const errorMessage = $('unlock-error');

    const enteredPassword = passwordInput.value;
    const expectedPassword = writerRequested
      ? OWNER_PASSWORD
      : READER_PASSWORD;

    if (enteredPassword !== expectedPassword) {
      errorMessage.hidden = false;
      passwordInput.focus();
      passwordInput.select();
      return;
    }

    errorMessage.hidden = true;
    passwordInput.value = '';

    readerUnlocked = true;
    ownerMode = writerRequested;
    writerRequested = false;

    // Remove the special writer URL after successful login.
    if (location.hash === '#write') {
      history.replaceState(
        null,
        '',
        location.pathname + location.search
      );
    }

    document.body.classList.remove('locked');
    document.body.classList.toggle(
      'reader-mode',
      !ownerMode
    );

    $('main-nav').hidden = false;

    showView(ownerMode ? 'write' : 'home');
  });

  // ==========================================
  // GENERAL HELPERS
  // ==========================================

  function createTextElement(tag, text, className = '') {
    const element = document.createElement(tag);

    element.textContent = String(text ?? '');

    if (className) {
      element.className = className;
    }

    return element;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleDateString('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function makeSpotifyTrackId(value) {
    if (!value) {
      return null;
    }

    try {
      const parsedUrl = new URL(value);

      if (
        parsedUrl.protocol !== 'https:' ||
        parsedUrl.hostname !== 'open.spotify.com'
      ) {
        return null;
      }

      const match = parsedUrl.pathname.match(
        /^\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})\/?$/
      );

      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // SONG DISPLAY
  // ==========================================

  function renderSong(container, letter, showPlayer = false) {
    container.replaceChildren();

    const artist = letter.artist || '';
    const songTitle = letter.song_title || '';
    const spotifyLink = letter.spotify_link || '';

    if (!artist && !songTitle && !spotifyLink) {
      return;
    }

    const songLabel = [songTitle, artist]
      .filter(Boolean)
      .join(' — ');

    container.appendChild(
      createTextElement(
        'p',
        songLabel || 'A song for this letter',
        'font-semibold mb-3 break-words'
      )
    );

    const trackId = makeSpotifyTrackId(spotifyLink);

    if (!trackId) {
      if (spotifyLink) {
        container.appendChild(
          createTextElement(
            'p',
            'A valid Spotify track link was not provided.',
            'text-sm'
          )
        );
      }

      return;
    }

    if (showPlayer) {
      const player = document.createElement('iframe');

      player.src =
        'https://open.spotify.com/embed/track/' + trackId;

      player.title =
        'Spotify player for ' + (songTitle || 'this letter');

      player.loading = 'lazy';
      player.allow = 'encrypted-media';
      player.className = 'w-full rounded-xl';
      player.style.height = '152px';
      player.style.border = '0';

      container.appendChild(player);
    }

    const link = document.createElement('a');

    link.href = 'https://open.spotify.com/track/' + trackId;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'inline-block mt-3 underline';
    link.textContent = 'Listen on Spotify ↗';

    container.appendChild(link);
  }

  // ==========================================
  // ENVELOPES
  // ==========================================

  function createEnvelope(letter) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'envelope lift w-full p-5 text-left';

    button.setAttribute(
      'aria-label',
      'Read letter: ' + letter.title
    );

    const label = document.createElement('span');
    label.className = 'envelope-label block p-4 mt-9';

    label.appendChild(
      createTextElement(
        'span',
        letter.title || 'Untitled letter',
        'block font-semibold break-words'
      )
    );

    label.appendChild(
      createTextElement(
        'span',
        formatDate(letter.created_at),
        'sans block mt-1 text-xs'
      )
    );

    button.appendChild(label);

    button.addEventListener('click', () => {
      openLetter(letter.id);
    });

    return button;
  }

  function renderEnvelopes() {
    const container = $('envelope-list');
    const emptyMessage = $('envelope-empty');

    if (!container || !emptyMessage) {
      return;
    }

    const recentLetters = letters
      .slice()
      .reverse()
      .slice(0, 6);

    container.replaceChildren(
      ...recentLetters.map(createEnvelope)
    );

    emptyMessage.hidden = letters.length > 0;
  }

  // ==========================================
  // ARCHIVE AND SEARCH
  // ==========================================

  function renderArchive() {
    const container = $('archive-list');
    const emptyMessage = $('archive-empty');
    const searchInput = $('archive-search');

    if (!container || !emptyMessage || !searchInput) {
      return;
    }

    const query = searchInput.value
      .trim()
      .toLocaleLowerCase();

    const results = letters
      .slice()
      .reverse()
      .filter((letter) => {
        const searchableText = [
          letter.title,
          letter.message,
          letter.artist,
          letter.song_title
        ]
          .map((value) => String(value || ''))
          .join(' ')
          .toLocaleLowerCase();

        return searchableText.includes(query);
      });

    container.replaceChildren(
      ...results.map(createEnvelope)
    );

    emptyMessage.hidden = results.length > 0;
  }

  // ==========================================
  // OPEN A LETTER
  // ==========================================

  function openLetter(id) {
    const letter = letters.find((item) => item.id === id);

    if (!letter) {
      showView('archive');
      return;
    }

    $('letter-title').textContent = letter.title;
    $('letter-message').textContent = letter.message;
    $('letter-date').textContent = formatDate(letter.created_at);

    renderSong($('letter-music'), letter, true);

    showView('letter');
  }

  // ==========================================
  // WRITE AND PREVIEW
  // ==========================================

  $('letter-form').addEventListener('submit', (event) => {
    event.preventDefault();

    if (!ownerMode || !readerUnlocked) {
      showView('lock');
      return;
    }

    const title = $('title').value.trim();
    const message = $('message').value.trim();
    const artist = $('artist').value.trim();
    const songTitle = $('song-title').value.trim();
    const spotifyLink = $('spotify-link').value.trim();

    const errorMessage = $('form-error');

    errorMessage.hidden = true;
    errorMessage.textContent = '';

    if (!title || !message) {
      errorMessage.textContent =
        'Please enter a title and write your letter.';

      errorMessage.hidden = false;
      (!title ? $('title') : $('message')).focus();
      return;
    }

    if (spotifyLink && !makeSpotifyTrackId(spotifyLink)) {
      errorMessage.textContent =
        'Please enter a valid Spotify track link, or leave the field blank.';

      errorMessage.hidden = false;
      $('spotify-link').focus();
      return;
    }

    draft = {
      title,
      message,
      artist,
      song_title: songTitle,
      spotify_link: spotifyLink
    };

    $('preview-title').textContent = draft.title;
    $('preview-message').textContent = draft.message;

    renderSong($('preview-song'), draft, false);

    $('save-error').hidden = true;

    showView('preview');
  });

  // ==========================================
  // SAVE A LETTER
  // ==========================================

  $('save-letter').addEventListener('click', () => {
    if (!ownerMode || !readerUnlocked || !draft) {
      return;
    }

    const newLetter = {
      ...draft,
      id: createId(),
      created_at: new Date().toISOString()
    };

    const updatedLetters = [
      ...letters,
      newLetter
    ];

    const errorMessage = $('save-error');

    if (!saveLetters(updatedLetters)) {
      errorMessage.textContent =
        'Your letter could not be saved. Your draft is still here. Please try again.';

      errorMessage.hidden = false;
      return;
    }

    errorMessage.hidden = true;
    draft = null;

    $('letter-form').reset();
    $('archive-status').textContent = '';

    showView('home');
  });

  // ==========================================
  // DOWNLOAD LETTERS AS HTML
  // ==========================================

  function downloadLetters() {
    if (!ownerMode || !readerUnlocked) {
      return;
    }

    const safeJson = JSON.stringify(letters)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    const exportedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>For You, Someday — Letters</title>
<style>
body {
  margin: 0;
  padding: 0;
  background: #fffaf7;
  color: #26372e;
  font: 18px Georgia, serif;
}
main {
  max-width: 760px;
  margin: auto;
  padding: 48px 22px;
}
h1 {
  font-size: clamp(2rem, 6vw, 4rem);
}
article {
  background: #fffefa;
  border: 1px solid #e8dedf;
  border-radius: 18px;
  padding: 28px;
  margin: 24px 0;
  box-shadow: 0 12px 28px #25263512;
}
.message {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
}
small {
  color: #68786d;
}
a {
  color: #397a54;
}
</style>
</head>
<body>
<main>
  <h1>For You, Someday</h1>
  <p>A little collection of letters, kept close.</p>
  <div id="letters"></div>
</main>
<script id="letter-data" type="application/json">${safeJson}<\/script>
<script>
(() => {
  const data = JSON.parse(
    document.getElementById('letter-data').textContent
  );

  const root = document.getElementById('letters');

  for (const letter of data) {
    const article = document.createElement('article');
    const heading = document.createElement('h2');
    const date = document.createElement('small');
    const message = document.createElement('p');

    heading.textContent = letter.title || 'Untitled letter';

    const parsedDate = new Date(letter.created_at);

    date.textContent = Number.isNaN(parsedDate.getTime())
      ? ''
      : parsedDate.toLocaleDateString();

    message.className = 'message';
    message.textContent = letter.message || '';

    article.append(heading, date, message);

    if (letter.song_title || letter.artist) {
      const song = document.createElement('p');

      song.textContent = [
        letter.song_title,
        letter.artist
      ].filter(Boolean).join(' — ');

      article.appendChild(song);
    }

    try {
      const url = new URL(letter.spotify_link || '');
      const match = url.pathname.match(
        /^\\/(?:intl-[a-z]{2}\\/)?track\\/([A-Za-z0-9]{22})\\/?$/
      );

      if (
        url.protocol === 'https:' &&
        url.hostname === 'open.spotify.com' &&
        match
      ) {
        const link = document.createElement('a');

        link.href =
          'https://open.spotify.com/track/' + match[1];

        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Listen on Spotify ↗';

        article.appendChild(link);
      }
    } catch {}

    root.appendChild(article);
  }
})();
<\/script>
</body>
</html>`;

    const file = new Blob(
      [exportedHtml],
      { type: 'text/html;charset=utf-8' }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'for-you-someday-letters.html';

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 30000);

    $('archive-status').textContent =
      'Your letters have been downloaded as an HTML keepsake.';
  }

  // ==========================================
  // DELETE LETTERS
  // ==========================================

  $('delete-all-button').addEventListener('click', () => {
    if (!ownerMode || !readerUnlocked) {
      return;
    }

    $('delete-confirmation').hidden = false;
    $('confirm-delete').focus();
  });

  $('cancel-delete').addEventListener('click', () => {
    $('delete-confirmation').hidden = true;
    $('delete-all-button').focus();
  });

  $('confirm-delete').addEventListener('click', () => {
    if (!ownerMode || !readerUnlocked) {
      return;
    }

    const status = $('archive-status');

    try {
      localStorage.removeItem(STORAGE_KEY);

      letters = [];
      draft = null;

      $('delete-confirmation').hidden = true;
      status.textContent =
        'All letters were deleted from this browser.';

      renderArchive();
      renderEnvelopes();

      $('delete-all-button').focus();
    } catch (error) {
      console.error('Could not delete letters:', error);

      status.textContent =
        'The letters could not be deleted. Please try again.';
    }
  });

  // ==========================================
  // BUTTON EVENTS
  // ==========================================

  $('brand-home').addEventListener('click', () => {
    if (readerUnlocked) {
      showView('home');
    } else {
      showView('lock');
    }
  });

  $('nav-home').addEventListener('click', () => {
    showView('home');
  });

  $('letter-home').addEventListener('click', () => {
    showView('home');
  });

  $('nav-write').addEventListener('click', openWriter);
  $('hero-write').addEventListener('click', openWriter);

  $('nav-archive').addEventListener('click', () => {
    showView('archive');
  });

  $('back-to-archive').addEventListener('click', () => {
    showView('archive');
  });

  $('writer-cancel').addEventListener('click', () => {
    draft = null;

    $('letter-form').reset();
    $('form-error').hidden = true;
    $('save-error').hidden = true;

    showView('home');
  });

  $('edit-letter').addEventListener('click', () => {
    showView('write');
  });

  $('archive-search').addEventListener('input', renderArchive);

  $('download-button').addEventListener('click', () => {
    if (!ownerMode || !readerUnlocked) {
      $('archive-status').textContent =
        'Only the writer can download the letter collection.';
      return;
    }

    downloadLetters();
  });

  // ==========================================
  // INITIALIZE
  // ==========================================

  if (writerRequested) {
    document.body.classList.add('locked');
    showView('lock');
  } else {
    document.body.classList.add('locked');
    showView('lock');
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
})();
