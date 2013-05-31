/**
 * KaffeeShare namespace.
 */
if ("undefined" == typeof(KaffeeShareChrome)) {
	var KaffeeShareChrome = {};
};

/**
 * Controls the browser overlay for the KaffeeShare extension.
 */
KaffeeShareChrome.BrowserOverlay = {

	pref : null,
	url : "",
	ns : "",
	http : false,
	news : false,
	stringBundle : null,
	iconAlreadyClicked : false,
	doubleClickTimer : null,
	storage : null,
	newsWorker : null,
	newsAvail : false,
	lastNewsUpdate : 0,

	/**
	 * The icon is clicked.
	 */
	iconClick : function(aEvent) {

		if(KaffeeShareChrome.BrowserOverlay.url == "" || KaffeeShareChrome.BrowserOverlay.ns == "" ) {
			return;
		}

		//Check for previous click
		if (KaffeeShareChrome.BrowserOverlay.iconAlreadyClicked) {
			clearTimeout(KaffeeShareChrome.BrowserOverlay.doubleClickTimer);
			var url = KaffeeShareChrome.BrowserOverlay.getServer()
					+ "/html.html?ns="
					+ KaffeeShareChrome.BrowserOverlay.ns;

			var currentBrowser = top.document.getElementById("content");
			var tab = currentBrowser.addTab(url);
			currentBrowser.selectedTab = tab;

			KaffeeShareChrome.BrowserOverlay.iconAlreadyClicked = false;
			KaffeeShareChrome.BrowserOverlay.newsAvail = false;
			return;
		}

		KaffeeShareChrome.BrowserOverlay.iconAlreadyClicked = true;
		KaffeeShareChrome.BrowserOverlay.doubleClickTimer = setTimeout(function () {
				clearTimeout(KaffeeShareChrome.BrowserOverlay.doubleClickTimer);
				KaffeeShareChrome.BrowserOverlay.iconAlreadyClicked = false;
				KaffeeShareChrome.BrowserOverlay.share();
			}, 250);
	},

	/**
	 * Share the current page.
	 */
	share : function(aEvent) {

		var urltoshare = gBrowser.contentDocument.location.toString();
		if (urltoshare.indexOf('www.google') > -1
			&& urltoshare.indexOf('/reader/') > -1) {
				urltoshare = gBrowser.contentDocument.getElementById('current-entry').getElementsByTagName("a")[0].getAttribute("href");

				// we need to reset our tab-bar icon if 'current-entry' is changed, e.g. to another news item.
				// find element to observe
				var target = gBrowser.contentDocument.getElementById('current-entry');

				// create an observer instance
				// the function is called if the target is changed
				var observer = new MutationObserver(function(mutations) {
					KaffeeShareChrome.BrowserOverlay.resetIcon();
					observer.disconnect();
				});

				// configuration of the observer:
				var config = { attributes: true, childList: true, characterData: true, subtree: true }

				// pass in the target node, as well as the observer options
				observer.observe(target, config);				
		}

		var shareUrl = KaffeeShareChrome.BrowserOverlay.getServer()
						+ "/oneclickshare?ns="
						+ KaffeeShareChrome.BrowserOverlay.ns 
						+ "&url="
						+ encodeURIComponent(urltoshare);

		Application.console.log("Kaffeeshare | Share url: " + shareUrl);

		// Prepare request
		var request = new XMLHttpRequest();
		request.open("GET", shareUrl, true);

		// Set response function
		request.onreadystatechange = function (oEvent) {
			try {
				if (request.readyState === 4) {
					// All the data has been received, and is available.
					
					if (request.status === 200) {
						if (request.responseText == "0") {
							KaffeeShareChrome.BrowserOverlay.success();
						} else {
							var error = KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.error.server");
							KaffeeShareChrome.BrowserOverlay.error(error);
						}
					}
				}
			} catch (e) {
				var error = KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.error.server");
				KaffeeShareChrome.BrowserOverlay.error(error);
			}
		};

		// Send request
		request.send(null);

		// Save the last shared url in the current tab
		var iOService = Components.classes["@mozilla.org/network/io-service;1"]
						.getService(Components.interfaces.nsIIOService);
		gBrowser.selectedTab.kaffeeshare_lastUrl = iOService.newURI(urltoshare, null, null);

		KaffeeShareChrome.BrowserOverlay.loading();
	},

	/**
	 * Handle an icon reset.
	 */
	resetIcon : function() {

		if(KaffeeShareChrome.BrowserOverlay.url == "") {
			KaffeeShareChrome.BrowserOverlay.error(KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.error.url"));
		} else if(KaffeeShareChrome.BrowserOverlay.ns == "") {
			KaffeeShareChrome.BrowserOverlay.error(KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.error.ns"));
		} else if(KaffeeShareChrome.BrowserOverlay.newsAvail) {
			KaffeeShareChrome.BrowserOverlay.readyNews();
		} else {
			KaffeeShareChrome.BrowserOverlay.ready();
		}

	},

	/**
	 * Handle a location change.
	 */
	locationChange : function(progress, request, uri) {

		try {
			// Check, weather the selected tab has been shared
			if(uri.equals(gBrowser.selectedTab.kaffeeshare_lastUrl)) {
				var state = gBrowser.selectedTab.kaffeeshare_state;
				if(state == "success") {
					KaffeeShareChrome.BrowserOverlay.success();
					return;
				} else if(state == "error") {
					KaffeeShareChrome.BrowserOverlay.error();
					return;
				}
			}
		} catch (e) {
			gBrowser.selectedTab.kaffeeshare_lastUrl = ""
			gBrowser.selectedTab.kaffeeshare_state = ""
		}

		if(KaffeeShareChrome.BrowserOverlay.news && !KaffeeShareChrome.BrowserOverlay.newsAvail) {
			KaffeeShareChrome.BrowserOverlay.runNewsWorker();
		}
		KaffeeShareChrome.BrowserOverlay.resetIcon();
	},

	/**
	 * Handle ready.
	 */
	ready : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/comic_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.sharepage"));

		gBrowser.selectedTab.kaffeeshare_state = "ready";
	},

	/**
	 * Handle error.
	 */
	error : function(msg) {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/error_16x16.png");
		img.setAttribute("tooltiptext", msg);

		gBrowser.selectedTab.kaffeeshare_state = "error";
	},

	/**
	 * Handle success.
	 */
	success : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/ok_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.success"));

		gBrowser.selectedTab.kaffeeshare_state = "success";
	},

	/**
	 * Handle loading.
	 */
	loading : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/loading_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.loading"));

		gBrowser.selectedTab.kaffeeshare_state = "loading";
	},

	/**
	 * Handle news avail.
	 */
	readyNews : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/news_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.news"));

		gBrowser.selectedTab.kaffeeshare_state = "news";
	},

	/**
	 * Handle a key down event.
	 */
	keydown : function(event) {

		// Bind to both command (for Mac) and control (for Win/Linux)
		if ( (event.ctrlKey || event.metaKey) && (event.keyCode == 190) ) {

			// ctrl + . share a page
			KaffeeShareChrome.BrowserOverlay.iconClick(event);
		}
	},

	/**
	 * Gets the server url.
	 */
	getServer : function() {

		var protocol = "https://";
		if(KaffeeShareChrome.BrowserOverlay.http) {
			protocol = "http://";
		}

		var url = protocol + KaffeeShareChrome.BrowserOverlay.url;
		return url;
	},

	/**
	 * Run a news worker thread.
	 */
	runNewsWorker : function() {

		if(KaffeeShareChrome.BrowserOverlay.newsWorker != null) {
			return;
		}
		
		KaffeeShareChrome.BrowserOverlay.newsWorker = new Worker("chrome://kaffeeshare/content/newsWorker.js");

		KaffeeShareChrome.BrowserOverlay.newsWorker.onmessage = function(event) {
			KaffeeShareChrome.BrowserOverlay.onworkermessage.call(KaffeeShareChrome.BrowserOverlay, event);
		};

		var data = {
			"server": KaffeeShareChrome.BrowserOverlay.getServer(),
			"ns": KaffeeShareChrome.BrowserOverlay.ns,
			"updated" : KaffeeShareChrome.BrowserOverlay.lastNewsUpdate
		};
		Application.console.log("Kaffeeshare |  Run news worker");
		KaffeeShareChrome.BrowserOverlay.newsWorker.postMessage(data);
	},

	/**
	 * Stops a news worker thread.
	 */
	stopNewsWorker : function() {
		Application.console.log("Kaffeeshare |  Terminate news worker");
		KaffeeShareChrome.BrowserOverlay.newsWorker.terminate();
		KaffeeShareChrome.BrowserOverlay.newsWorker = null;
	},

	/**
	 * Receive messages from the worker.
	 */
	onworkermessage: function(event) {
		Application.console.log("Kaffeeshare | Receive msg from news worker: " + event.data);

		KaffeeShareChrome.BrowserOverlay.lastNewsUpdate = event.data;
		KaffeeShareChrome.BrowserOverlay.newsAvail = true;
		KaffeeShareChrome.BrowserOverlay.stopNewsWorker();
		KaffeeShareChrome.BrowserOverlay.resetIcon();
	},

	/**
	 * Initialize the extension.
	 */
	startup : function() {

		// Add listeners
		gBrowser.addProgressListener( { onLocationChange : function(aWebProgress,aRequest,aLocation) { KaffeeShareChrome.BrowserOverlay.locationChange(aWebProgress,aRequest,aLocation); },
										onStateChange: function(aWebProgress,aRequest, aStateFlags, aStatus) {},
										onProgressChange: function(aWebProgress,aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},
										onStatusChange: function(aWebProgress,aRequest, aStatus, aMessage) {},
										onSecurityChange: function(aWebProgress,aRequest, aState) {} 
									  });

		// Register to receive notifications of preference changes
		KaffeeShareChrome.BrowserOverlay.prefs = Components.classes["@mozilla.org/preferences-service;1"]
												.getService(Components.interfaces.nsIPrefService)
												.getBranch("kaffeeshare.");
		KaffeeShareChrome.BrowserOverlay.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		KaffeeShareChrome.BrowserOverlay.prefs.addObserver("", this, false);
		KaffeeShareChrome.BrowserOverlay.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);

		// Set string bundle
		KaffeeShareChrome.BrowserOverlay.stringBundle = document.getElementById("kaffeeshare-string-bundle");

		// Get preferences
		KaffeeShareChrome.BrowserOverlay.url = KaffeeShareChrome.BrowserOverlay.prefs.getCharPref("kaffeeshare-url");
		KaffeeShareChrome.BrowserOverlay.ns = KaffeeShareChrome.BrowserOverlay.prefs.getCharPref("kaffeeshare-ns");
		KaffeeShareChrome.BrowserOverlay.http = KaffeeShareChrome.BrowserOverlay.prefs.getBoolPref("kaffeeshare-http");
		KaffeeShareChrome.BrowserOverlay.news = KaffeeShareChrome.BrowserOverlay.prefs.getBoolPref("kaffeeshare-news");

		// Get persistent data storage
		var url = "https://kaffee.share";
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
					.getService(Components.interfaces.nsIIOService);
		var ssm = Components.classes["@mozilla.org/scriptsecuritymanager;1"]
					.getService(Components.interfaces.nsIScriptSecurityManager);
		var dsm = Components.classes["@mozilla.org/dom/storagemanager;1"]
					.getService(Components.interfaces.nsIDOMStorageManager);

		var uri = ios.newURI(url, "", null);
		var principal = ssm.getCodebasePrincipal(uri);
		KaffeeShareChrome.BrowserOverlay.storage = dsm.getLocalStorageForPrincipal(principal, "");

		KaffeeShareChrome.BrowserOverlay.lastNewsUpdate = parseInt(KaffeeShareChrome.BrowserOverlay.storage.getItem("update"));

		if(KaffeeShareChrome.BrowserOverlay.news) {
			KaffeeShareChrome.BrowserOverlay.runNewsWorker();
		}
		KaffeeShareChrome.BrowserOverlay.resetIcon();
	},

	/**
	 * Clean up after ourselves and save the storage items.
	 */
	shutdown : function() {
		if(KaffeeShareChrome.BrowserOverlay.newsWorker != null) {
			KaffeeShareChrome.BrowserOverlay.stopNewsWorker();
		}
		KaffeeShareChrome.BrowserOverlay.prefs.removeObserver("", this);
		
		KaffeeShareChrome.BrowserOverlay.storage.setItem("update", KaffeeShareChrome.BrowserOverlay.lastNewsUpdate);

	},

	/**
	 * Called when events occur on the preferences.
	 */
	observe : function(subject, topic, data) {
		if (topic != "nsPref:changed") {
			return;
		}

		switch(data)
		{
			case "kaffeeshare-url":
				KaffeeShareChrome.BrowserOverlay.url = KaffeeShareChrome.BrowserOverlay.prefs.getCharPref("kaffeeshare-url");
				break;
			case "kaffeeshare-ns":
				KaffeeShareChrome.BrowserOverlay.ns = KaffeeShareChrome.BrowserOverlay.prefs.getCharPref("kaffeeshare-ns");
				break;
			case "kaffeeshare-http":
				KaffeeShareChrome.BrowserOverlay.http = KaffeeShareChrome.BrowserOverlay.prefs.getBoolPref("kaffeeshare-http");
				break;
			case "kaffeeshare-news":
				KaffeeShareChrome.BrowserOverlay.news = KaffeeShareChrome.BrowserOverlay.prefs.getBoolPref("kaffeeshare-news");
				if(KaffeeShareChrome.BrowserOverlay.news) {
					KaffeeShareChrome.BrowserOverlay.runNewsWorker();
				} else {
					KaffeeShareChrome.BrowserOverlay.stopNewsWorker();
				}
				break;
		}

	}

};


window.addEventListener("load", function(e) { KaffeeShareChrome.BrowserOverlay.startup(); }, false);
window.addEventListener("unload", function(e) { KaffeeShareChrome.BrowserOverlay.shutdown(); }, false);
window.addEventListener('keydown', function(e) { KaffeeShareChrome.BrowserOverlay.keydown(e); }, false);

