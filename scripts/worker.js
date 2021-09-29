function updateMessage(line) {postMessage(["errorOut", line])};

// script setup
let pageTickets, pages, guiLinks, idManager, overloadManager, mainLink, Graph, TypedGraph, functions = {}, scrmljs = {
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
        statement: "scripts/guiLinks/statement.js",
        nameless: "scripts/guiLinks/nameless.js",
        comment: "scripts/guiLinks/comment.js"
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
        statement: ["chapter", "TypedGraph"],
        nameless: ["page"],
        comment: ["nameless"]
    }, isEmpty: function isEmpty(obj) {
        for (let prop in obj) if (Object.hasOwnProperty(prop)) return false;
        return true;
    }, emptyFunction: function emptyFunction() {}, trueFunction: function() {return true}
}, emptyFunction = scrmljs.emptyFunction, trueFunction = scrmljs.trueFunction, isEmpty = scrmljs.isEmpty, pagesByFullName = scrmljs.pagesByFullName = {};

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
        pages = scrmljs.pages = idManager.newManager("pageId");
    });
    scriptLoader.items.overloadManager.addEphemeralListener("js", function() {overloadManager = scrmljs.overloadManager});
    scriptLoader.items.guiWorkerLink.addEphemeralListener("js", function() {
        mainLink = scrmljs.mainLink = scrmljs.guiWorkerLink.openGuiWorkerLink(functions, "worker", function(...args) {postMessage(args)});
        mainLink.getIdManagerForLinks("linkId");
    });
    scriptLoader.items.TypedGraph.addEphemeralListener("js", function() {
        Graph = scrmljs.Graph;
        TypedGraph = Graph.TypedGraph;
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
        initializeGraphProtoForWorker();
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

function getPageFromPageId(pageId) {
    return pages.items[pageId];
}

function getPageFromLinkId(linkId) {
    if (linkId === "none") return "none";
    let returner = mainLink.links.items[linkId];
    if (!returner || !returner.isPage) throw Error("link " + linkId + " is not a page");
    return returner.page;
}

function getGraphFromPageId(pageId) {
    return pages.items[pageId].graph;
}

let guiLinkSetups = {};

functions.log = console.log;

functions.printAll = function() {
    console.log(scrmljs);
};

let preLoaders = [];

functions.preloadPageFromAutosave = function preloadPageFromAutosave(pageId, line) {
    preLoaders[pageId] = line;
}

functions.flushLoadPagesFromAutosave = function flushLoadPagesFromAutosave() {
    let creators = scrmljs.pageCreators, newChapter = creators.chapter, newStatement = creators.statement, newComment = creators.comment;
    // create all pages
    for (let i = 0; i < preLoaders.length; ++i) {
        let lines = preLoaders[i] = preLoaders[i].split("\n"), page, graph;
        switch (lines[0]) {
            case "chapter":
                newChapter(lines[1], lines[2]);
            break; case "statement":
                page = newStatement(lines[1], lines[2]);
                graph = page.graph;
                let inUniverse = lines[4], numMembers = lines[5], typeNames = {};
                for (let memberId = 0; memberId < numMembers; ++memberId) {
                    let subLines = lines[memberId + 6].split("\t"), onIndex = 0;
                    while (subLines[subLines.length] === "\t") subLines.pop();
                    // subLines[0] is the name, type, and children
                    let memberLines = subLines[0].split(" ");
                    while (memberLines[memberLines.length-1] === "") memberLines.pop();
                    let name = memberLines[onIndex++], type = memberLines[onIndex++];
                    if (!(type in typeNames)) typeNames[type] = memberLines[onIndex++];
                    let member = graph.addMember(name, type, typeNames[type]);
                    while (onIndex < memberLines.length) {
                        member.setChild(memberLines[onIndex++], memberLines[onIndex++]);
                    }
                }
                graph.putInUniverse(inUniverse === "i");
            break; case "comment":
                newComment(lines[1], lines[2]);
            break; default: throw Error("do not recognize page type " + lines[0]);
        }
    }
    // root page saves differently
    pages.items[0].saveToSCRMLString = function saveToSCRMLString(indent = "", tab = "\t") {
        let line = "<SCRML format=\"editor\">\n";
        line += scrmljs.pageProtos.chapter.saveToSCRMLString.call(pages.items[0], indent + tab, tab);
        line += "\n</SCRML>";
        return line;
    }
    // set parent/child relationships
    for (let pageId = 0; pageId < preLoaders.length; ++pageId) if (preLoaders[pageId][0] === "chapter") for (let childId of preLoaders[pageId][4].split(" ")) if (childId !== "") {
        pages.items[childId].moveTo(pages.items[pageId]);
    }
    // set toggles
    for (let pageId = 0; pageId < preLoaders.length; ++pageId) pages.items[pageId].togglePage(preLoaders[pageId][3] === "o");
    // set up guiLinks for visible pages
    getPageFromPageId(0).showPage(true);
    postMessage(["smoothMode", true]);
}

// this should probably be moved to a separate script which focuses on file compilation from worker information
functions.exportSCRMLFile = function exportSCRMLFile() {
    let line = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    let rootChapter = pages.items[0];
    line += rootChapter.saveToSCRMLString();
    postMessage(["saveTextFile", line, rootChapter.name]);
}

functions.openPageProcess = function openPageProcess(line) {pageTickets.openProcess(line)};

functions.closePageProcess = function closePageProcess() {pageTickets.closeProcess()};

let xmlEscape = scrmljs.xmlEscape = function xmlEscape(line) {
    return line.replaceAll(/</gm, "&lt;").replaceAll(/&(?!lt;)(?!amp;)(?!gt;)(?!quot;)(?!apos;)(?!#\d+;)/gm, "&amp;").replaceAll(/>/gm, "&gt;").replaceAll(/"/gm, "&quot;").replaceAll(/'/gm, "&apos;");
}

function initializeGraphProtoForWorker(pageTypeProto = scrmljs.pageProtos.statement, protoModel = TypedGraph.protoModel) {
    let graphProto = pageTypeProto.graphProto = Object.create(protoModel), memberProtoModel = Object.create(graphProto.memberProto);
    
    graphProto.addMember = function addMember(name, type, typeName, memberProto = memberProtoModel) {
        let member = protoModel.addMember.call(this, name, type, typeName, memberProto), page, guiLink;
        if ((page = this.page) && page.isVisible) { // adding a blank member to a visible graph
            guiLink = page.guiLink;
            guiLink.showMember(member);
            // open all the required children and set their types
            for (let max of Graph.graph(type).maximalTerms()) {
                
            }
        }
        if (page) page.preSave();
        return member;
    }
    
    graphProto.markUsesType = function markUsesType(type, typeName, oldTypeName) {
        protoModel.markUsesType.call(this, type, typeName);
        if (this.page && this.page.isVisible) {
            this.page.guiLink.dm("setTypeName", typeName, Graph.graph(type).page.fullName, oldTypeName);
        }
    }
    
    graphProto.markNotUsesType = function markNotUsesType(type) {
        protoModel.markNotUsesType.call(this, type);
        if (this.page && this.page.isVisible) {
            this.page.guiLink.dm("eraseTypeName", type);
        }
    }
    
    memberProtoModel.setChild = function setChild(name, memberId) {
        graphProto.memberProto.setChild.call(this, name, memberId);
        if (1>0) return;
        let graph = this.graph;
        if (graph.page && graph.page.isVisible) graph.page.guiLink.dm("setChild", this.name, name, graph.member(memberId).name, graph.usesType[memberId]);
        graph.page.preSave();
    }
    
    graphProto.putInUniverse = function putInUniverse(putIn) {
        if (this.isInUniverse == putIn) return;
        TypedGraph.protoModel.putInUniverse.call(this, putIn);
        let page = this.page;
        page.preSave();
        if (!page.isVisible) return;
        page.guiLink.dm("isInUniverse", putIn);
    }
    
    graphProto.saveStringChangedHook = function saveStringChangedHook() {
        if (this.page) this.page.preSave();
    }
}