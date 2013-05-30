/**
 * KaffeeShare namespace.
 */
if ("undefined" == typeof(KaffeeShareChrome)) {
	var KaffeeShareChrome = {};
};

/**
 * Worker thread to request new shares.
 */
KaffeeShareChrome.NewsWorker = {

	server : "",
	ns : "",
	working : false,
	updated : 0,

	/**
	 * Check for new shared pages.
	 */
	checkForNews : function() {

		if (KaffeeShareChrome.NewsWorker.working) return;
		KaffeeShareChrome.NewsWorker.working = true;

		var url =	KaffeeShareChrome.NewsWorker.server +
					"/json?op=updated&ns=" + 
					KaffeeShareChrome.NewsWorker.ns;

		var request = new XMLHttpRequest();
		request.open("GET", url, false);
		request.send();

		try {
			var resp = JSON.parse(request.responseText);

			// New shared pages avail?
			if (KaffeeShareChrome.NewsWorker.updated < resp.last_update) {
				KaffeeShareChrome.NewsWorker.updated = resp.last_update;
				KaffeeShareChrome.NewsWorker.working = false;
				postMessage(KaffeeShareChrome.NewsWorker.updated);
			} else {
				KaffeeShareChrome.NewsWorker.working = false;
			}
		} catch(e) {
			KaffeeShareChrome.NewsWorker.working = false;
		}

	},

	/**
	 * Run the periodic request.
	 */
	run : function(server, ns, updated) {
		KaffeeShareChrome.NewsWorker.server = server;
		KaffeeShareChrome.NewsWorker.ns = ns;
		KaffeeShareChrome.NewsWorker.updated = updated,

		KaffeeShareChrome.NewsWorker.checkForNews();

		// Call checkForNews every 60 seconds
		setInterval(KaffeeShareChrome.NewsWorker.checkForNews, 1*60*1000); 
	}
	
};

onmessage = function(event) {
	KaffeeShareChrome.NewsWorker.run(event.data.server, event.data.ns, event.data.updated);
}

