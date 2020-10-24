let storage = {deactivated: false};
storage.fetch = function fetch(name) {
    if (storage.deactivated) return;
    /*/
    console.log("fetching " + name);
    console.log(window.localStorage.getItem(name));
    //*/
    try {
        return window.localStorage.getItem(name);
    } catch (e) {}
}
storage.store = function store(name, value) {
    if (storage.deactivated) return;
    /*/
    console.log("storing " + name);
    console.log(value);
    //*/
    try {
        window.localStorage.setItem(name, value);
    } catch (e) {}
}
storage.erase = function erase(name) {
    if (storage.deactivated) return;
    //console.log("erasing " + name);
    try {
        window.localStorage.removeItem(name);
    } catch (e) {}
}
storage.move = function move(from, to) {
    //console.trace("moving "+from+" to "+to);
    let value = storage.fetch(from);
    storage.erase(from);
    storage.store(to, value);
}