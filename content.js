// Gmail Sender Search Extension
// This script adds a search button next to sender email addresses in Gmail

(function () {
  "use strict";

  // Configuration
  const SEARCH_BUTTON_CLASS = "gmail-sender-search-btn";
  const SEARCH_BUTTON_TEXT = "🔍"; // This will be replaced with a styled icon
  const SEARCH_BUTTON_TITLE = "Search for emails from this sender";

  // Function to extract email from various Gmail elements
  function extractEmailFromElement(element) {
    // Try to find email in various Gmail structures
    let email = null;

    // Check for direct email links
    const emailLink = element.querySelector('a[href^="mailto:"]');
    if (emailLink) {
      email = emailLink.href.replace("mailto:", "");
    }

    // Check for email in span elements (common in Gmail)
    if (!email) {
      const emailSpan = element.querySelector("span[email]");
      if (emailSpan) {
        email = emailSpan.getAttribute("email");
      }
    }

    // Check for email in data attributes
    if (!email) {
      email =
        element.getAttribute("data-email") || element.getAttribute("email");
    }

    // Try to extract email from text content using regex
    if (!email) {
      const text = element.textContent || element.innerText || "";
      const emailMatch = text.match(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      );
      if (emailMatch) {
        email = emailMatch[1];
      }
    }

    return email;
  }

  // Function to find the star icon near a sender element
  function findStarIcon(senderElement) {
    // Common selectors for star icons in Gmail
    const starSelectors = [
      ".T-KT", // Gmail star icon class
      ".T-KT-Jp", // Gmail star icon class variant
      '[data-tooltip*="star"]', // Star tooltip
      '[aria-label*="star"]', // Star aria-label
      ".T-KT-Jp-Jq", // Another Gmail star class
      'div[role="button"][aria-label*="star"]', // Star button
      'div[role="button"][data-tooltip*="star"]', // Star button with tooltip
      'span[role="button"][aria-label*="star"]', // Star span button
      'span[role="button"][data-tooltip*="star"]', // Star span with tooltip
    ];

    // Find the row containing the sender element
    let row = senderElement.closest('tr[role="row"], .zA');
    if (!row) {
      // Fallback: walk up the DOM tree
      let currentElement = senderElement;
      while (currentElement && currentElement !== document.body) {
        if (
          currentElement.matches &&
          currentElement.matches('tr[role="row"], .zA')
        ) {
          row = currentElement;
          break;
        }
        currentElement = currentElement.parentElement;
      }
    }

    if (row) {
      // Look for star icon in the same row
      for (const selector of starSelectors) {
        const star = row.querySelector(selector);
        if (star) {
          // Make sure it's not already covered by a search button
          const hasSearchButton = star.parentNode.querySelector(
            `.${SEARCH_BUTTON_CLASS}`
          );
          if (!hasSearchButton) {
            return star;
          }
        }
      }
    }

    return null;
  }

  // Function to create search button
  function createSearchButton(email) {
    const button = document.createElement("button");
    button.className = SEARCH_BUTTON_CLASS;
    button.title = SEARCH_BUTTON_TITLE;
    button.setAttribute("data-email", email);

    // Create SVG magnifying glass icon
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.style.fill = "none";
    svg.style.stroke = "currentColor";
    svg.style.strokeWidth = "1.2";
    svg.style.strokeLinecap = "round";

    // Search circle
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", "6.4");
    circle.setAttribute("cy", "6.4");
    circle.setAttribute("r", "3.5");

    // Search handle
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "9.9");
    line.setAttribute("y1", "9.9");
    line.setAttribute("x2", "13.4");
    line.setAttribute("y2", "13.4");

    svg.appendChild(circle);
    svg.appendChild(line);
    button.appendChild(svg);

    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      searchForSender(email);
    });

    return button;
  }

  // Function to perform the search
  function searchForSender(email) {
    if (!email) return;

    // Construct the search query
    const searchQuery = `from:${email} in:inbox`;

    // Find Gmail's search box
    const searchBox =
      document.querySelector('input[aria-label="Search mail"]') ||
      document.querySelector('input[placeholder*="Search"]') ||
      document.querySelector('input[type="text"][name="q"]');

    if (searchBox) {
      // Clear existing search
      searchBox.value = "";
      searchBox.focus();

      // Set the search query
      searchBox.value = searchQuery;

      // Use Gmail's internal search API instead of form submission
      // This prevents page reload
      try {
        // Try to trigger Gmail's search without form submission
        const inputEvent = new Event("input", { bubbles: true });
        searchBox.dispatchEvent(inputEvent);

        // Try to trigger search with Enter key (but prevent form submission)
        const enterEvent = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });

        // Prevent the default form submission
        enterEvent.preventDefault();
        searchBox.dispatchEvent(enterEvent);

        // Also try keyup event
        const keyupEvent = new KeyboardEvent("keyup", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
        });
        searchBox.dispatchEvent(keyupEvent);
      } catch (error) {
        console.log("Search triggered via keyboard events");
      }
    } else {
      // Fallback: try to navigate to search URL
      const searchUrl = `https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(
        email
      )}+in%3Ainbox`;
      window.location.href = searchUrl;
    }
  }

  // Function to add search buttons to sender elements
  function addSearchButtons() {
    // Remove existing buttons to avoid duplicates
    document
      .querySelectorAll(`.${SEARCH_BUTTON_CLASS}`)
      .forEach((btn) => btn.remove());

    // Find all email rows and process each one individually
    // Use more specific Gmail selectors to avoid duplicates
    const emailRows = document.querySelectorAll(
      'tr[role="row"]:not([style*="display: none"]), .zA:not([style*="display: none"])'
    );
    const processedRows = new Set();

    emailRows.forEach((row) => {
      // Skip if already processed
      if (processedRows.has(row)) return;

      // Find sender elements within this row
      const senderSelectors = [
        "span[email]", // Direct email spans
        'a[href^="mailto:"]', // Email links
        ".yW span[email]", // Gmail specific sender spans
        ".yP", // Gmail sender class
        ".y2", // Gmail sender class
        "[data-hovercard-id]", // Hovercard elements
        ".bog", // Gmail sender name/email container
      ];

      let senderElement = null;
      let email = null;

      // Find the first valid sender element in this row
      for (const selector of senderSelectors) {
        const element = row.querySelector(selector);
        if (element) {
          email = extractEmailFromElement(element);
          if (email) {
            senderElement = element;
            break;
          }
        }
      }

      if (senderElement && email) {
        // Check if this row already has a search button
        const existingButton = row.querySelector(`.${SEARCH_BUTTON_CLASS}`);
        if (!existingButton) {
          const searchButton = createSearchButton(email);

          // Try to find the star icon and place button appropriately
          const starIcon = findStarIcon(senderElement);
          if (starIcon) {
            // Find the star's td element
            const starTd = starIcon.closest("td");
            if (starTd) {
              // Check if there's already a suitable empty td after the star
              const nextTd = starTd.nextElementSibling;
              if (
                nextTd &&
                nextTd.tagName === "TD" &&
                nextTd.textContent.trim() === ""
              ) {
                // Use the existing empty td
                nextTd.appendChild(searchButton);
              } else {
                // Create a new td element for the search button
                const searchTd = document.createElement("td");
                searchTd.className = starTd.className; // Copy the same classes as star td
                searchTd.style.width = starTd.style.width; // Copy width if set
                searchTd.style.minWidth = starTd.style.minWidth; // Copy min-width if set
                searchTd.appendChild(searchButton);

                // Insert the new td after the star's td
                starTd.parentNode.insertBefore(searchTd, starTd.nextSibling);
              }
            } else {
              // Fallback: insert after sender element
              senderElement.parentNode.insertBefore(
                searchButton,
                senderElement.nextSibling
              );
            }
          } else {
            // No star found, try to find an existing empty td in the row
            const emptyTds = row.querySelectorAll("td");
            let emptyTd = null;

            // Look for truly empty tds (no content, no children, or only whitespace)
            for (const td of emptyTds) {
              if (td.textContent.trim() === "" && td.children.length === 0) {
                emptyTd = td;
                break;
              }
            }

            if (emptyTd) {
              // Use existing empty td
              emptyTd.appendChild(searchButton);
            } else {
              // Fallback: insert button after the sender element
              senderElement.parentNode.insertBefore(
                searchButton,
                senderElement.nextSibling
              );
            }
          }
        }
        processedRows.add(row);
      }
    });
  }

  // Function to observe DOM changes and add buttons to new elements
  function observeChanges() {
    let updateTimeout;

    const observer = new MutationObserver(function (mutations) {
      let shouldUpdate = false;

      mutations.forEach(function (mutation) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain sender elements
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node or its children contain sender elements
              const hasSenderElements =
                node.querySelector &&
                (node.querySelector("span[email]") ||
                  node.querySelector('a[href^="mailto:"]') ||
                  node.querySelector(".yW span[email]") ||
                  node.querySelector(".yP") ||
                  node.querySelector(".y2") ||
                  node.querySelector("[data-hovercard-id]") ||
                  node.querySelector(".bog") ||
                  node.matches("span[email]") ||
                  node.matches('a[href^="mailto:"]') ||
                  node.matches(".yW span[email]") ||
                  node.matches(".yP") ||
                  node.matches(".y2") ||
                  node.matches("[data-hovercard-id]") ||
                  node.matches(".bog"));

              if (hasSenderElements) {
                shouldUpdate = true;
              }
            }
          });
        }
      });

      if (shouldUpdate) {
        // Debounce updates to prevent excessive calls
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(addSearchButtons, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Initialize the extension
  function init() {
    // Wait for Gmail to load
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(init, 1000);
      });
      return;
    }

    // Add search buttons
    addSearchButtons();

    // Start observing for changes
    observeChanges();

    // Also add buttons when Gmail navigates (SPA behavior)
    let navigationTimeout;
    window.addEventListener("popstate", function () {
      clearTimeout(navigationTimeout);
      navigationTimeout = setTimeout(addSearchButtons, 1000);
    });
  }

  // Start the extension
  init();
})();
