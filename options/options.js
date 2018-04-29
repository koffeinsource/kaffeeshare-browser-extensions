function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    server: document.querySelector("#server").value,
    namespace: document.querySelector("#namespace").value
  });
}

function restoreOptions() {

  function setCurrentChoice(result) {
    document.querySelector("#server").value = result[0].server || "kaffeeshare.appspot.com";
    document.querySelector("#namespace").value = result[1].namespace || "temp";
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  Promise.all([browser.storage.local.get("server"), browser.storage.local.get("namespace")]).then(res => setCurrentChoice(res)).catch(onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
