let scriptLoader = scrmljs.scriptLoader,
    gui,
    filePrefix = scrmljs.filePrefix,
    emptyFunction = scrmljs.emptyFunction,
    storage = scrmljs.storage,
    guiWorkerLink,
    root,
    pageLinks = {},
    fullPageNameOptions = scrmljs.fullPageNameOptions = {},
    fullPageNameOptionsByName = scrmljs.fullPageNameOptionsByName = {},
    allFullPageNames = scrmljs.allFullPageNames = document.getElementById("allfullpagenames"),
    worker, 
    workerFunctions = {log: console.log},
    loadingScreen,
    xml,
    fileConversion,
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
scriptLoader.ensureJS("statement", ["page"], filePrefix + "scripts/guiLinks/statement.js");
//scriptLoader.ensureJS("jax");
scriptLoader.ensureJS("xml");
scriptLoader.items.xml.addEphemeralListener("js", function() {xml = scrmljs.xml});
scriptLoader.ensureJS("fileConversion", ["storage", "xml", "gui"]);
scriptLoader.items.fileConversion.addEphemeralListener("js", function() {fileConversion = scrmljs.fileConversion});
scriptLoader.addEphemeralListener(function start() {
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
            // force the program to halt even if the worker tries continuing
            worker.onmessage = emptyFunction;
            throw x;
        }
    }
    
    //workerFunctions.showChapter = guiWorkerLink.linkCreators.chapter;
    
    workerFunctions.start = function() {
        bothInitialized.worker = true;
        checkStartLoadingPages();
    }
    
    // first set the page modes to agree with what buttons are pressed, in case the button presses were cached by the browser
    for (let pageNumberMode of ["pagenumber", "fullpagenumber"]) if (document.getElementById(pageNumberMode).checked) editor.setAttribute("pagenumbermode", pageNumberMode);
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
let editor = scrmljs.editor = document.body.querySelector(".editor"), nameModeButton = document.getElementById("nodenamemode"), nicknameModeButton = document.getElementById("nicknamemode"), debugButton = document.getElementById("debugbutton"), importButton = document.getElementById("importbutton"), exportbutton = document.getElementById("exportbutton");

let setDebugAction = function setDebugAction(action) {
    debugButton.setAttribute("title", action.toString());
    debugButton.onclick = action;
}

switch (1) {
    case 0: 
        setDebugAction(function() {
          window.localStorage.clear();
          window.location.reload();
        });
    break; case 1:
        setDebugAction(function() {
            let pn = 0, line, lineOut = "saves:";
            while (line = storage.fetch("page " + pn++)) lineOut += "\npage " + (pn-1) + ":\n"+line;
            document.getElementById("errorout").textContent = lineOut;
        });
    break; case 2:
        setDebugAction(function() {
            document.getElementById("errorout").textContent = xml.nodeToString(fileConversion.autosaveToDoc());
        })
}

// configuration parameters
let smoothDuration = .3, newPageHeight;

// io buttons
importButton.addEventListener("click", importSCRMLFileFromUser);
exportbutton.addEventListener("click", function() {post("exportSCRMLFile")});

// page display mode section
let pageNumberListener = function(e) {editor.setAttribute("pagenumbermode", e.target.getAttribute("id"))}
for (let pageNumberMode of ["pagenumber", "fullpagenumber"]) document.getElementById(pageNumberMode).addEventListener("change", pageNumberListener);
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

workerFunctions.newPage = function newPage(pageId, pageType) {
    let option;
    switch (pageType) {
        case "statement": 
            option = fullPageNameOptions[pageId] = gui.element("option", allFullPageNames, ["value", "full page name here", "pageid", pageId]);
        break;
    }
}

workerFunctions.changePageId = function changePageId(newId, oldId) {
    let option = fullPageNameOptions[oldId];
    delete fullPageNameOptions[oldId];
    fullPageNameOptions[newId] = option;
    option.setAttribute("pageid", newId);
    storage.move("page " + oldId, "page " + newId);
}

