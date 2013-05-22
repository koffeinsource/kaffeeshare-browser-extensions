// initialize settings and set default server/namespace
var settings = new Store('settings', {
	'server' : '',
	'namespace' : '',
	'https_disabled' : '',
	'check_for_news': ''
});

// use status[tab.id] with states 'ready', 'loading', 'success', 'error', 'news'
var status;

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

function resetIcon() {
	if (!status) status = new Array();
	chrome.tabs.getSelected(null, function(tab) {
		// show the icon only for urls starting with http
		if (tab.url.indexOf('http') != 0) return;

		// keep icon if it is loding, success, or error
		if (status[tab.id] == 'loading') {
			showLoadingIndicatorIcon(tab.id);
			return;
		}
		if (status[tab.id] == 'success') {
			showSuccessIndicatorIcon(tab.id);
			return;
		}
		if (status[tab.id] == 'error') {
			showErrorIndicatorIcon(tab.id);
			return;
		}
		if (settings.get('check_for_news') == true) {
			chrome.storage.sync.get('news', function(result) {
				if (result.news == true) {
					showNewsIndicatorIcon(tab.id);
				} else {
					showReadyIndicatorIcon(tab.id);
				}
			});
		} else {
			showReadyIndicatorIcon(tab.id);
		}
	});
}

if (settings.get('check_for_news') == true) {
	// checkForUpdates is called every 30s
	setInterval(checkForUpdates, 60000);
	// true if checkForUpdates is current active ... not threadsafe
	var workingInterval = false;

	function checkForUpdates() {
		if (workingInterval) return;
		workingInterval = true;

		chrome.tabs.getSelected(null, function(tab) {
			// only ask the server if we don't already know news are available
			if (status[tab.id] == 'news') {
				workingInterval = false;
				return;
			}

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
						workingInterval = false;
					});
				} else {
					workingInterval = false;
				}
			});
		});
	}
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
	status[tabId] = 'ready';
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'comic_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showNewsIndicatorIcon(tabId) {
	status[tabId] = 'news';
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'news_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showErrorIndicatorIcon(tabId) {
	status[tabId] = 'error';
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'error_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showSuccessIndicatorIcon(tabId) {
	status[tabId] = 'success';
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'ok_16x16.png'
	});
	chrome.pageAction.show(tabId);
}

function showLoadingIndicatorIcon(tabId) {
	status[tabId] = 'loading';
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'loading_16x16.png'
	});
	chrome.pageAction.show(tabId);
}
