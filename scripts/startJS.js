{
    // scripts which will be loaded
    let scripts = {
        PageSetup: "scripts/pageSetup.js",
        gui: "scripts/gui.js",
        drawBanner: "graphics/drawBanner.js"
    };
    
    //load script manager and use it to open the scripts given above
    let script = document.createElement("script");
    script.setAttribute("src", "scripts/scriptManager.js");
    script.onload = function() {
        for (let s in scripts) ScriptManager.openScript(scripts[s], s);
    };
    document.head.appendChild(script);
}