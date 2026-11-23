const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { setImmediate } = require('node:timers/promises');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');

const source = readFileSync(join(__dirname, '..', 'content.js'), 'utf8');
const searchButton = '[aria-label="Search for emails from this sender"]';
const filterButton = '[aria-label="Create Filter for Sender"]';
const actions = '.gmail-sender-search-actions';
const toolbar = `<div id="aso_search_form_anchor" role="search">
  <button type="button" class="gb_gf" aria-label="Advanced search options"></button>
</div>`;
const nativeForm = `<div class="ZF-Av">
  <label for="from-criteria">From</label><input id="from-criteria" class="aQa" type="text">
  <label for="subject-criteria">Subject</label><input id="subject-criteria" type="text" value="Existing text">
  <button id="native-create" disabled>Create filter</button>
</div>`;

function messageRow(sender, id = 'message') {
  return `<tr role="row" class="zA" id="${id}">
    <td class="star"></td><td class="yX"><div class="yW">${sender}</div></td>
    <td class="subject"><a href="mailto:body@example.com">Subject</a></td>
  </tr>`;
}

function setup(t, rows, toolbarMarkup = toolbar) {
  const dom = new JSDOM(`${toolbarMarkup}<table><tbody>${rows}</tbody></table>`, {
    url: 'https://mail.google.com/mail/u/2/?ui=2#inbox',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  // jsdom has no layout. Give visible elements a bounding rect for the Gmail form lookup.
  window.HTMLElement.prototype.getClientRects = function () {
    return this.closest('[hidden]') ? [] : [{}];
  };
  t.after(() => window.close());
  window.eval(source);
  return { window, document: window.document };
}

function appendNativeForm(document) {
  document.body.insertAdjacentHTML('beforeend', nativeForm);
  return document.querySelector('#from-criteria');
}

test('search preserves the active mailbox and encodes a plus-address', (t) => {
  const { window, document } = setup(t, messageRow('<span email="alex+work@example.com">Alex</span>'));
  document.querySelector(searchButton).click();
  assert.equal(window.location.href,
    'https://mail.google.com/mail/u/2/?ui=2#search/from%3Aalex%2Bwork%40example.com+in%3Ainbox');
  assert.equal(document.querySelector(`${actions} [data-email]`), null);
});

test('accepts a single address in a sender mailto link and ignores other parts of the row', (t) => {
  const { window, document } = setup(t, [
    messageRow('<a class="yP" href="mailto:team%2Bupdates@example.com?subject=Hello">Team</a>'),
    messageRow('<span class="yP">Unknown sender</span>', 'unknown'),
    messageRow('<a href="mailto:one@example.com,two@example.com">Two</a>', 'multiple'),
    messageRow('<a href="mailto:bad%ZZ@example.com">Bad encoding</a>', 'bad-encoding'),
    messageRow('<span email="missing-at.example.com">Invalid address</span>', 'invalid'),
    messageRow('<span data-email="alex@example.com extra">Malformed field</span>', 'malformed'),
  ].join(''));
  assert.equal(document.querySelectorAll(actions).length, 1);
  document.querySelector(searchButton).click();
  assert.equal(window.location.hash, '#search/from%3Ateam%2Bupdates%40example.com+in%3Ainbox');
});

test('updates recycled and inserted rows while retaining the original focused buttons', async (t) => {
  const { window, document } = setup(t, messageRow('<span email="first@example.com">First</span>'));
  const row = document.querySelector('#message');
  const originalButton = row.querySelector(searchButton);
  originalButton.focus();

  row.querySelector('.subject').append(' Updated subject');
  row.querySelector('[email]').setAttribute('email', 'second@example.com');
  document.querySelector('tbody').insertAdjacentHTML('beforeend',
    messageRow('<span email="third@example.com">Third</span>', 'inserted'));
  await setImmediate();

  assert.equal(document.activeElement, originalButton);
  assert.equal(row.querySelector(searchButton), originalButton);
  assert.equal(row.cells.length, 3);
  assert.equal(document.querySelector('#inserted').querySelectorAll('button').length, 2);
  let rowKeydowns = 0;
  row.addEventListener('keydown', () => rowKeydowns++);
  const keydown = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  assert.equal(originalButton.dispatchEvent(keydown), true);
  assert.equal(rowKeydowns, 0);
  originalButton.click();
  assert.match(window.location.hash, /second%40example\.com/);

  row.querySelector('[email]').remove();
  await setImmediate();
  assert.equal(row.querySelector(actions), null);
});

test('opens Gmail’s filter criteria and fills From without submitting the form', { timeout: 2000 }, async (t) => {
  const { window, document } = setup(t, messageRow('<span email="alex+work@example.com">Alex</span>'));
  let from;
  let createClicks = 0;
  let fieldChanges = 0;
  const filled = new Promise((resolve) => {
    document.querySelector('button.gb_gf').addEventListener('click', () => {
      window.setTimeout(() => {
        from = appendNativeForm(document);
        const create = document.querySelector('#native-create');
        create.addEventListener('click', () => createClicks++);
        from.addEventListener('input', () => { create.disabled = !from.value; });
        from.addEventListener('change', () => {
          fieldChanges++;
          resolve();
        });
      }, 0);
    });
  });
  document.querySelector(filterButton).click();
  await filled;

  assert.equal(from.value, 'alex+work@example.com');
  assert.equal(document.activeElement, from);
  assert.equal(document.querySelector('#subject-criteria').value, 'Existing text');
  assert.equal(document.querySelector('#native-create').disabled, false);
  assert.equal(createClicks, 0);
  assert.equal(fieldChanges, 1);
  assert.equal(window.location.hash, '#inbox');
});

test('uses the open filter form and leaves the account unchanged', (t) => {
  const { window, document } = setup(t, messageRow('<span email="first@example.com">First</span>'), toolbar + nativeForm);
  const from = document.querySelector('#from-criteria');
  from.value = 'old@example.com';
  let toggleClicks = 0;
  document.querySelector('button.gb_gf').addEventListener('click', () => toggleClicks++);
  document.querySelector(filterButton).click();
  assert.equal(from.value, 'first@example.com');
  assert.equal(toggleClicks, 0);
  assert.equal(window.location.pathname, '/mail/u/2/');
});

test('uses the most recently clicked sender while the filter form opens', async (t) => {
  const { document } = setup(t, [
    messageRow('<span email="first@example.com">First</span>'),
    messageRow('<span email="second@example.com">Second</span>', 'second'),
  ].join(''), toolbar.replace('Advanced search options', 'Options de recherche avancée'));
  let toggleClicks = 0;
  document.querySelector('button.gb_gf').addEventListener('click', () => toggleClicks++);
  document.querySelector(filterButton).click();
  document.querySelector(`#second ${filterButton}`).click();
  const from = appendNativeForm(document);
  await setImmediate();
  assert.equal(toggleClicks, 1);
  assert.equal(from.value, 'second@example.com');
});

test('discards a pending prefill if the mailbox changes as the form opens', async (t) => {
  const { window, document } = setup(t, messageRow('<span email="first@example.com">First</span>'));
  document.querySelector(filterButton).click();
  window.history.replaceState(null, '', '/mail/u/1/#inbox');
  const from = appendNativeForm(document);
  await setImmediate();
  assert.equal(from.value, '');
});
