function updateMessage(line) {postMessage(["errorOut", line])};

// script setup
let pageTickets, pages, guiLinks, idManager, overloadManager, mainLink, TypedGraph, functions = {}, scrmljs = {
    filePrefix: "../",
    scriptLocations : {
        generalFunctions: "scripts/generalFunctions.js",
        idManager: "scripts/idManager.js",
        varManager: "scripts/varManager.js",
        overloadManager: "scripts/overloadManager.js",
        guiWorkerLink: "scripts/guiWorkerLink.js",
        page: "scripts/guiLinks/page.js",
        chapter: "scripts/guiLinks/chapter.js",
        Graph: "scripts/Graph.js",
        TypedGraph: "scripts/TypedGraph.js",
        statement: "scripts/guiLinks/statement.js"
    }, scripts: {
        generalFunctions: [],
        idManager: ["generalFunctions"],
        varManager: ["idManager"],
        overloadManager: [],
        guiWorkerLink: ["varManager", "idManager", "overloadManager"],
        page: ["guiWorkerLink"],
        chapter: ["page"],
        Graph: ["varManager", "idManager", "generalFunctions"],
        TypedGraph: ["Graph"],
        statement: ["chapter"]
    }, isEmpty: function isEmpty(obj) {
        for (let prop in obj) if (Object.hasOwnProperty(prop)) return false;
        return true;
    }, emptyFunction: function emptyFunction() {}, trueFunction: function() {return true}
}, emptyFunction = scrmljs.emptyFunction, trueFunction = scrmljs.trueFunction, isEmpty = scrmljs.isEmpty, universe, allGraphs;

scrmljs.importScript = function importScript(name, location, finished) {
    updateMessage("worker loading " + location);
    let req = new XMLHttpRequest();
    req.onload = function(x) {
        try {Function("{"+req.responseText+"\r\n}")()}
        catch (e) {
            console.log("error with imported script " + location);
            //console.log(req.responseText);
            throw e;
        }
        finished();
    };
    req.onerror = function(x) {updateMessage("worker failed to load script " + location)};
    req.open("get", location);
    req.overrideMimeType("text/plaintext");
    req.send();
}

// load scripts and initialize script variables
scrmljs.importScript("Loader", scrmljs.filePrefix + "scripts/loader.js", function() {
    let Loader = scrmljs.Loader, scriptLoader = scrmljs.scriptLoader = Loader.newLoader();
    Loader.tiers.js(scriptLoader);
    Loader.tiers.initialize(scriptLoader);
    function addScript(name) {
        if (name in scriptLoader.items) return;
        let dependencies = scrmljs.scripts[name].length === 0? {}: {js: {}};
        for (let subscript of scrmljs.scripts[name]) {
            addScript(subscript);
            dependencies.js[subscript] = undefined;
        }
        scriptLoader.addItem(name, dependencies, {js: scrmljs.filePrefix+scrmljs.scriptLocations[name]});
    }
    for (let script in scrmljs.scripts) addScript(script);
    scriptLoader.items.idManager.addEphemeralListener("js", function() {
        idManager = scrmljs.idManager;
        pages = idManager.newManager("pageId");
    });
    scriptLoader.items.overloadManager.addEphemeralListener("js", function() {overloadManager = scrmljs.overloadManager});
    scriptLoader.items.guiWorkerLink.addEphemeralListener("js", function() {
        mainLink = scrmljs.mainLink = scrmljs.guiWorkerLink.openGuiWorkerLink(functions, "worker", function(...args) {postMessage(args)});
        mainLink.getIdManagerForLinks("linkId");
    });
    scriptLoader.items.TypedGraph.addEphemeralListener("js", function() {
        TypedGraph = scrmljs.Graph.TypedGraph;
        universe = scrmljs.Graph.universe;
        allGraphs = scrmljs.Graph.allGraphs;
        initializeGraphProtoForWorker();
    });
    scriptLoader.addEphemeralListener(function() {
        pageTickets = scrmljs.pageTickets = overloadManager.newOverloadManager();
        pageTickets.name = "pageTickets";
        pageTickets.openProcess = function openProcess(line) {
            overloadManager.protoModel.openProcess.call(this);
            updateMessage(line);
        }
        pageTickets.closeProcessHook = function() {
            mainLink.flushErase();
            pages.flushErase();
            postMessage(["closeLoadingScreen"]);
        };
        pageTickets.addTicketFunction("save", function(pageId) {postMessage(["savePage", pageId, getPageFromPageId(pageId).saveToAutosaveString()])});
        updateMessage = function updateMessage(line) {postMessage(["setLoadingScreen", line])};
        postMessage(["start"]);
    });
});

