// the file thing is to block scope all the scripts to avoid variable name conflicts
scrmljs.importScript = function importScript(name, location, finished) {
    let req = new XMLHttpRequest();
    req.onload = function(x) {
        let file = new File(["{"+req.responseText+"\r\n}"], location.replaceAll(/\.\.\//g, ""), {type: "text/js"});
        let url = URL.createObjectURL(file);
        let script = document.createElement("script");
        script.setAttribute("src", url);
        script.addEventListener("load", finished);
        document.head.appendChild(script);
    };
    req.onerror = function(x) {alert("failed to load script " + location)};
    req.open("get", location);
    req.overrideMimeType("text/plaintext");
    req.send();
}

let scriptLocations = scrmljs.scriptLocations, scripts = scrmljs.scripts, filePrefix = scrmljs.filePrefix;
scrmljs.importScript("Loader", filePrefix + "scripts/loader.js", function() {
    let Loader = scrmljs.Loader, scriptLoader = scrmljs.scriptLoader = Loader.newLoader();
    Loader.tiers.js(scriptLoader);
    Loader.tiers.initialize(scriptLoader);
    
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