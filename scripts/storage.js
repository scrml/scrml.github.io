let storage = {
    deactivated: false,
    logAction: emptyFunction
};
storage.fetch = function fetch(name) {
    if (storage.deactivated) return;
    storage.logAction("fetching " + name);
    storage.logAction(window.localStorage.getItem(name));
    try {
        return window.localStorage.getItem(name);
    } catch (e) {}
}
storage.store = function store(name, value) {
    if (storage.deactivated) return;
    storage.logAction("storing " + name);
    storage.logAction(console.log(value));
    try {
        window.localStorage.setItem(name, value);
    } catch (e) {}
}
storage.erase = function erase(name) {
    if (storage.deactivated) return;
    storage.logAction("erasing " + name);
    try {
        window.localStorage.removeItem(name);
    } catch (e) {}
}
storage.move = function move(from, to) {
    storage.logAction("moving "+from+" to "+to);
    let value = storage.fetch(from);
    storage.erase(from);
    storage.store(to, value);
}