scrmljs.getPageIdFromFullName = function getPageIdFromFullName(fullName) {
    return fullPageNameOptionsByName[fullName].getAttribute("pageid");
}

window.setTimeout(function() {
    //gui.popups.inputText(editor);
}, 2000);

workerFunctions.deletePage = function deletePage(pageId) {
    storage.erase("page " + pageId);
    let option = fullPageNameOptions[pageId];
    if (!option) return;
    gui.orphan(option);
    delete fullPageNameOptions[pageId];
    delete fullPageNameOptionsByName[option.value];
}

workerFunctions.fullPageNameUpdate = function fullPageNameUpdate(pageId, fullPageName) {
    let option = fullPageNameOptions[pageId];
    delete fullPageNameOptionsByName[option.value];
    option.value = fullPageName;
    fullPageNameOptionsByName[fullPageName] = option;
}

workerFunctions.smoothMode = function smoothMode(smoothMode) {
    scrmljs.doSmoothly = smoothMode;
}

workerFunctions.savePage = function save(pageId, line) {
    storage.store("page " + pageId, line);
}

workerFunctions.errorOut = function errorOut(message) {
    document.getElementById("errorout").textContent = message;
}

// this file io will eventually be moved into a gui module

function importSCRMLFileFromUser() {
    //if (1>0) return importSCRMLFile(xml.parseDoc(storage.fetch("file")));
    let input = gui.element("input", importButton.parentElement, ["type", "file", "hide", ""], importButton);
    input.addEventListener("change", function() {
        let file = input.files[0], url = URL.createObjectURL(file), req = new XMLHttpRequest();
        req.addEventListener("load", function() {
            try {
                importSCRMLFile(req.responseXML);
            } catch (e) {
                document.getElementById("errorout").textContent = e.message;
                throw e;
            }
        });
        req.open("GET", url);
        req.overrideMimeType("text/xml");
        req.send();
        gui.orphan(input);
    });
    input.click();
}

function importSCRMLFile(doc) {
    if (!doc) throw Error("not a valid xml file");
    xml.trim(doc);
    let docRoot = xml.getRoot(doc);
    switch (docRoot.getAttribute("format")) {
        case "editor":
            importSCRMLFileEditor(doc);
        break; default: throw Error("do not recognize how to read this file");
    }
}

scrmljs.loadExample = function loadExample() {
    let req = new XMLHttpRequest();
    req.addEventListener("load", function() {
        importSCRMLFile(req.responseXML);
    });
    req.open("GET", "https://raw.githubusercontent.com/scrml/scrml.github.io/master/scrml/GRML.scrml");
    req.overrideMimeType("application/xml");
    req.send();
}

