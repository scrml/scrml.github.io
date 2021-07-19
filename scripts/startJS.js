{
    let loaderScript = document.createElement("script"),
        scriptLocations = scrmljs.scriptLocations,
        scripts = scrmljs.scripts,
        filePrefix = scrmljs.filePrefix;
    loaderScript.setAttribute("src", scrmljs.filePrefix + "scripts/loader.js");
    loaderScript.addEventListener("load", function() {
        let Loader = scrmljs.Loader,
            scriptLoader = scrmljs.scriptLoader = Loader.newLoader();
        Loader.tiers.js(scriptLoader);
        
        // add items
        function addScript(name) {
            if (name in scriptLoader.items) return;
            let dependencies = scripts[name].length === 0? {}: {js: {}};
            for (let subscript of scripts[name]) {
                addScript(subscript);
                dependencies.js[subscript] = undefined;
            }
            scriptLoader.addItem(name, dependencies, {js: filePrefix+scriptLocations[name]});
        }
        for (let script in scripts) addScript(script);
    });
    document.head.appendChild(loaderScript);
}

scrmljs.emptyFunction = function emptyFunction() {}

scrmljs.isEmpty = function isEmpty(obj) {
    for (let prop in obj) return false;
    return true;
}