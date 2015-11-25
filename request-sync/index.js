var ENDPOINT = 'api/quotations';

// Register the worker and show the list of quotations.
if (navigator.serviceWorker.controller) {
  loadQuotations();
} else {
  navigator.serviceWorker.oncontrollerchange = function() {
    this.controller.onstatechange = function() {
      if (this.state === 'activated') {
        loadQuotations();
      }
    };
  };
  navigator.serviceWorker.register('service-worker.js');
}

// This force a sync with the server by sending a command to
// the service worker.
window.addEventListener('online', function () {
  fetch('api/sync', { method: 'POST' }).then(function() {
    loadQuotations();
  });
});

// When clicking add button, get the new quote and author and post to
// the backend.
document.getElementById('add-form').onsubmit = function(event) {
  // Avoid navigation
  event.preventDefault();

  var newQuote = document.getElementById('new-quote').value.trim();
  // Skip if no quote provided.
  if (!newQuote) { return; }

  // Leave blank to represent an anonymous quote.
  var quoteAuthor = document.getElementById('quote-author').value.trim() || 'Anonymous';
  var quote = { text: newQuote, author: quoteAuthor };
  var headers = { 'content-type': 'application/json' };

  // Send the API request. In this case, a `POST` on `quotations` collection.
  fetch(addSession(ENDPOINT), { method: 'POST', body: JSON.stringify(quote), headers: headers })
    .then(function(response) {
      // **Accepted but not added**. This is an important distinction. We use it to
      // support delayed additions to the quotation collection while in offline.
      if (response.status === 202) {
        return quote;
      }
      return response.json();
    })
    .then(function(addedQuote) {
      document.getElementById('quotations').appendChild(getRowFor(addedQuote));
    });
};

// A simply `GET` (default operation for `fetch()`) is enough to retrieve
// the collection of quotes.
function loadQuotations() {
  fetch(addSession(ENDPOINT))
    .then(function(response) {
      return response.json();
    })
    .then(showQuotations);
}

// Fill the table with the quotations.
function showQuotations(collection) {
  var table = document.getElementById('quotations');
  table.innerHTML = '';
  for (var index = 0, max = collection.length, quote; index < max; index++) {
    quote = collection[index];
    table.appendChild(getRowFor(quote));
  }

  // Specifically for the cookbook site :(
  if (window.parent !== window) {
    window.parent.document.body.dispatchEvent(new CustomEvent('iframeresize'));
  }
}

// Builds a row for a quote. If the quote has no id, we considered it as a delayed
// quotation and it does not include a delete button.
function getRowFor(quote) {
  var tr = document.createElement('TR');
  var id = quote.id;

  // The row is identified by the quote id to allow easy deletion.
  if (id) {
    tr.id = id;
  }

  tr.appendChild(getCell(quote.text));
  tr.appendChild(getCell('by ' + quote.author));

  if (!id) {
    // In case of no id, we assume it is a delayed quotation.
    tr.appendChild(getCell('(in queue...)'));
  } else {
    // Otherwise add the delete button.
    tr.appendChild(quote.isSticky ? getCell('') : getDeleteButton(id));
  }
  return tr;
}

// Builds a data cell for some text.
function getCell(text) {
  var td = document.createElement('TD');
  td.textContent = text;
  return td;
}

// Builds a delete button for the quote.
function getDeleteButton(id) {
  var td = document.createElement('TD');
  var button = document.createElement('BUTTON');
  button.textContent = 'Delete';

  // In case of clicking the delete button, make the proper request to the API
  // and remove from the table.
  button.onclick = function() {
    deleteQuote(id).then(function() {
      var tr = document.getElementById(id);
      tr.parentNode.removeChild(tr);
    });
  };

  td.appendChild(button);
  return td;
}

// Make the request to the API for deleting the quote.
function deleteQuote(id) {
  return fetch(addSession(ENDPOINT + '/' + id), { method: 'DELETE' });
}

// Add the session parameter to an URL
function addSession(url) {
  return url + '?session=' + getSession();
}

// A simple session manager based on a random string stored in the localStorage
function getSession() {
  var session = localStorage.getItem('session');
  if (!session) {
    session = '' + Date.now() + '-' + Math.random();
    localStorage.setItem('session', session);
  }
  return session;
}
