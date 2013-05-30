// initialize settings and set default server/namespace
var settings = new Store('settings', {
	'server' : '',
	'namespace' : '',
	'https_disabled' : '',
	'check_for_news': ''
});

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
	chrome.storage.sync.get('shared_urls', function(result) {
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
	//chrome.storage.sync.clear();
	chrome.storage.sync.set({'shared_urls': asoc}, function() {
		// save failed?
		if ( chrome.runtime.lastError && counter < 10) {

			// ok let's delete one random item from the shared urls
			// this may delete the new url, but let us hope for the best
			rdnnumber = Math.floor(Math.random()*asoc.length);
			i = 0;
			for (var key in asoc) {
				if (i == rdnnumber) delete asoc[key];
				++i;
			}

			// retry to save data
			storeSharedURLs(asoc, counter+1);
		}
	});
}

function resetIcon() {
	chrome.tabs.getSelected(null, function(tab) {
		// show the icon only for urls starting with http
		if (tab.url.indexOf('http') != 0) return;

		chrome.storage.sync.get('shared_urls', function(result) {
			// empty result if nothing has been shared yet
			if (!result.shared_urls) {
				showReadyIndicatorIcon(tab.id);
				return;
			}

			// if url has been shared before
			if (result.shared_urls.hasOwnProperty(tab.url)) {
				showSuccessIndicatorIcon(tab.id);
				return;
			}

			// if automatic news check is active
			if (settings.get('check_for_news') == true) {
				chrome.storage.sync.get('news', function(result) {
					// there are news
					if (result.news == true) {
						showNewsIndicatorIcon(tab.id);
					} else {
						showReadyIndicatorIcon(tab.id);
						// checkForUpdates is called every 60s
						if (!intervalListener) {
							intervalListener = setInterval(checkForUpdates, 60000);
						}
					}
				});
			} else {
				// new check is inactive
				showReadyIndicatorIcon(tab.id);
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
		chrome.storage.sync.get('updated', function(result) {
			var updated;
			if (result.updated) {
				updated = result.updated;
			} else {
				updated = 0;
			}

			// get last update from the kshare server
			var xhr = new XMLHttpRequest();
			xhr.open("GET", getServer()+"json?op=updated&ns=" + settings.get('namespace'), false);
			xhr.send();
			var resp = JSON.parse(xhr.responseText);

			// so, are there any news?
			if (updated<resp.last_update) {
				chrome.storage.sync.set({'updated': resp.last_update, 'news': true}, function() {
					resetIcon();
					console.log("disable news check");
					window.clearInterval (intervalListener);
					workingInterval = false;
				});
			} else {
				workingInterval = false;
			}
		});
	});
}


function sharePage() {
	url = getServer() + "oneclickshare?ns=" + settings.get('namespace') + "&url=";
	chrome.tabs.getSelected(null, function(tab) {
		showLoadingIndicatorIcon(tab.id);
		chrome.tabs.sendMessage(tab.id, {
			job : 'getUrlToShare'
		}, function handler(response) {
			// we get a response if there is a specialized plugin
			if (response) url += encodeURIComponent(response.urltoshare);
			// if not, we just use the tab url
			else url += encodeURIComponent(tab.url);

			sendPageToShare(url, tab.id);
		});
	});
}

function sendPageToShare(url, tabId) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(data) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				if (xhr.responseText.indexOf('0') > -1) {
					showSuccessIndicatorIcon(tabId);

					// store current url as shared
					chrome.tabs.getSelected(null, function(tab) {
						addURLtoStorage(tab.url);
					});
				} else {
					showErrorIndicatorIcon(tabId);
				}
			} else {
				showErrorIndicatorIcon(tabId);
			}
		}
	}
	xhr.open('GET', url, true);
	xhr.send();
}

var alreadyClicked = false;
var clickTimer;
function iconClick() {
    //Check for previous click. Yes => double click
    if (alreadyClicked) {
        clearTimeout(clickTimer);
		alreadyClicked = false;
		chrome.storage.sync.set({'news': false}, function() {
			resetIcon();
			url = getServer() + "html.html?ns=" + settings.get('namespace');
			window.open(url, '_blank');
			window.focus();
		});
        return;
    }

    alreadyClicked = true;

	// timer will trigger if no second click is done within 250 ms
    clickTimer = setTimeout(function () {
		sharePage();

	    clearTimeout(clickTimer);
	    alreadyClicked = false;
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