// handle incoming messages
onmessage = function onmessage(e) {
    let line = e.data.toString();
    pageTickets.openProcess(line);
    try {
        let line = e.data.toString();
        functions[e.data.shift()](...e.data);
        pageTickets.closeProcess();
    } catch (x) {
        console.log("worker error " + line + "\n" + x.message);
        updateMessage("worker error " + line + "\n" + x.message);
        throw x;
    }
}

//function fetched(type, id, dataName, ...data) {postMessage(["fetched", type, id, dataName, ...data])}

function getPageFromPageId(pageId) {
    return pages.items[pageId];
}

function getPageFromLinkId(linkId) {
    if (linkId === "none") return "none";
    let returner = mainLink.links.items[linkId];
    if (!returner || !returner.isPage) throw Error("link " + linkId + " is not a page");
    return returner.page;
}

let pageProto = {}, chapterProto = Object.create(pageProto), statementProto = Object.create(pageProto), commentProto = Object.create(pageProto), guiLinkSetups = {};

functions.log = console.log;

functions.printAll = function() {
    console.log(scrmljs);
};

pageProto.isPage = true;

function newPage(name, nickname = "", protoModel = pageProto) {
    let returner = Object.create(protoModel);
    pages.addItem(returner);
    returner.manager = scrmljs.newVarManager();
    returner.manager.setVarValue("pageId", returner.pageId);
    returner.manager.linkProperty("pageId", returner);
    returner.manager.setVarValue("name", name);
    returner.manager.linkProperty("name", returner);
    returner.manager.linkListener("name", function(newName) {returner.updateFullName()});
    returner.manager.linkListener("name", function() {returner.preSave()});
    returner.manager.setVarValue("nickname", nickname);
    returner.manager.linkProperty("nickname", returner);
    returner.manager.linkListener("nickname", function() {returner.preSave()});
    returner.manager.setVarValue("siblingNumber", 0);
    returner.manager.linkProperty("siblingNumber", returner);
    returner.manager.linkListener("siblingNumber", function(siblingNumber) {
        returner.updateFullPageNumber(siblingNumber);
        if (returner.nextPage) returner.nextPage.manager.setVarValue("siblingNumber", siblingNumber+1);
    });
    returner.manager.setVarValue("fullPageNumber", 0);
    returner.manager.linkProperty("fullPageNumber", returner);
    returner.manager.linkListener("fullPageNumber", function(fullPageNumber) {returner.updateFullName()});
    returner.manager.setVarValue("fullName", name);
    returner.manager.linkProperty("fullName", returner);
    returner.isOpen = false;
    returner.guiLink = false;
    returner.isVisible = false;
    returner.preSave();
    return returner;
}

let newPageByType = {
    chapter: newChapter,
    statement: newStatement
}

pageProto.showPage = function showPage(show) {
    if (show === this.isVisible) return;
    if (show) mainLink.types.page.extensions[this.pageType].type.createLink(this);
    else {
        this.guiLink.eraseLink();
        delete this.guiLink;
    }
    this.isVisible = show;
}

pageProto.canChangeName = function canChangeName(newName) {
    let sibling = this;
    while (sibling = sibling.previousPage) if (sibling.name === newName) return false;
    sibling = this;
    while (sibling = sibling.nextPage) if (sibling.name === newName) return false;
    return true;
}

let preLoaders = [];

functions.preloadPageFromAutosave = function preloadPageFromAutosave(pageId, line) {
    preLoaders[pageId] = line;
}

functions.flushLoadPagesFromAutosave = function flushLoadPagesFromAutosave() {
    // create all pages
    for (let i = 0; i < preLoaders.length; ++i) {
        let lines = preLoaders[i] = preLoaders[i].split("\n"), page, graph;
        switch (lines[0]) {
            case "chapter":
                newChapter(lines[1], lines[2]);
            break; case "statement":
                page = newStatement(lines[1], lines[2]);
                graph = page.graph;
                let numMembers = lines[4];
                for (let memberId = 1; memberId < numMembers; ++memberId) {
                    let subLines = lines[memberId + 5].split("\t");
                    while (subLines[subLines.length] === "\t") subLines.pop();
                    // subLines[0] is the name, type, and children
                    let memberLines = subLines[0].split(" ");
                    while (memberLines[memberLines.length-1] === "") memberLines.pop();
                    let member = graph.addMember(memberLines[0], memberLines[1]);
                    for (let childIndex = 2; childIndex < memberLines.length; childIndex += 2) {
                        member.setChild(memberLines[childIndex], memberLines[childIndex+1]);
                    }
                }
            break; default: throw Error("do not recognize page type " + lines[0]);
        }
    }
    // set parent/child relationships
    for (let pageId = 0; pageId < preLoaders.length; ++pageId) if (preLoaders[pageId][0] === "chapter") for (let childId of preLoaders[pageId][4].split(" ")) if (childId !== "") pages.items[childId].moveTo(pages.items[pageId]);
    // set toggles
    for (let pageId = 0; pageId < preLoaders.length; ++pageId) pages.items[pageId].togglePage(preLoaders[pageId][3] === "o");
    // set up guiLinks for visible pages
    getPageFromPageId(0).showPage(true);
    postMessage(["smoothMode", true]);
}