function importSCRMLFileEditor(doc) {
    let docRoot = xml.getRoot(doc), pageId = 0, ui = 1, rootPage, autosaves = [];
    while (doc.nodeType !== 9) doc = doc.parentElement;
    for (let pageNode of docRoot.querySelectorAll("[pageType]")) {
        if (pageId === 0) rootPage = pageNode;
        pageNode.setAttribute("pageId", pageId);
        autosaves[pageId] = pageNode.getAttribute("pageType")+"\n"+pageNode.nodeName+"\n"+(pageNode.hasAttribute("nickname")? pageNode.getAttribute("nickname"):"")+"\n"+(pageNode.hasAttribute("open")?"o":"c");
        ++pageId;
        if (pageNode.getAttribute("pageType") === "statement") pageNode.setAttribute("ui", ui++);
    }
    let pageNodesByFullName = {};
    function assignFullNames(node) {
        let prefix = node.parentElement.hasAttribute("pageType")? node.parentElement.getAttribute("fullName") + "/": "";
        node.setAttribute("fullName", prefix + node.nodeName);
        pageNodesByFullName[node.getAttribute("fullName")] = node;
        if (node.getAttribute("pageType") === "chapter") for (let childNode of node.children) if (childNode.hasAttribute("pageType")) assignFullNames(childNode);
    }
    assignFullNames(rootPage);
    for (let chapterNode of docRoot.querySelectorAll("[pageType=\"chapter\"]")) {
        let pageId = chapterNode.getAttribute("pageId"), childrenLine = "";
        for (let childNode of chapterNode.querySelectorAll("[pageId=\""+pageId+"\"] > [pageType]")) childrenLine += " " + childNode.getAttribute("pageId");
        childrenLine = childrenLine.substring(1);
        autosaves[pageId] += "\n" + childrenLine;
    }
    for (let statementNode of docRoot.querySelectorAll("[pageType=\"statement\"]")) {
        let pageId = statementNode.getAttribute("pageId"), typesNode = statementNode.querySelector("[pageId=\""+pageId+"\"] > types"), termsNode = statementNode.querySelector("[pageId=\""+pageId+"\"] > terms"), line = autosaves[pageId], termLine;
        if (!typesNode) typesNode = gui.elementDoc(doc, "types", statementNode);
        if (!termsNode) termsNode = gui.elementDoc(doc, "terms", statementNode);
        let types = [], typesByName = {};
        for (let childNode of typesNode.children) {
            typesByName[childNode.nodeName] = types.length;
            types.push({
                name: childNode.nodeName,
                fullName: childNode.textContent,
                ui: pageNodesByFullName[childNode.textContent].getAttribute("ui"),
                id: types.length,
                encountered: false
            });
        }
        let terms = [], termsByName = {};
        for (let childNode of termsNode.children) {
            termsByName[childNode.getAttribute("name")] = terms.length;
            terms.push({
                name: childNode.getAttribute("name"),
                type: childNode.nodeName,
                typeId: typesByName[childNode.nodeName],
                node: childNode,
                id: terms.length
            });
        }
        line += "\n"+(statementNode.hasAttribute("inUniverse")? "i": "o");
        line += "\n"+terms.length;
        let termType;
        for (let term of terms) {
            termType = types[typesByName[term.type]];
            if (typeof termType === "undefined") throw Error("cannot find term type " + term.type);
            termLine = term.name+" "+(termType.ui)+(termType.encountered?"":" "+termType.name);
            termType.encountered = true;
            for (let childNode of term.node.childNodes) {
                if (!(childNode.textContent in termsByName)) throw Error("cannot find term " + childNode.textContent);
                termLine += " "+childNode.nodeName+" "+(terms[termsByName[childNode.textContent]].id+1);
            }
            line += "\n"+termLine;
        }
        autosaves[pageId] = line;
    }
    pageId = 0;
    while ((line = storage.fetch("page " + pageId)) !== null) storage.erase("page " + pageId++);
    pageId = 0;
    while (pageId < autosaves.length) storage.store("page "+pageId, autosaves[pageId++]);
    window.location.reload();
}

function errorOut(message) {
    document.getElementById("errorout").textContent = message;
}

function saveTextFile(fileLine, fileName, fileExtension = ".scrml", fileType = "text/xml") {
    //if (1>0) return document.getElementById("errorout").textContent = fileLine;
    let file = new File([fileLine], fileName+fileExtension, {type: fileType});
    // make and click an appropriate download link
    let url = URL.createObjectURL(file);
    let a = gui.element("a", document.body, ["href", url, "download", ""]);
    gui.text("download link", a);
    a.click();
    gui.orphan(a);
}

workerFunctions.saveTextFile = saveTextFile;

let onInactivity = function onInactivity() {
    
}

// processing of TeX in a node attribute to make it ready to display as the innerHTML of something
let texAttToInnerHTML = function texAttToInnerHTML(line) {
    return line.replaceAll(/\n/g, "<br>");
}