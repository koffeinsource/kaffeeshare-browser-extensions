
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	var url = null;
	try {
		url = jQuery('#current-entry .entry-title-link').attr('href');
	} catch (e) {
	}
	sendResponse({
		urltoshare : url
	});
});