functions.openPageProcess = function openPageProcess(line) {pageTickets.openProcess(line)};

functions.closePageProcess = function closePageProcess() {pageTickets.closeProcess()};

pageProto.computeFullPageNumber = function computeFullPageNumber(siblingNumber) {
    if (this.parent) {
        if (this.parent.parent) return this.parent.fullPageNumber + "." + siblingNumber;
        else return siblingNumber;
    } else return "";
}

pageProto.updateFullPageNumber = function updateFullPageNumber(siblingNumber) {
    this.manager.setVarValue("fullPageNumber", this.computeFullPageNumber(siblingNumber));
}

pageProto.computeFullName = function computeFullName() {
    if (this.parent) return this.parent.fullName + "." + this.name;
    else return this.name;
}

pageProto.updateFullName = function updateFullName() {
    this.manager.setVarValue("fullName", this.computeFullName());
}

pageProto.moveTo = function moveTo(parent, insertBefore = "none", doSmoothly = false) {
    // some moves result in no change, so return if this is the case
    if (this === insertBefore) return;
    if (this.nextPage === insertBefore) return;
    if (this.parent && this.parent === parent && insertBefore === "none" && !this.nextPage) return;
    
    // notify the old parent of the move
    if (this.parent) {
        let oldParent = this.parent, sn = this.siblingNumber, prev = this.previousPage, next = this.nextPage;
        this.previousPage = this.nextPage = undefined;
        if (prev) prev.nextPage = next;
        if (next) next.previousPage = prev;
        oldParent.childPages.splice(sn - 1, 1);
        if (next) next.manager.setVarValue("siblingNumber", next.siblingNumber - 1);
        if (oldParent.isVisible) oldParent.guiLink.dm("canDelete", oldParent.canDelete());
        oldParent.preSave();
    }
    
    // move to new parent
    this.parent = parent;
    if (insertBefore !== "none") {
        this.nextPage = insertBefore;
        this.previousPage = insertBefore.previousPage;
        if (this.previousPage) this.previousPage.nextPage = this;
        insertBefore.previousPage = this;
        parent.childPages.splice(insertBefore.siblingNumber - 1, 0, this);
        this.manager.setVarValue("siblingNumber", insertBefore.siblingNumber);
    } else {
        let prev = parent.childPages[parent.childPages.length - 1];
        parent.childPages.push(this);
        this.previousPage = prev;
        if (prev) prev.nextPage = this;
        this.manager.setVarValue("siblingNumber", parent.childPages.length);
    }
    if (parent.isVisible) parent.guiLink.dm("canDelete", parent.canDelete());
    parent.preSave();
    
    // if this is visible, message that the icon needs to move
    if (this.isVisible) this.guiLink.dm("movePage", parent.guiLink.linkId, insertBefore === "none"? "none": insertBefore.guiLink.linkId, doSmoothly);
}

pageProto.togglePage = function togglePage(open = false) {
    if (this.isOpen === open) return;
    this.isOpen = open;
    if (this.isVisible) this.guiLink.dm("togglePage", open);
    this.preSave();
}

pageProto.setPageId = function setPageId(newPageId) {
    let oldPageId = this.pageId;
    if (oldPageId == newPageId) return;
    this.pageId = newPageId;
    if (oldPageId == undefined) return;
    postMessage(["moveAutosaveEntry", oldPageId, newPageId]);
    pageTickets.items[newPageId] = pageTickets.items[oldPageId];
    delete pageTickets.items[oldPageId];
    this.preSave();
    if (this.parent) this.parent.preSave();
}

pageProto.deletePage = function deletePage() {
    if (!this.canDelete()) throw Error("page " + this.pageId + " is still in use");
    // erase gui link
    this.showPage(false);
    // remove from family tree
    let prev = this.previousPage, next = this.nextPage;
    if (prev) {
        prev.nextPage = next;
        prev.manager.setVarValue("siblingNumber", prev.siblingNumber);
    } else if (next) next.manager.setVarValue("siblingNumber", this.siblingNumber);
    if (next) next.previousPage = prev;
    this.parent.childPages.splice(this.siblingNumber - 1, 1);
    this.parent.preSave();
    if (this.parent.isVisible) this.parent.guiLink.dm("canDelete", this.parent.canDelete());
    // remove from list of all pages
    pages.preErase(this.pageId);
    postMessage(["deleteAutosaveEntry", this.pageId]);
}

