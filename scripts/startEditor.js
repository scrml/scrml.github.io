let scriptLoader = scrmljs.scriptLoader,
    gui,
    filePrefix = scrmljs.filePrefix,
    storage = scrmljs.storage,
    guiWorkerLink,
    root,
    pageLinks = {},
    worker, 
    workerFunctions = {log: console.log},
    loadingScreen,
    bothInitialized = {editor: false, worker: false};

scrmljs.lockedPageFocus = false;
document.getElementById("errorout").textContent = "Loading components ...";

// load required scripts
scriptLoader.ensureJS("gui", ["generalFunctions"]);
scriptLoader.items.gui.addEphemeralListener("js", function() {
    gui = scrmljs.gui;
    document.getElementById("errorout").textContent = "Loading gui modules ...";
    gui.ensureAllModules(function() {document.getElementById("errorout").textContent = "Modules loaded"});
});
scriptLoader.ensureJS("guiWorkerLink", ["gui", "overloadManager"]);
scriptLoader.items.guiWorkerLink.addEphemeralListener("js", function() {
    guiWorkerLink = scrmljs.guiWorkerLink;
    worker = new Worker(filePrefix+"scripts/worker.js");
    mainLink = scrmljs.mainLink = guiWorkerLink.openGuiWorkerLink(workerFunctions, "host", worker);
});
scriptLoader.ensureJS("page", ["guiWorkerLink"], filePrefix + "scripts/guiLinks/page.js");
scriptLoader.ensureJS("chapter", ["page"], filePrefix + "scripts/guiLinks/chapter.js");
scriptLoader.ensureJS("jax");
scriptLoader.addEphemeralListener(function start() {
    //getLinkFromElement = guiWorkerLink.types.page.getLinkFromEvent;
    // Loading screen setup: Loading screen opens any time the worker is told to do something, blocking the gui from taking input while the worker processes its thing. Its message is updated any time the worker responds. If the loading screen is ever up long enough for the user to see it, this will keep the message changing as things happen and will show no change if something gets stuck. There is an inactivity timer tied to the loading screen too, if the loading screen is unused for long enough then the timer fires an inactivity function.
    
    let activityTimer = scrmljs.newTimer(onInactivity, 10000);
    
    loadingScreen = gui.loadingScreen(editor);
    loadingScreen.loadingTitle.nodeValue = "Working...";
    
    workerFunctions.setLoadingScreen = function(message) {
        loadingScreen.openLoadingScreen(message);
        activityTimer.restart();
    }
    
    workerFunctions.closeLoadingScreen = function() {
        loadingScreen.closeLoadingScreen();
        activityTimer.restart();
    }
    
    // all messages start with the name of the response handler function then list the arguments to give that handler
    worker.onmessage = function onmessage(e) {
        //console.log("received message from worker " + e.data);
        let line = e.data.toString();
        try {
            workerFunctions[e.data.shift()](...e.data);
        } catch (x) {
            document.getElementById("errorout").textContent = line + "\n" + x.message;
            throw x;
        }
    }
    
    //workerFunctions.showChapter = guiWorkerLink.linkCreators.chapter;
    
    workerFunctions.start = function() {
        bothInitialized.worker = true;
        checkStartLoadingPages();
    }
    
    // first set the page modes to agree with what buttons are pressed, in case the button presses were cached by the browser
    for (let pageNumberMode of ["siblingnumber", "fullpagenumber"]) if (document.getElementById(pageNumberMode).checked) editor.setAttribute("pagenumbermode", pageNumberMode);
    for (let nameMode of ["nodenamemode", "nicknamemode", "fullnamemode"]) if (document.getElementById(nameMode).checked) editor.setAttribute("namemode", nameMode);
    for (let pageAction of ["chapter", "statement", "comment"]) if (document.getElementById("new"+pageAction+"mode").checked) {
        editor.setAttribute("pageaction", "new"+pageAction+"mode");
        scrmljs.pageMode = pageAction;
    }
    
    // make root chapter/saved pages
    if (!storage.fetch("page 0")) storage.store("page 0", "chapter\nBook\n\no\n");
    bothInitialized.editor = true;
    checkStartLoadingPages();
    
    function checkStartLoadingPages() {
        if (bothInitialized.editor && bothInitialized.worker) loadPages();
    }
});

