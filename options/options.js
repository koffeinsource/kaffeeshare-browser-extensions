function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    server: document.querySelector("#server").value,
    namespace: document.querySelector("#namespace").value
  });
}

function restoreOptions() {

  function setCurrentChoice(result) {
    document.querySelector("#server").value = result.server || "kaffeeshare.appspot.com";
    document.querySelector("#namespace").value = result.namespace || "temp";
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  var getting = browser.storage.local.get("color");
  getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
