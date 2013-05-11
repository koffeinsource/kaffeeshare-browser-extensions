// initialize settings and set default server/namespace
var settings = new Store('settings', {
	'server' : '',
	'namespace' : '',
	'https_disabled' : ''
});

function showIcon(tabId, changeInfo, tab) {
	if (tab.url.indexOf('http') > -1) {
		chrome.pageAction.setIcon({
			tabId : tabId,
			path : 'comic_16x16.png'
		});
		chrome.pageAction.show(tabId);
	}
}

function sharePage() {
	var url = "https://";
	if (settings.get('https_disabled')) {
		url = "http://";
	}
	url += settings.get('server') + "/oneclickshare?ns=" + settings.get('namespace') + "&url=";
	chrome.tabs.getSelected(null, function(tab) {
		chrome.pageAction.setIcon({
			tabId : tab.id,
			path : 'loading_16x16.png'
		});
		tabId = tab.id;
		chrome.tabs.sendMessage(tab.id, {
			job : 'getUrlToShare'
		}, function handler(response) {
			// we get a response if there is a specialized plugin
			if (response) url += encodeURIComponent(response.urltoshare);
			// if not, we just use the tab url
			else url += encodeURIComponent(tab.url);
			sendPageToShare(url, tabId);
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

function showErrorIndicatorIcon(tabId) {
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'error_16x16.png'
	});
}

function showSuccessIndicatorIcon(tabId) {
	chrome.pageAction.setIcon({
		tabId : tabId,
		path : 'ok_16x16.png'
	});
}

var alreadyClicked = false;
var timer;
chrome.pageAction.onClicked.addListener(function (tab) {
    //Check for previous click
    if (alreadyClicked) {
        clearTimeout(timer);
		var url = "https://";
		if (settings.get('https_disabled')) {
			url = "http://";
		}
		url += settings.get('server') + "/html.html?ns=" + settings.get('namespace');
		window.open(url, '_blank');
		window.focus();
        alreadyClicked = false;
        return;
    }

    alreadyClicked = true;

    timer = setTimeout(function () {
    	sharePage();

        clearTimeout(timer);
        alreadyClicked = false;
    }, 250);
});


chrome.tabs.onUpdated.addListener(showIcon);

chrome.commands.onCommand.addListener(function(command) {
	if(command =="share") {
		sharePage();
	}
});

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.share_page) {
		sharePage();
	}
	if (request.reset_icon) {
		chrome.pageAction.setIcon({
			tabId : tabId,
			path : 'comic_16x16.png'
		});
	}
});
