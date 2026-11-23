// Adds sender shortcuts to Gmail conversation rows.
(function () {
  "use strict";

  const ROW_SELECTOR = 'tr[role="row"], .zA';
  const NAME_SELECTOR = '.yP, .y2';
  const ADDRESS_SELECTOR = '[email], [data-email], a[href^="mailto:" i]';
  const ACTIONS_CLASS = 'gmail-sender-search-actions';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SEARCH_OPTIONS_SELECTOR = [
    '[role="search"] button[aria-label="Advanced search options"]',
    '[role="search"] button[data-tooltip="Show search options"]',
    '#aso_search_form_anchor button.gb_gf',
  ].join(', ');

  // One conventional address that can be used as a single Gmail search operand.
  const ADDRESS_PATTERN = /^[a-z0-9_+%-]+(?:\.[a-z0-9_+%-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
  const rowActions = new WeakMap();
  let pendingFilter;

  function validateAddress(value) {
    const address = value.trim();
    return address.length <= 254 &&
      address.indexOf('@') <= 64 &&
      ADDRESS_PATTERN.test(address) ? address : null;
  }

  function readAddress(element) {
    const attribute = element.getAttribute('email') ?? element.getAttribute('data-email');
    if (attribute !== null) return validateAddress(attribute);

    const recipient = element.getAttribute('href').slice('mailto:'.length).split('?', 1)[0];
    try {
      return validateAddress(decodeURIComponent(recipient));
    } catch {
      return null;
    }
  }

  function findSender(row) {
    const name = row.querySelector(NAME_SELECTOR);
    const area = row.querySelector('.yW') ?? row.querySelector('td.yX') ?? name?.parentElement;
    if (!area || area.closest(ROW_SELECTOR) !== row) return null;

    const addressElement = area.matches(ADDRESS_SELECTOR) ? area : area.querySelector(ADDRESS_SELECTOR);
    const email = addressElement
      ? readAddress(addressElement)
      : validateAddress((area.querySelector(NAME_SELECTOR) ?? area).textContent);
    return email ? { area, email } : null;
  }

  function searchForSender(email) {
    const query = encodeURIComponent(`from:${email} in:inbox`).replaceAll('%20', '+');
    window.location.hash = `search/${query}`;
  }

  function isVisible(element) {
    return element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
  }

  function findFilterFromInput() {
    // Gmail identifies this field by class and an associated label with a generated ID.
    const inputs = document.querySelectorAll('.ZF-Av input[type="text"]');
    return Array.from(inputs).find((input) => {
      const isFrom = input.matches('.aQa, [name="from"], [aria-label="From"]') ||
        Array.from(input.labels).some((label) => label.textContent.trim() === 'From');
      return isFrom && !input.disabled && !input.readOnly && isVisible(input);
    });
  }

  function waitForFilterFromInput() {
    const input = findFilterFromInput();
    if (input) return Promise.resolve(input);

    return new Promise((resolve) => {
      function finish(field) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve(field);
      }

      const observer = new MutationObserver(() => {
        const field = findFilterFromInput();
        if (field) finish(field);
      });
      const timeout = setTimeout(() => finish(findFilterFromInput()), 1500);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden', 'disabled', 'readonly'],
      });
    });
  }

  function showFilterError() {
    if (document.querySelector('.gmail-sender-search-notice')) return;

    const notice = document.createElement('div');
    notice.className = 'gmail-sender-search-notice';
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Couldn’t open Gmail’s filter form. Open Show search options and enter the sender in From.';
    document.body.append(notice);
    setTimeout(() => notice.remove(), 6000);
  }

  async function openFilterForSender(email) {
    const mailbox = window.location.pathname + window.location.search;
    if (pendingFilter?.mailbox === mailbox) {
      pendingFilter.email = email;
      return;
    }

    const request = { email, mailbox };
    pendingFilter = request;
    try {
      let input = findFilterFromInput();
      if (!input) {
        const toggle = Array.from(document.querySelectorAll(SEARCH_OPTIONS_SELECTOR))
          .find((button) => !button.disabled && isVisible(button));
        if (toggle) {
          toggle.click();
          input = await waitForFilterFromInput();
        }
      }

      if (pendingFilter !== request || mailbox !== window.location.pathname + window.location.search) return;
      if (!input || !input.isConnected) {
        showFilterError();
        return;
      }

      input.focus();
      input.value = request.email;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
      if (pendingFilter === request) pendingFilter = undefined;
    }
  }

  function createAction(row, label, iconPath, performAction) {
    const button = document.createElement('button');
    button.className = 'gmail-sender-search-btn';
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);

    const icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('viewBox', '0 0 16 16');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', iconPath);
    icon.append(path);
    button.append(icon);

    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const sender = findSender(row);
      if (sender) performAction(sender.email);
    });
    return button;
  }

  function updateRow(row) {
    if (!row.isConnected) return;
    const sender = findSender(row);
    let actions = rowActions.get(row);
    if (!sender) {
      actions?.remove();
      return;
    }

    if (!actions) {
      actions = document.createElement('span');
      actions.className = ACTIONS_CLASS;
      actions.append(
        createAction(row, 'Search for emails from this sender',
          'M9.9 9.9l3.5 3.5M10 6.4a3.6 3.6 0 1 1-7.2 0 3.6 3.6 0 0 1 7.2 0Z', searchForSender),
        createAction(row, 'Create Filter for Sender',
          'M2.5 3h11L9.5 8v4l-3 1V8Z', openFilterForSender),
      );
      rowActions.set(row, actions);
    }
    if (actions.parentElement !== sender.area) sender.area.prepend(actions);
  }

  document.querySelectorAll(ROW_SELECTOR).forEach(updateRow);
  const observer = new MutationObserver((mutations) => {
    const changedRows = new Set();
    for (const mutation of mutations) {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      const row = target?.closest(ROW_SELECTOR);
      if (row) changedRows.add(row);
      if (mutation.type !== 'childList') continue;

      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element) || node.classList.contains(ACTIONS_CLASS)) continue;
        if (node.matches(ROW_SELECTOR)) changedRows.add(node);
        node.querySelectorAll(ROW_SELECTOR).forEach((addedRow) => changedRows.add(addedRow));
      }
    }
    changedRows.forEach(updateRow);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['email', 'data-email', 'href'],
  });
})();
