var scriptLoader;

{
    let loaderScript = document.createElement("script");
    loaderScript.setAttribute("src", filePrefix + "scripts/loader.js");
    loaderScript.onload = function() {
        scriptLoader = Loader.newLoader();
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
    };
    document.head.appendChild(loaderScript);
}

function emptyFunction() {}

function isEmpty(obj) {
    for (let prop in obj) return false;
    return true;
}