pageProto.preSave = function preSave() {pageTickets.addTicket(this.pageId, "save")};

chapterProto.pageType = "chapter";
chapterProto.isChapter = true;

function newChapter(name, nickname, protoModel = chapterProto) {
    let returner = newPage(name, nickname, protoModel);
    returner.childPages = [];
    return returner;
}

chapterProto.isAncestorOf = function isAncestorOf(page) {
    while (page) {
        if (this === page) return true;
        page = page.parent;
    }
    return false;
}

chapterProto.updateFullPageNumber = function updateFullPageNumber(siblingNumber) {
    pageProto.updateFullPageNumber.call(this, siblingNumber);
    for (let child of this.childPages) child.updateFullPageNumber(child.siblingNumber);
}

chapterProto.canAcceptMove = function canAcceptMove(page) {
    if (page.isChapter && page.isAncestorOf(this)) return false;
    for (let child of this.childPages) if (page !== child && child.name === page.name) return false;
    return true;
}

chapterProto.showPage = function showPage(open) {
    pageProto.showPage.call(this, open);
    if (this.isOpen) for (let childPage of this.childPages.slice().reverse()) childPage.showPage(open);
}

chapterProto.togglePage = function togglePage(open = false) {
    if (open === this.isOpen) return;
    pageProto.togglePage.call(this, open);
    // add the children in reverse order so that nextPage already exists in gui
    if (this.isVisible) for (let childPage of this.childPages.slice().reverse()) childPage.showPage(open);
}

pageProto.saveToAutosaveString = function saveToAutosaveString() {
    return this.pageType + "\n" + this.name + "\n" + this.nickname + "\n" + (this.isOpen? "o": "c");
}

chapterProto.saveToAutosaveString = function saveToAutosaveString() {
    let line = pageProto.saveToAutosaveString.call(this) + "\n";
    for (let child of this.childPages) line += child.pageId + " ";
    if (this.childPages.length > 0) line = line.substring(0, line.length - 1);
    return line;
}

statementProto.saveToAutosaveString = function saveToAutosaveString() {
    return pageProto.saveToAutosaveString.call(this) + "\n" + this.graph.saveToAutosaveString();
}

pageProto.canDelete = trueFunction;

chapterProto.canDelete = function canDelete() {
    return this.childPages.length === 0;
}

statementProto.pageType = "statement";
statementProto.isStatement = true;
// used in statement constructor to create blank graph
statementProto.newGraph = function newGraph() {
    let returner = TypedGraph.newGraph(statementProto.graphProto);
    returner.page = this;
    return returner;
};

function newStatement(name, nickname = "", protoModel = statementProto) {
    let returner = newPage(name, nickname, protoModel);
    returner.graph = protoModel.newGraph();
    returner.graph.page = returner;
    return returner;
}

statementProto.showPage = function showPage(show) {
    pageProto.showPage.call(this, show);
    if (show === this.isVisible) return;
}

statementProto.deletePage = function deletePage() {
    pageProto.deletePage.call(this);
    this.graph.deleteGraph();
}

statementProto.showGraphId = function showGraphId(id) {
    if (this.isVisible) this.guiLink.dm("setGraphId", id);
}

function initializeGraphProtoForWorker(pageTypeProto = statementProto, protoModel = TypedGraph.protoModel) {
    let graphProto = pageTypeProto.graphProto = Object.create(protoModel), memberProtoModel = Object.create(TypedGraph.memberProto);
    
    graphProto.addMember = function addMember(name, type, memberProto = memberProtoModel) {
        let member = protoModel.addMember.call(this, name, type, memberProto);
        if (this.page && this.page.isVisible) {
            this.page.guiLink.dm("newMember", member.id, name, type);
            let def = allGraphs[type], maxs = def.maximalTerms();
            for (let child of maxs) this.page.guiLink.dm("openChild", member.id, child.name, child.type); 
        }
        if (this.page) this.page.preSave();
        return member;
    }
    
    graphProto.setUi = function setUi(newUi) {
        protoModel.setUi.call(this, newUi);
        this.page.showGraphId(newUi);
    }
    
    memberProtoModel.setChild = function setChild(name, id) {
        TypedGraph.memberProto.setChild.call(this, name, id);
        let graph = this.graph;
        if (graph.page && graph.page.isVisible) {
            graph.page.guiLink.dm("setChild", this.id, name, id);
        }
        graph.page.preSave();
    }
    
    memberProtoModel.setName = function setName(name) {
        TypedGraph.memberProto.setName.call(this, name);
        if (this.graph.page.isVisible) this.graph.page.guiLink.dm("setName", this.id, name);
    }
}