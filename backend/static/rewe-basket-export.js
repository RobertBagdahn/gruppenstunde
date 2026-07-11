/**
 * REWE Basket Export Bookmarklet
 *
 * Loaded by the bookmarklet script tag injected into shop.rewe.de.
 * Reads export data from Inspi and adds matched items to the REWE basket.
 */

(function () {
  'use strict';

  var config = window.__inspiReweExport;
  var EXPORT_URL = config && config.exportUrl;
  var REPORT_URL = config && config.reportUrl;
  delete window.__inspiReweExport;

  if (!EXPORT_URL || !REPORT_URL) {
    alert('Fehler: Export-URL nicht gefunden. Bitte Bookmarklet neu erstellen.');
    return;
  }

  var DELAY_MIN = 300;
  var DELAY_MAX = 800;

  // --- UI ---

  var overlay = document.createElement('div');
  overlay.id = 'inspi-rewe-export-overlay';
  overlay.innerHTML =
    '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">' +
    '<div style="background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.15);">' +
    '<h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111;">REWE-Warenkorb-Export</h2>' +
    '<p id="inspi-status" style="margin:0 0 16px;font-size:13px;color:#666;">Verbinde mit Inspi...</p>' +
    '<div id="inspi-progress" style="width:100%;height:6px;background:#eee;border-radius:3px;overflow:hidden;margin-bottom:16px;">' +
    '<div id="inspi-progress-bar" style="height:100%;background:#059669;border-radius:3px;width:0%;transition:width 0.3s;"></div>' +
    '</div>' +
    '<ul id="inspi-results" style="list-style:none;margin:0 0 16px;padding:0;font-size:12px;max-height:300px;overflow-y:auto;"></ul>' +
    '<div id="inspi-summary" style="font-size:13px;font-weight:600;color:#111;margin-bottom:12px;"></div>' +
    '<button id="inspi-close" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:12px;background:#fff;font-size:14px;font-weight:600;cursor:pointer;">Schließen</button>' +
    '</div></div>';
  document.body.appendChild(overlay);

  var statusEl = document.getElementById('inspi-status');
  var progressBar = document.getElementById('inspi-progress-bar');
  var resultsEl = document.getElementById('inspi-results');
  var summaryEl = document.getElementById('inspi-summary');
  var closeBtn = document.getElementById('inspi-close');

  closeBtn.addEventListener('click', function () {
    overlay.remove();
  });

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setProgress(percent) {
    progressBar.style.width = percent + '%';
  }

  function addResult(ingredientName, status, detail) {
    var li = document.createElement('li');
    var color = status === 'success' ? '#059669' : status === 'error' ? '#dc2626' : '#d97706';
    var icon = status === 'success' ? '\u2713' : status === 'error' ? '\u2717' : '\u26A0';
    li.innerHTML =
      '<span style="color:' + color + ';margin-right:4px;">' + icon + '</span>' +
      '<span style="color:#111;">' + escapeHtml(ingredientName) + '</span>' +
      (detail ? ' <span style="color:#999;">' + escapeHtml(detail) + '</span>' : '');
    resultsEl.appendChild(li);
    resultsEl.scrollTop = resultsEl.scrollHeight;
  }

  function setSummary(text) {
    summaryEl.textContent = text;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- Helpers ---

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function randomDelay() {
    return DELAY_MIN + Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN));
  }

  // --- Session UUID extraction ---

  function getSessionUuidFromBasket() {
    try {
      if (
        window.ReweBasket &&
        window.ReweBasket.listingIdToQuantityLookup
      ) {
        var keys = Object.keys(window.ReweBasket.listingIdToQuantityLookup);
        for (var i = 0; i < keys.length; i++) {
          var parts = keys[i].split('-');
          if (parts.length >= 3) {
            return parts.slice(2).join('-');
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  function getSessionUuidFromPdp(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('PDP fetch failed');
        return res.text();
      })
      .then(function (html) {
        var match = html.match(/id="pdpr-propstore[^"]*"[^>]*>([\s\S]*?)<\/script>/);
        if (!match) return null;
        try {
          var data = JSON.parse(match[1]);
          if (data && data.productData && data.productData.articleId) {
            var listingIds = data.productData.listingIds || [];
            if (listingIds.length > 0) {
              var parts = listingIds[0].split('-');
              if (parts.length >= 3) {
                return parts.slice(2).join('-');
              }
            }
          }
        } catch (e) {
          // ignore
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  // --- REWE search for articleId ---

  function searchReweProduct(searchTerm) {
    var url =
      'https://shop.rewe.de/shop/api/products?search=' +
      encodeURIComponent(searchTerm) +
      '&pageSize=1';

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('REWE search failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var products = data._embedded && data._embedded.products;
        if (products && products.length > 0) {
          var product = products[0];
          return {
            articleId: product.articleId || product.id,
            listingIds: product.listingIds || [],
            name: product.name || '',
          };
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  // --- Fetch PDP to get articleId / listingIds ---

  function getArticleFromPdp(productUrl) {
    return fetch(productUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('PDP fetch failed');
        return res.text();
      })
      .then(function (html) {
        var match = html.match(/id="pdpr-propstore[^"]*"[^>]*>([\s\S]*?)<\/script>/);
        if (!match) return null;
        try {
          var data = JSON.parse(match[1]);
          if (data && data.productData) {
            return {
              articleId: data.productData.articleId || null,
              listingIds: data.productData.listingIds || [],
              name: data.productData.name || '',
            };
          }
        } catch (e) {
          // ignore
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  // --- Resolve articleId for an item ---

  function resolveArticleId(item) {
    var searchTerm = '';
    if (item.nan_art_id_rewe) {
      searchTerm = String(item.nan_art_id_rewe);
    } else {
      searchTerm = item.ingredient_name;
    }

    return searchReweProduct(searchTerm).then(function (result) {
      if (result && result.articleId && result.listingIds && result.listingIds.length > 0) {
        return { articleId: result.articleId, listingId: result.listingIds[0], name: result.name };
      }
      // Fallback: fetch PDP from search result link (if available)
      if (result && result.id) {
        var pdpUrl =
          'https://shop.rewe.de/p/' + (result.slug || result.id);
        return getArticleFromPdp(pdpUrl).then(function (pdpResult) {
          if (pdpResult && pdpResult.articleId && pdpResult.listingIds && pdpResult.listingIds.length > 0) {
            return {
              articleId: pdpResult.articleId,
              listingId: pdpResult.listingIds[0],
              name: pdpResult.name,
            };
          }
          return null;
        });
      }
      return null;
    });
  }

  // --- Main flow ---

  setStatus('Export-Daten werden geladen...');

  fetch(EXPORT_URL)
    .then(function (res) {
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            'Token ist abgelaufen oder ung\u00fcltig. Bitte in Inspi einen neuen Token erstellen.'
          );
        }
        throw new Error('Server-Fehler: ' + res.status);
      }
      return res.json();
    })
    .then(function (data) {
      var items = data.items || [];
      var shoppingListName = data.shopping_list_name || 'Einkaufsliste';

      if (items.length === 0) {
        setStatus('Keine Artikel in der Liste.');
        setProgress(100);
        setSummary('Die Einkaufsliste \u201e' + shoppingListName + '\u201c ist leer.');
        return;
      }

      setStatus(
        'Einkaufsliste \u201e' +
          shoppingListName +
          '\u201c (' +
          items.length +
          ' Artikel). Bereite vor...'
      );

      // Get session UUID
      var uuid = getSessionUuidFromBasket();
      var uuidPromise;
      if (uuid) {
        uuidPromise = Promise.resolve(uuid);
      } else {
        setStatus('Warenkorb ist leer \u2013 ermittle Session...');
        uuidPromise = getSessionUuidFromPdp('https://shop.rewe.de/');
      }

      return uuidPromise.then(function (sessionUuid) {
        if (!sessionUuid) {
          throw new Error(
            'Konnte keine REWE-Session finden. Bitte lege einen Artikel in den Warenkorb und versuche es erneut.'
          );
        }

        setStatus('Starte \u00dcbertragung von ' + items.length + ' Artikeln...');

        var matchedItems = items.filter(function (i) {
          return i.matched;
        });
        var unmatchedItems = items.filter(function (i) {
          return !i.matched;
        });

        // Show unmatched items
        unmatchedItems.forEach(function (item) {
          addResult(item.ingredient_name, 'warning', 'Keine REWE-Verkn\u00fcpfung');
        });

        var successIds = [];
        var failIds = [];
        var totalMatched = matchedItems.length;
        var completed = 0;

        function processNext(index) {
          if (index >= matchedItems.length) {
            // All done
            return finalize();
          }

          var item = matchedItems[index];
          setStatus(
            'Verarbeite ' +
              (index + 1) +
              '/' +
              totalMatched +
              ': ' +
              item.ingredient_name +
              '...'
          );
          setProgress(((completed / totalMatched) * 100).toFixed(0));

          return resolveArticleId(item)
            .then(function (articleInfo) {
              if (!articleInfo || !articleInfo.articleId) {
                addResult(item.ingredient_name, 'error', 'Nicht im REWE-Shop gefunden');
                failIds.push({ item_id: item.item_id || 0, reason: 'Produkt nicht gefunden' });
                completed++;
                setProgress(((completed / totalMatched) * 100).toFixed(0));
                return delay(randomDelay()).then(function () {
                  return processNext(index + 1);
                });
              }

              var listingId =
                item.order_quantity +
                '-' +
                articleInfo.articleId +
                '-' +
                sessionUuid;

              return fetch(
                'https://shop.rewe.de/shop/api/baskets/listings/' + listingId,
                {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                }
              )
                .then(function (res) {
                  if (!res.ok) {
                    throw new Error('HTTP ' + res.status);
                  }
                  return res.json();
                })
                .then(function () {
                  addResult(
                    item.ingredient_name,
                    'success',
                    item.order_quantity + '\u00d7 ' + item.unit
                  );
                  successIds.push(item.item_id);
                  completed++;
                  setProgress(((completed / totalMatched) * 100).toFixed(0));
                  return delay(randomDelay()).then(function () {
                    return processNext(index + 1);
                  });
                })
                .catch(function (err) {
                  addResult(
                    item.ingredient_name,
                    'error',
                    'Fehler: ' + (err.message || 'Unbekannt')
                  );
                  failIds.push({
                    item_id: item.item_id || 0,
                    reason: err.message || 'HTTP-Fehler',
                  });
                  completed++;
                  setProgress(((completed / totalMatched) * 100).toFixed(0));
                  return delay(randomDelay()).then(function () {
                    return processNext(index + 1);
                  });
                });
            })
            .catch(function () {
              addResult(item.ingredient_name, 'error', 'Suche fehlgeschlagen');
              failIds.push({
                item_id: item.id || 0,
                reason: 'Suche fehlgeschlagen',
              });
              completed++;
              setProgress(((completed / totalMatched) * 100).toFixed(0));
              return delay(randomDelay()).then(function () {
                return processNext(index + 1);
              });
            });
        }

        function finalize() {
          setProgress(100);
          var totalAttempted = successIds.length + failIds.length;
          setSummary(
            successIds.length +
              ' von ' +
              totalAttempted +
              ' gematchten Artikeln erfolgreich \u00fcbertragen.' +
              (unmatchedItems.length > 0
                ? ' ' +
                  unmatchedItems.length +
                  ' Artikel ohne REWE-Verkn\u00fcpfung \u00fcbersprungen.'
                : '')
          );
          setStatus('Sende Report an Inspi...');

          // Send report back to Inspi
          fetch(REPORT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              successful_item_ids: successIds,
              failed_item_ids: failIds,
            }),
          })
            .then(function () {
              setStatus('Fertig! Der Report wurde an Inspi gesendet.');
            })
            .catch(function () {
              setStatus('Fertig! (Report konnte nicht gesendet werden)');
            });
        }

        return processNext(0);
      });
    })
    .catch(function (err) {
      setStatus('');
      setProgress(100);
      setSummary('Fehler: ' + (err.message || 'Unbekannter Fehler'));
      addResult('System', 'error', err.message || 'Unbekannter Fehler');
    });
})();
