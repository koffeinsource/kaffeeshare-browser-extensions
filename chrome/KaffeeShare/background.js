// initialize settings and set default server/namespace
var settings = new Store('settings', {
	'server' : '',
	'namespace' : '',
	'https_disabled' : '',
	'check_for_news': '',
	'double_click_for_share': ''
});

// disables debug log to console
//debug.setLevel(0)

// for the news check
var intervalListener;

chrome.tabs.onActivated.addListener (resetIcon);
chrome.tabs.onUpdated.addListener (resetIcon);
chrome.pageAction.onClicked.addListener (iconClick);

chrome.commands.onCommand.addListener (function(command) {
	if(command == "share") {
		sharePage();
	}
});

chrome.extension.onMessage.addListener (function(request, sender, sendResponse) {
	if (request.share_page) {
		sharePage();
	}
	if (request.reset_icon) {
		resetIcon();
	}
});

function addURLtoStorage(url) {
	debug.log ("store url: " + url);
	chrome.storage.local.get('shared_urls', function(result) {
		var asoc;
		if (result.shared_urls) {
			asoc = result.shared_urls;
		} else {
			// DB empty
			asoc = {};
		}

		asoc[url] = true;
		storeSharedURLs(asoc, 0);
	});
}

// recursively called in case of error
function storeSharedURLs(asoc, counter) {
	//chrome.storage.local.clear();
	chrome.storage.local.set({'shared_urls': asoc}, function() {
		// save failed?
		if ( chrome.runtime.lastError && counter < 10) {
			// we expect it to be full, so lets randomly delete something

			// ok let's delete one random item from the shared urls
			// this may delete the new url, but let us hope for the best
			var keys = Object.keys(assoc);
			delete assoc[keys[Math.floor(keys.length * Math.random())]];

			// retry to save data
			storeSharedURLs(asoc, counter+1);
		}
		if (counter == 10) {
			debug.log ("store failed: " + url);
		}
	});
}

function resetIconNoNews(tab, sharedURLs) {
	// empty result if nothing has been shared yet
	if (!sharedURLs.shared_urls) {
		debug.log ("no shared urls so far");
		showReadyIndicatorIcon(tab.id);
		return
	}

	// if url has been shared before
	if (sharedURLs.shared_urls.hasOwnProperty(tab.url)) {
		debug.log ("url has been shared: " + tab.url);
		showSuccessIndicatorIcon(tab.id);
		return;
	}

	debug.log ("url not shared before: " + tab.url);
	debug.log (sharedURLs);
	showReadyIndicatorIcon(tab.id);
}

function resetIcon() {
	chrome.tabs.getSelected(null, function(tab) {
		// show the icon only for urls starting with http
		if (tab.url.indexOf('http') != 0) return;

		chrome.storage.local.get('shared_urls', function(sharedURLs) {
			debug.log("shared urls so far:");
			debug.log(sharedURLs)
			// if automatic news check is active
			if (settings.get('check_for_news') == true) {
				chrome.storage.local.get('news', function(result) {
					debug.log("got news state: " + result.news);
					// there are news
					if (result.news == true) {
						debug.log("show news icon");
						showNewsIndicatorIcon(tab.id);
					} else {
						// checkForUpdates is called every 60s
						if (!intervalListener) {
							debug.log("enable news check");
							intervalListener = setInterval(checkForUpdates, 60000);
						}

						debug.log("show default icons");
						resetIconNoNews(tab, sharedURLs);
					}
				});
			} else {
				debug.log("news check is disabled. show default icons.");
				resetIconNoNews(tab, sharedURLs);
			}
		});
	});
}

// true if checkForUpdates is current active ... not threadsafe
var workingInterval = false;

function checkForUpdates() {
	if (workingInterval) return;
	workingInterval = true;

	chrome.tabs.getSelected(null, function(tab) {
		chrome.storage.local.get('updated', function(result) {
			var updated;
			if (result.updated) {
				updated = result.updated;
			} else {
				updated = 0;
			}

			// get last update from the kshare server
			$.ajax({
				type: "GET",
				url: getServer()+"k/update/json/" + settings.get('namespace')+"/",
				dataType: 'json'
			}).done(function(resp) {
				// scale to javascript local time
				resp.last_update *= 1000;

				debug.log("results from k/update/json");
				debug.log("resp: " + resp.last_update);
				debug.log("updated: " + updated);
				// so, are there any news?
				if (updated<resp.last_update) {
					debug.log("There are news!");
					clearInterval(intervalListener);
					chrome.storage.local.set({'updated': resp.last_update, 'news': true}, function() {
						debug.log("set news state to true and updated to " + resp.last_update);
						resetIcon();
						workingInterval = false;
					});
				} else {
					debug.log("No news!");
					workingInterval = false;
				}
			}).fail(function() {
			}).always(function(msg) {
			});
		});
	});
}

function openWebView() {
	url = getServer() + "k/show/www/" + settings.get('namespace');
	if (settings.get('check_for_news') == true) {
		chrome.storage.local.set({'news': false}, function() {
			debug.log("enable news check");
			intervalListener = setInterval(checkForUpdates, 60000);
		});
	}
	resetIcon();
	window.open(url, '_blank');
	window.focus();
}

function sharePage() {
	url = getServer() + "k/share/json/" + settings.get('namespace') + "/?url=";
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {
			job : 'getUrlToShare'
		}, function handler(response) {
			// we get a response if there is a specialized plugin
			if (response) url += encodeURIComponent(response.urltoshare);
			// if not, we just use the tab url
			else url += encodeURIComponent(tab.url);

			sendPageToShare(url, tab);
		});
	});
}

function sendPageToShare(url, tab) {
	showLoadingIndicatorIcon(tab.id);
	$.ajax({
		type: "GET",
		url: url,
		dataType: 'json'
	}).done(function(msg) {
		if (msg.status="ok") {
    		showSuccessIndicatorIcon(tab.id);
			addURLtoStorage(tab.url);
		} else {
			showErrorIndicatorIcon(tab.id);
		}
	}).fail(function() {
		showErrorIndicatorIcon(tab.id);
	}).always(function(msg) {
	});
}

var alreadyClicked = false;
var clickTimer;

function handleClick() {
	clearTimeout(clickTimer);
	alreadyClicked = false;

	if (settings.get('double_click_for_share')) {
		openWebView();
		resetIcon();
	} else {
		sharePage();
	}

}

function handleDoubleClick() {
	clearTimeout(clickTimer);
	alreadyClicked = false;

	if (settings.get('double_click_for_share')) {
		sharePage();
	} else {
		openWebView();
		resetIcon();
	}
}

function iconClick() {
    //Check for previous click. Yes => double click
    if (alreadyClicked) {
		handleDoubleClick();
		return;
    }

    alreadyClicked = true;

	// timer will trigger if no second click is done within 250 ms
    clickTimer = setTimeout(function () {
		handleClick();
	}, 250);
}

function getServer() {
	var url = "https://";
	if (settings.get('https_disabled')) {
		url = "http://";
	}
	url += settings.get('server') + "/";
	return url;
}

function showReadyIndicatorIcon(tabId) {
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'comic_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showNewsIndicatorIcon(tabId) {
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'news_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showErrorIndicatorIcon(tabId) {
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'error_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showSuccessIndicatorIcon(tabId) {
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'ok_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showLoadingIndicatorIcon(tabId) {
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'loading_16x16.png'
	});
	chrome.pageAction.show(tabId);
}
