{
    // scripts which will be loaded
    let scripts = {
        PageSetup: "pageScripts/pageSetup.js",
        gui: "pageScripts/gui.js"
    };
    
    //load script manager and use it to open the scripts given above
    let script = document.createElement("script");
    script.setAttribute("src", "pageScripts/scriptManager.js");
    script.onload = function() {
        for (let s in scripts) ScriptManager.openScript(scripts[s], s);
    };
    document.head.appendChild(script);
}