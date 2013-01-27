chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	var url = null;
	try {
		// get url to share
		url = jQuery('#current-entry .entry-title-link').attr('href');
		
		// find element to observe
		var target = document.getElementById('current-entry');
 
		// create an observer instance
		var observer = new WebKitMutationObserver(function(mutations) {
			chrome.extension.sendMessage({
				reset_icon : true
			}, function(response) {
				// Do stuff on successful response
				observer.disconnect();
			});
		});
 
		// configuration of the observer:
		var config = { attributes: true, childList: true, characterData: true, subtree: true }
		 
		// pass in the target node, as well as the observer options
		observer.observe(target, config);
	} catch (e) {
	}
	sendResponse({
		urltoshare : url
	});
});
