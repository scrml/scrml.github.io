scrmljs.importScript = function importScript(location, finished) {
    let req = new XMLHttpRequest();
    req.onload = function(x) {
        try {Function("{"+req.responseText+"\r\n}")()}
        catch (e) {
            console.log("error with imported script " + location);
            console.log(req.responseText);
            throw e;
        }
        finished();
    };
    req.onerror = function(x) {alert("failed to load script " + location)};
    req.open("get", location);
    req.overrideMimeType("text/plaintext");
    req.send();
}

let scriptLocations = scrmljs.scriptLocations, scripts = scrmljs.scripts, filePrefix = scrmljs.filePrefix;
scrmljs.importScript(filePrefix + "scripts/loader.js", function() {
    let Loader = scrmljs.Loader, scriptLoader = scrmljs.scriptLoader = Loader.newLoader();
    Loader.tiers.js(scriptLoader);
    
    // add items
    function addScript(name) {
        if (name in scriptLoader.items) return;
        let dependencies = scripts[name].length === 0? {}: {js: {}};
        for (let subscript of scripts[name]) {
            addScript(subscript);
            dependencies.js[subscript] = undefined;
        }
        scriptLoader.addItem(name, dependencies, {js: filePrefix + scriptLocations[name]});
    }
    for (let script in scripts) addScript(script);
});

scrmljs.emptyFunction = function emptyFunction() {}

scrmljs.isEmpty = function isEmpty(obj) {
    for (let prop in obj) if (obj.hasOwnProperty(prop)) return false;
    return true;
}