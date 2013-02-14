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
	stringBundle : null,

	/**
	 * Share the current page.
	 */
	share : function(aEvent) {
		
		if(KaffeeShareChrome.BrowserOverlay.url == "" || KaffeeShareChrome.BrowserOverlay.ns == "" ) {
			return;
		}
		
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
					KaffeeShareChrome.BrowserOverlay.reset();
					observer.disconnect();
				});
		 
				// configuration of the observer:
				var config = { attributes: true, childList: true, characterData: true, subtree: true }
				 
				// pass in the target node, as well as the observer options
				observer.observe(target, config);				
		}
		
		var protocol = "https://";
		if(KaffeeShareChrome.BrowserOverlay.http) {
			protocol = "http://";
		}
		
		var shareUrl = protocol + KaffeeShareChrome.BrowserOverlay.url 
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
							KaffeeShareChrome.BrowserOverlay.ok();
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
	 * Handle a location change.
	 */
	locationChange : function(progress, request, uri) {

		try {
			// Check, weather the selected tab has been shared
			if(uri.equals(gBrowser.selectedTab.kaffeeshare_lastUrl)) {
				var state = gBrowser.selectedTab.kaffeeshare_state;
				if(state == "ok") {
					KaffeeShareChrome.BrowserOverlay.ok();
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

		KaffeeShareChrome.BrowserOverlay.update();
	},
	
	/**
	 * Handle a location change.
	 */
	update : function() {
		
		if(KaffeeShareChrome.BrowserOverlay.url == "") {
			KaffeeShareChrome.BrowserOverlay.error(KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.error.url"));
		} else if(KaffeeShareChrome.BrowserOverlay.ns == "") {
			KaffeeShareChrome.BrowserOverlay.error(KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.error.ns"));
		} else {
			KaffeeShareChrome.BrowserOverlay.reset();
		}
		
	},
	
	/**
	 * Handle a loading.
	 */
	reset : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/comic_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.sharepage"));
		
		gBrowser.selectedTab.kaffeeshare_state = "ready";
	},
	
	/**
	 * Handle an error.
	 */
	error : function(msg) {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/error_16x16.png");
		img.setAttribute("tooltiptext", msg);
		
		gBrowser.selectedTab.kaffeeshare_state = "error";
	},
	
	/**
	 * Handle a ok.
	 */
	ok : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/ok_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.ok"));
		
		gBrowser.selectedTab.kaffeeshare_state = "ok";
	},
	
	/**
	 * Handle a loading.
	 */
	loading : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/loading_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.loading"));
		
		gBrowser.selectedTab.kaffeeshare_state = "loading";
	},

	/**
	 * Handle a key down event.
	 */
	keydown : function(event) {

		// Bind to both command (for Mac) and control (for Win/Linux)
		if ( (event.ctrlKey || event.metaKey) && (event.keyCode == 190) ) {
			
			// ctrl + . share a page
			KaffeeShareChrome.BrowserOverlay.share(event);
		}
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

		// Get URL and namespace
		KaffeeShareChrome.BrowserOverlay.url = KaffeeShareChrome.BrowserOverlay.prefs.getCharPref("kaffeeshare-url");
		KaffeeShareChrome.BrowserOverlay.ns = KaffeeShareChrome.BrowserOverlay.prefs.getCharPref("kaffeeshare-ns");
		KaffeeShareChrome.BrowserOverlay.http = KaffeeShareChrome.BrowserOverlay.prefs.getBoolPref("kaffeeshare-http");
		
		KaffeeShareChrome.BrowserOverlay.update();
	},
	
	/**
	 * Clean up after ourselves and save the prefs.
	 */
	shutdown : function() {
		KaffeeShareChrome.BrowserOverlay.prefs.removeObserver("", this);
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
		}

	}
};


window.addEventListener("load", function(e) { KaffeeShareChrome.BrowserOverlay.startup(); }, false);
window.addEventListener("unload", function(e) { KaffeeShareChrome.BrowserOverlay.shutdown(); }, false);
window.addEventListener('keydown', function(e) { KaffeeShareChrome.BrowserOverlay.keydown(e); }, false);
