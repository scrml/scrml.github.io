let storage = scrmljs.storage = {
    deactivated: false,
    logAction: scrmljs.emptyFunction,
    storageObject: window.localStorage
}

storage.fetch = function fetch(name) {
    if (storage.deactivated) return;
    storage.logAction("fetching " + name);
    storage.logAction(storage.storageObject.getItem(name));
    return storage.storageObject.getItem(name);
}

storage.store = function store(name, value) {
    if (storage.deactivated) return;
    storage.logAction("storing " + name);
    storage.logAction(value);
    storage.storageObject.setItem(name, value);
}

storage.erase = function erase(name) {
    if (storage.deactivated) return;
    storage.logAction("erasing " + name);
    storage.storageObject.removeItem(name);
}

storage.move = function move(from, to) {
    storage.logAction("moving "+from+" to "+to);
    let value = storage.fetch(from);
    storage.erase(from);
    storage.store(to, value);
}