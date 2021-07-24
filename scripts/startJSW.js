{
    let scriptLocations = scrmljs.scriptLocations,
        scripts = scrmljs.scripts,
        filePrefix = scrmljs.filePrefix;
    scrmljs.importWorkerScript(filePrefix + "scripts/loader.js", function() {
        let Loader = scrmljs.Loader,
            scriptLoader = scrmljs.scriptLoader = Loader.newLoader();
        Loader.tiers.jsw(scriptLoader);
        
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
}

scrmljs.emptyFunction = function emptyFunction() {}

scrmljs.isEmpty = function isEmpty(obj) {
    for (let prop in obj) return false;
    return true;
}