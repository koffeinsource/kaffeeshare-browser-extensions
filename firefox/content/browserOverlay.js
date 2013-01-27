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
	stringBundle : null,

	/**
	 * Share the current page.
	 */
	share : function(aEvent) {
		
		if(KaffeeShareChrome.BrowserOverlay.url == "" || KaffeeShareChrome.BrowserOverlay.ns == "" ) {
			return;
		}
		
		var shareUrl = "https://" + KaffeeShareChrome.BrowserOverlay.url 
						+ "/oneclickshare?ns="
						+ KaffeeShareChrome.BrowserOverlay.ns 
						+ "&url="
						+ encodeURIComponent(document.getElementById("urlbar").value);
		
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

		KaffeeShareChrome.BrowserOverlay.loading();
	},
	
	/**
	 * Handle a location change.
	 */
	locationChange : function(progress, request, uri) {
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
	},
	
	/**
	 * Handle an error.
	 */
	error : function(msg) {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/error_16x16.png");
		img.setAttribute("tooltiptext", msg);
	},
	
	/**
	 * Handle a ok.
	 */
	ok : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/ok_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.ok"));
	},
	
	/**
	 * Handle a loading.
	 */
	loading : function() {
		var img = document.getElementById("kaffeeshare-share-button");
		img.setAttribute("src", "chrome://kaffeeshare/skin/loading_16x16.png");
		img.setAttribute("tooltiptext", KaffeeShareChrome.BrowserOverlay.stringBundle.getString("kaffeeshare.loading"));
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
		}

	}
};


// Add listeners
gBrowser.addProgressListener( { onLocationChange : function(aWebProgress,aRequest,aLocation) { KaffeeShareChrome.BrowserOverlay.locationChange(aWebProgress,aRequest,aLocation); },
								onStateChange: function(aWebProgress,aRequest, aStateFlags, aStatus) {},
								onProgressChange: function(aWebProgress,aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},
								onStatusChange: function(aWebProgress,aRequest, aStatus, aMessage) {},
								onSecurityChange: function(aWebProgress,aRequest, aState) {} 
							  });

window.addEventListener("load", function(e) { KaffeeShareChrome.BrowserOverlay.startup(); }, false);
window.addEventListener("unload", function(e) { KaffeeShareChrome.BrowserOverlay.shutdown(); }, false);
window.addEventListener('keydown', function(e) { KaffeeShareChrome.BrowserOverlay.keydown(e); }, false);