// DOM elements
let editor = scrmljs.editor = document.body.querySelector(".editor"), nameModeButton = document.getElementById("nodenamemode"), nicknameModeButton = document.getElementById("nicknamemode"), debugButton = document.getElementById("debugbutton");

let setDebugAction = function setDebugAction(action) {
    debugButton.setAttribute("title", action.toString());
    debugButton.onclick = action;
}

switch (1) {
    case 0: 
        setDebugAction(function() {
            localStorage.clear();
            localStorage.setItem("page 0", "chapter\nBook\n\no\n1 2");
            localStorage.setItem("page 1", "chapter\nfirstChild\nFirst Child\nc\n");
            localStorage.setItem("page 2", "chapter\nsecondChild\nSecond Child\nc\n");
            window.location.reload();
        });
    break; case 1:
        setDebugAction(function() {
            let pn = 0, line, lineOut = "saves:";
            while (line = storage.fetch("page " + pn++)) lineOut += "\npage " + (pn-1) + ":\n"+line;
            document.getElementById("errorout").textContent = lineOut;
        });
    break;
}

// configuration parameters
let smoothDuration = .3, newPageHeight;

// page display mode section
let pageNumberListener = function(e) {editor.setAttribute("pagenumbermode", e.target.getAttribute("id"))}
for (let pageNumberMode of ["siblingnumber", "fullpagenumber"]) document.getElementById(pageNumberMode).addEventListener("change", pageNumberListener);
let nameModeListener = function(e) {editor.setAttribute("namemode", e.target.getAttribute("id"))}
for (let nameMode of ["nodenamemode", "nicknamemode", "fullnamemode"]) document.getElementById(nameMode).addEventListener("change", nameModeListener);
for (let pageAction of ["chapter", "statement", "comment"]) document.getElementById("new"+pageAction+"mode").addEventListener("change", function() {
    editor.setAttribute("pageaction", "new"+pageAction+"mode");
    scrmljs.pageMode = pageAction;
    for (let gap of document.querySelectorAll(".newpagein")) gap.setAttribute("placeholder", "new " + pageAction);
});

// functions to be initialized
let getLinkFromElement;

let post = scrmljs.post = function post(functionName, ...args) {
    workerFunctions.setLoadingScreen(functionName + ": " + scrmljs.commaJoin(args));
    worker.postMessage([functionName, ...args]);
}

let loadPages = function loadPages() {
    document.getElementById("errorout").textContent = "";
    post("openPageProcess");
    scrmljs.doSmoothly = false;
    let i = -1, line;
    while (line = storage.fetch("page " + ++i)) post("preloadPageFromAutosave", i, line);
    post("flushLoadPagesFromAutosave");
    post("closePageProcess");
}

workerFunctions.pseudoPost = post;

workerFunctions.changeLinkId = function changeLinkId(oldId, newId) {
    guiWorkerLink.links[oldId].setLinkId(newId);
}

let getPageFromLinkId = function getPageFromLinkId(linkId) {
    let page = guiWorkerLink.links[linkId];
    if (!page || !page.isPage) throw Error("link " + linkId + " is not a page");
    return page;
}

workerFunctions.smoothMode = function smoothMode(smoothMode) {
    scrmljs.doSmoothly = smoothMode;
}

workerFunctions.savePage = function save(pageId, line) {
    storage.store("page " + pageId, line);
}

workerFunctions.moveAutosaveEntry = function moveAutosaveEntry(oldPageId, newPageId) {
    storage.move("page " + oldPageId, "page " + newPageId);
}

workerFunctions.deleteAutosaveEntry = function deleteAutosaveEntry(pageId) {
    storage.erase("page " + pageId);
}

workerFunctions.errorOut = function errorOut(message) {
    document.getElementById("errorout").textContent = message;
}

let onInactivity = function onInactivity() {
    
}

// processing of TeX in a node attribute to make it ready to display as the innerHTML of something
let texAttToInnerHTML = function texAttToInnerHTML(line) {
    return line.replaceAll(/\n/g, "<br>");
}