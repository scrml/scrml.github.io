pages = scrmljs.idManager.newManager("pageId");

pages.eraseItemHook = function(id) {
    delete pageTickets.items[id];
    postMessage(["deleteAutosaveEntry", id]);
}

guiLinks = scrmljs.idManager.newManager("linkId");

guiLinks.eraseItemHook = function(id) {
    delete guiLinkTickets.items[id];
}

postMessage(["start"]);