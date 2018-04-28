// disables debug log to console
debug.setLevel(0);

browser.tabs.onActivated.addListener (resetIcon);
browser.tabs.onUpdated.addListener (resetIcon);
browser.pageAction.onClicked.addListener (iconClick);

function addURLtoStorage(url) {
	debug.log ("store url: " + url);
	browser.storage.local.get('shared_urls').then(result => {
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
	browser.storage.local.set({'shared_urls': asoc}).catch(function() {
		// save failed?
		if ( counter < 10) {
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
		return;
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
	browser.tabs.query({active: true,currentWindow:true}).then(function(tabs) {
		tab = tabs[0];
		// show the icon only for urls starting with http
		if (tab.url.indexOf('http') !== 0) return;

		browser.storage.local.get('shared_urls').then(sharedURLs => {
			debug.log("shared urls so far:");
			debug.log(sharedURLs);
			// if automatic news check is active
			resetIconNoNews(tab, sharedURLs);
		});
	}, function(error) { debug.log("Get current tab failed with " + error); });
}

function openWebView() {
	Promise.all([getServer(), getNamespace()]).then(res => {
		url = res[0] + "k/show/www/" + res[1];
		resetIcon();
		window.open(url, '_blank');
		window.focus();
	});
}

function sharePage() {
	Promise.all([getServer(), getNamespace(), browser.tabs.query({active: true,currentWindow:true})]).then(res => {
		var tab = res[2][0];
		var url = res[0] + "k/share/json/" + res[1] + "?url=" + encodeURIComponent(tab.url);
		sendPageToShare(url, tab);
	});
}

function sendPageToShare(url, tab) {
	showLoadingIndicatorIcon(tab.id);
	$.ajax({
		type: "GET",
		url: url,
		dataType: 'json'
	}).done(function(msg) {
		if (msg.status=="ok") {
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

	sharePage();
}

function handleDoubleClick() {
	clearTimeout(clickTimer);
	alreadyClicked = false;
	openWebView();
	resetIcon();
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
	return browser.storage.local.get("server").then(result => {
		return "https://"+result.server+"/";
	});
}

function getNamespace() {
	return browser.storage.local.get("namespace").then(result => {
		return result.namespace;
	});
}


function showReadyIndicatorIcon(tabId) {
	browser.pageAction.setIcon({
		tabId : tabId,
		path : 'comic_16x16.png'
	});
	browser.pageAction.show(tabId);
}

function showNewsIndicatorIcon(tabId) {
	browser.pageAction.setIcon({
		tabId : tabId,
		path : 'news_16x16.png'
	});
	browser.pageAction.show(tabId);
}

function showErrorIndicatorIcon(tabId) {
	browser.pageAction.setIcon({
		tabId : tabId,
		path : 'error_16x16.png'
	});
	browser.pageAction.show(tabId);
}

function showSuccessIndicatorIcon(tabId) {
	browser.pageAction.setIcon({
		tabId : tabId,
		path : 'ok_16x16.png'
	});
	browser.pageAction.show(tabId);
}

function showLoadingIndicatorIcon(tabId) {
	browser.pageAction.setIcon({
		tabId : tabId,
		path : 'loading_16x16.png'
	});
	browser.pageAction.show(tabId);
}
