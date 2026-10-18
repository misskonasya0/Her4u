(() => {
  const KEY = 'for-you-someday-letters-v1';
  const $ = id => document.getElementById(id);
  const views = ['lock', 'home', 'write', 'preview', 'archive', 'letter'];

  const READER_PASSWORD = '040309';
  const OWNER_PASSWORD = '041509';

  let readerUnlocked = false;
  let ownerMode = false;
  let letters = [];
  let draft = null;

  function readLetters() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '[]');

      return Array.isArray(value)
        ? value.filter(item => item && typeof item.id === 'string')
        : [];
    } catch {
      return [];
    }
  }

  letters = readLetters();

  function show(view) {
    if (!ownerMode && !readerUnlocked && view !== 'lock') {
      view = 'lock';
    }

    if (!ownerMode && view === 'write') {
      view = 'lock';
    }

    views.forEach(name => {
      $(name + '-view').hidden = name !== view;
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (view === 'home') renderEnvelopes();
    if (view === 'archive') renderArchive();
  }

  function trackId(url) {
    if (!url) return null;

    try {
      const parsed = new URL(url);

      if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== 'open.spotify.com'
      ) {
        return null;
      }

      const match = parsed.pathname.match(
        /^\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})\/?$/
      );

      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function textNode(tag, text, className) {
    const node = document.createElement(tag);

    node.textContent = text;

    if (className) {
      node.className = className;
    }

    return node;
  }

  function music(target, letter, embed) {
    target.replaceChildren();

    if (!letter.artist && !letter.song_title && !letter.spotify_link) {
      return;
    }

    const label = [letter.song_title, letter.artist]
      .filter(Boolean)
      .join(' — ');

    target.appendChild(
      textNode('p', label || 'A song for this letter', 'font-semibold mb-3 break-words')
    );

    const id = trackId(letter.spotify_link);

    if (embed && id) {
      const frame = document.createElement('iframe');

      frame.src = 'https://open.spotify.com/embed/track/' + id;
      frame.title = 'Spotify player for ' + (letter.song_title || 'this letter');
      frame.loading = 'lazy';
      frame.allow = 'encrypted-media';
      frame.className = 'w-full rounded-xl';
      frame.style.height = '152px';
      frame.style.border = '0';

      target.appendChild(frame);

      const fallback = document.createElement('a');

      fallback.href = 'https://open.spotify.com/track/' + id;
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      fallback.className = 'inline-block mt-3 underline';
      fallback.textContent = 'Player not loading? Open this track on Spotify ↗';

      target.appendChild(fallback);
    } else if (letter.spotify_link) {
      target.appendChild(
        textNode(
          'p',
          'Spotify player unavailable for this link.',
          'text-sm text-[#696775]'
        )
      );
    }
  }

  function envelope(letter) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'envelope lift w-full p-5 text-left focus-visible:outline';
    button.setAttribute('aria-label', 'Read letter: ' + letter.title);

    const label = document.createElement('span');

    label.className = 'envelope-label block p-4 mt-9';

    label.appendChild(
      textNode('span', letter.title, 'block font-semibold break-words')
    );

    label.appendChild(
      textNode(
        'span',
        new Date(letter.created_at).toLocaleDateString('en', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        'sans block mt-1 text-xs text-[#53665b]'
      )
    );

    button.appendChild(label);
    button.addEventListener('click', () => openLetter(letter.id));

    return button;
  }

  function renderEnvelopes() {
    const list = $('envelope-list');

    list.replaceChildren(
      ...letters.slice().reverse().slice(0, 6).map(envelope)
    );

    $('envelope-empty').hidden = letters.length > 0;
  }

  function renderArchive() {
    const query = $('archive-search').value.trim().toLocaleLowerCase();

    const matches = letters.slice().reverse().filter(item =>
      [item.title, item.message, item.artist, item.song_title].some(value =>
        String(value || '').toLocaleLowerCase().includes(query)
      )
    );

    $('archive-list').replaceChildren(...matches.map(envelope));
    $('archive-empty').hidden = matches.length > 0;
  }

  function openLetter(id) {
    const letter = letters.find(item => item.id === id);

    if (!letter) {
      show('archive');
      return;
    }

    $('letter-title').textContent = letter.title;
    $('letter-message').textContent = letter.message;

    $('letter-date').textContent = new Date(
      letter.created_at
    ).toLocaleDateString('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    music($('letter-music'), letter, true);
    show('letter');
  }

  $('unlock-form').addEventListener('submit', event => {
    event.preventDefault();

    const ownerRequest = location.hash === '#write';
    const enteredPassword = $('reader-password').value;

    const accepted =
      enteredPassword === (ownerRequest ? OWNER_PASSWORD : READER_PASSWORD);

    $('unlock-error').hidden = accepted;

    if (accepted) {
      readerUnlocked = true;
      $('reader-password').value = '';

      if (ownerRequest) {
        ownerMode = true;
        document.body.classList.remove('reader-mode');
        show('write');
      } else {
        document.body.classList.add('reader-mode');
        show('home');
      }
    } else {
      $('unlock-error').hidden = false;
      $('reader-password').focus();
    }
  });

  $('letter-form').addEventListener('submit', event => {
    event.preventDefault();

    const title = $('title').value.trim();
    const message = $('message').value.trim();
    const link = $('spotify-link').value.trim();

    $('form-error').hidden = true;

    if (!title || !message) {
      $('form-error').textContent =
        'Please add a title and write your letter.';

      $('form-error').hidden = false;
      (!title ? $('title') : $('message')).focus();

      return;
    }

    if (link && !trackId(link)) {
      $('form-error').textContent =
        'Please use a valid https://open.spotify.com/track/ link, or leave the link blank.';

      $('form-error').hidden = false;
      $('spotify-link').focus();

      return;
    }

    draft = {
      title,
      message,
      artist: $('artist').value.trim(),
      song_title: $('song-title').value.trim(),
      spotify_link: link
    };

    $('preview-title').textContent = draft.title;
    $('preview-message').textContent = draft.message;

    music($('preview-song'), draft, false);
    show('preview');
  });

  $('save-letter').addEventListener('click', () => {
    if (!draft) return;

    const next = [
      ...letters,
      {
        ...draft,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }
    ];

    try {
      localStorage.setItem(KEY, JSON.stringify(next));

      letters = next;
      draft = null;

      $('save-error').hidden = true;
      $('letter-form').reset();

      show('home');
    } catch {
      $('save-error').textContent =
        'This browser could not save the letter. Your draft is still here; please try again.';

      $('save-error').hidden = false;
    }
  });

  function exportHtml() {
    const safeJson = JSON.stringify(letters)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>For You, Someday — Letters</title>

<style>
body {
  margin: 0;
  background: #faf6ef;
  color: #252635;
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
  border: 1px solid #ddd7d0;
  border-radius: 18px;
  padding: 28px;
  margin: 24px 0;
  box-shadow: 0 12px 28px #25263512;
}

p.message {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
}

small {
  color: #696775;
}

a {
  color: #925b62;
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
const letters = JSON.parse(
  document.getElementById('letter-data').textContent
);

const root = document.getElementById('letters');

for (const letter of letters) {
  const article = document.createElement('article');
  const heading = document.createElement('h2');
  const date = document.createElement('small');
  const message = document.createElement('p');

  heading.textContent = letter.title;
  date.textContent = new Date(letter.created_at).toLocaleDateString();

  message.className = 'message';
  message.textContent = letter.message;

  article.append(heading, date, message);

  if (letter.song_title || letter.artist) {
    const song = document.createElement('p');

    song.textContent = [
      letter.song_title,
      letter.artist
    ].filter(Boolean).join(' — ');

    article.append(song);
  }

  try {
    const url = new URL(letter.spotify_link);

    if (
      url.protocol === 'https:' &&
      url.hostname === 'open.spotify.com' &&
      /^\\/track\\/[A-Za-z0-9]{22}\\/?$/.test(url.pathname)
    ) {
      const link = document.createElement('a');

      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Listen on Spotify ↗';

      article.append(link);
    }
  } catch {}

  root.append(article);
}
<\/script>
</body>
</html>`;

    const objectUrl = URL.createObjectURL(
      new Blob([html], { type: 'text/html;charset=utf-8' })
    );

    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = 'for-you-someday-letters.html';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);

    $('archive-status').textContent =
      'Your letters have been downloaded as an HTML keepsake.';
  }

  function routeFromHash() {
    if (location.hash === '#write') {
      ownerMode = false;
      readerUnlocked = false;

      document.body.classList.add('reader-mode');
      show('lock');
    } else if (!readerUnlocked) {
      ownerMode = false;

      document.body.classList.add('reader-mode');
      show('lock');
    } else {
      show('home');
    }
  }

  $('brand-home').onclick =
    $('nav-home').onclick =
    $('letter-home').onclick = () => show('home');

  $('nav-write').onclick =
    $('hero-write').onclick = () => {
      location.hash = '#write';
      routeFromHash();
    };

  $('nav-archive').onclick =
    $('back-to-archive').onclick = () => show('archive');

  $('writer-cancel').onclick = () => show('home');
  $('edit-letter').onclick = () => show('write');

  $('archive-search').addEventListener('input', renderArchive);
  $('download-button').addEventListener('click', exportHtml);

  $('delete-all-button').onclick = () => {
    $('delete-confirmation').hidden = false;
    $('confirm-delete').focus();
  };

  $('cancel-delete').onclick = () => {
    $('delete-confirmation').hidden = true;
    $('delete-all-button').focus();
  };

  $('confirm-delete').onclick = () => {
    try {
      localStorage.removeItem(KEY);

      letters = [];

      $('delete-confirmation').hidden = true;
      $('archive-status').textContent =
        'All letters were deleted from this browser.';

      renderArchive();
      $('delete-all-button').focus();
    } catch {
      $('archive-status').textContent =
        'The letters could not be deleted. Please try again.';
    }
  };

  window.addEventListener('hashchange', routeFromHash);

  routeFromHash();

  if (window.lucide) {
    lucide.createIcons();
  }
})();
