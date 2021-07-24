let pageTickets, guiLinkTickets, pages, guiLinks, functions = {}, scrmljs = {
    filePrefix: "../",
    scriptLocations : {
        generalFunctions: "scripts/generalFunctions.js",
        varManager: "scripts/varManager.js",
        idManager: "scripts/idManager.js",
        overloadManager: "scripts/overloadManager.js",
        guiWorkerLink: "scripts/guiWorkerLink.js",
        //page: "scripts/guiLinks/page.js"
    },
    scripts: {
        generalFunctions: [],
        varManager: [],
        idManager: ["generalFunctions"],
        overloadManager: [],
        guiWorkerLink: ["varManager", "idManager", "overloadManager"],
        //page: ["guiWorkerLink"]
    },
    emptyFunction: function emptyFunction() {},
        isEmpty: function isEmpty(obj) {
        for (let prop in obj) if (Object.hasOwnProperty(prop)) return false;
        return true;
    }
}

scrmljs.importScript = function importScript(location, finished) {
    let req = new XMLHttpRequest();
    req.onload = function(x) {
        try {Function("{"+req.responseText+"\r\n}")()}
        catch (e) {
            console.log("error with imported script " + location);
            console.log(req.responseText);
            throw e;
        }
        finished();
    };
    req.onerror = function(x) {postMessage(["errorOut", "worker failed to load script " + location])};
    req.open("get", location);
    req.overrideMimeType("text/plaintext");
    req.send();
}

{
    let scriptLocations = scrmljs.scriptLocations,
        scripts = scrmljs.scripts,
        filePrefix = scrmljs.filePrefix;
    scrmljs.importScript(filePrefix + "scripts/loader.js", function() {
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
        scriptLoader.addEphemeralListener(function() {
            {
                scrmljs.mainLink = scrmljs.guiWorkerLink.openGuiWorkerLink(functions, "worker");
                console.log("main link");
                console.log(scrmljs.mainLink);
                
                
                
                
                let overloadProto = scrmljs.overloadManager.protoModel;
                pageTickets = scrmljs.overloadManager.newOverloadManager();
                pageTickets.name = "page tickets";
                pageTickets.saveTheseObject = {};
                
                pageTickets.addTicketFunction("save", function(pageId) {
                    pageTickets.saveTheseObject[pageId] = undefined;
                });
                
                pageTickets.addTicketFunction("smoothMode", function(pageId, smoothMode){
                    postMessage(["smoothMode", smoothMode]);
                });
                
                pageTickets.addTicket = function addTicket(pageId, ticketFunction, ...data) {
                    postMessage(["setLoadingScreen", pages.items[pageId].name + " " + ticketFunction + " " + data]);
                    overloadProto.addTicket.call(this, pageId, ticketFunction, ...data);
                }
                
                pageTickets.openProcess = function openProcess() {
                    // postMessage(["openLoadingScreen"]);
                    overloadProto.openProcess.call(this);
                }
                
                pageTickets.closeProcessHook = function closeProcessHook() {
                    this.save();
                    postMessage(["closeLoadingScreen"]);
                }
                
                pageTickets.save = function save() {
                    for (let pageId in this.saveTheseObject) postMessage(["save", pageId, pages.items[pageId].saveToString()]);
                    this.saveTheseObject = {};
                }
                
                guiLinkTickets = scrmljs.overloadManager.newOverloadManager();
                guiLinkTickets.name = "guiLink tickets";
                
                guiLinkTickets.addTicket = function addTicket(linkId, ticketFunction, ...data) {
                    postMessage(["setLoadingScreen", getPageFromLinkId(linkId).name + " " + ticketFunction + " " + data]);
                    overloadProto.addTicket.call(this, linkId, ticketFunction, ...data);
                }
                
                guiLinkTickets.openProcess = function openProcess() {
                    pageTickets.openProcess();
                    overloadProto.openProcess.call(this);
                }
                
                guiLinkTickets.closeProcessHook = function closeProcessHook() {
                    pageTickets.closeProcess();
                }
                
                guiLinkTickets.addTicketFunction("name", function(linkId, name) {
                    fetched("page", linkId, "name", name);
                });
                
                guiLinkTickets.addTicketFunction("nickname", function(linkId, nickname) {
                    fetched("page", linkId, "nickname", nickname);
                });
                
                guiLinkTickets.addTicketFunction("fullName", function(linkId, fullName) {
                    fetched("page", linkId, "fullName", fullName);
                });
                
                guiLinkTickets.addTicketFunction("pageNameCheckFail", function(pageId, proposedValue) {
                    postMessage(["pageNameCheckFail", pageId, proposedValue]);
                });
                
                guiLinkTickets.addTicketFunction("siblingNumber", function(pageNumber, siblingNumber) {
                    fetched(pageNumber, "siblingNumber", siblingNumber);
                });
                
                guiLinkTickets.addTicketFunction("fullPageNumber", function(pageNumber, fullPageNumber) {
                    fetched(pageNumber, "fullPageNumber", fullPageNumber);
                });
                
                guiLinkTickets.addTicketFunction("setOpen", function(linkId, open) {
                    fetched("page", linkId, "setOpen", open);
                });
                
                guiLinkTickets.addTicketFunction("moveTo", function(linkId, parentId, insertBeforeId, doSmoothly) {
                    postMessage(["movePage", linkId, parentId, insertBeforeId, doSmoothly]);
                });
                
                guiLinkTickets.addTicketFunction("moveModeOff", function() {
                    postMessage(["moveModeOff"]);
                });
                
                guiLinkTickets.addTicketFunction("newPageNameCheckFail", function(linkId) {
                    postMessage(["newPageNameCheckFail", linkId]);
                });
                
                guiLinkTickets.addTicketFunction("clearPageGap", function() {
                    postMessage(["clearPageGap"]);
                });
                
                guiLinkTickets.addTicketFunction("canDelete", function(linkId) {
                    postMessage(["canDelete", linkId]);
                });
                pages = scrmljs.idManager.newManager("pageId");
                
                pages.eraseItemHook = function(id) {
                    delete pageTickets.items[id];
                    postMessage(["deleteAutosaveEntry", id]);
                }
                
                guiLinks = scrmljs.idManager.newManager("linkId");
                
                guiLinks.eraseItemHook = function(id) {
                    delete guiLinkTickets.items[id];
                }
                
                postMessage(["start"]);
            }
        })
    });
}

/*
Some structure:
The worker holds all information about the SCRML file. The only thing not in the worker, beyond the structure needed to start the worker, is the DOM itself. The page calls to the worker to do things and the worker calls to the page to show/hide/manipulate DOM elements.
*/

onmessage = function onmessage(e) {
    let line = e.data.toString();
    try {
        let line = e.data.toString();
        guiLinkTickets.openProcess();
        functions[e.data.shift()](...e.data);
        guiLinkTickets.closeProcess();
    } catch (x) {
        postMessage(["errorOut", "worker error " + line + "\n" + x.message]);
        throw x;
    }
}

function fetched(type, id, dataName, ...data) {postMessage(["fetched", type, id, dataName, ...data])}

function getPageFromLinkId(linkId) {
    let returner = guiLinks.items[linkId];
    if (!returner || !returner.isPage) throw Error("link " + linkId + " is not a page");
    return returner;
}

let pageProto = {}, chapterProto = Object.create(pageProto), statementProto = Object.create(pageProto), commentProto = Object.create(pageProto), movingPage = false, guiLinkSetups = {};

functions.log = console.log;

functions.printAll = function() {
    console.log(pages);
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
    returner.isVisible = false;
    returner.guiUnlinks = [];
    returner.preSave();
    return returner;
}

function newChapter(name, nickname, protoModel = chapterProto) {
    let returner = newPage(name, nickname, protoModel);
    returner.pageType = "chapter";
    returner.childPages = [];
    return returner;
}

function movePage(page, parent, insertBefore) {
    // some moves result in no change, so return if this is the case
    if (page === insertBefore) return;
    if (insertBefore && page.nextPage === insertBefore) return;
    if (page.parent && page.parent === parent && insertBefore === null && !page.nextPage) return;
    
    // notify the old parent of the move
    if (page.parent) {
        let oldParent = page.parent, sn = page.siblingNumber, prev = page.previousPage, next = page.nextPage;
        page.previousPage = page.nextPage = undefined;
        if (prev) prev.nextPage = next;
        if (next) next.previousPage = prev;
        oldParent.childPages.splice(sn - 1, 1);
        if (next) next.manager.setVarValue("siblingNumber", next.siblingNumber - 1);
        oldParent.preSave();
    }
    
    // move to new parent
    page.parent = parent;
    if (insertBefore) {
        page.nextPage = insertBefore;
        page.previousPage = insertBefore.previousPage;
        if (page.previousPage) page.previousPage.nextPage = page;
        insertBefore.previousPage = page;
        parent.childPages.splice(insertBefore.siblingNumber - 1, 0, page);
        page.manager.setVarValue("siblingNumber", insertBefore.siblingNumber);
    } else {
        let prev = parent.childPages[parent.childPages.length - 1];
        parent.childPages.push(page);
        page.previousPage = prev;
        if (prev) prev.nextPage = page;
        page.manager.setVarValue("siblingNumber", parent.childPages.length);
    }
    parent.preSave();
    
    // if this is visible, message that the icon needs to move
    if (page.isVisible) guiLinkTickets.addTicket(page.linkId, "moveTo", parent.linkId, insertBefore? insertBefore.linkId: null);
}

functions.newChapter = function toldToMakeNewChapter(parentId, insertBeforeId, name, visible = false) {
    let chapter = newChapter(name);
    chapter.moveTo(parentId, insertBeforeId);
    if (visible) guiLinkSetups.chapter(chapter);
}

guiLinkSetups.chapter = function setupChapterGuiLink(chapter) {
    if (chapter.isVisible) throw Error("gui link already set up for chapter id " + chapter.pageId);
    chapter.isVisible = true;
    guiLinks.addItem(chapter);
    chapter.manager.setVarValue("linkId", chapter.linkId);
    chapter.manager.linkProperty("linkId", chapter);
    postMessage(["showChapter", chapter.linkId, chapter.name]);
    if (chapter.parent) guiLinkTickets.addTicket(chapter.linkId, "moveTo", chapter.parent.linkId, chapter.nextPage? chapter.nextPage.linkId: null, false);
    chapter.guiUnlinks.push(chapter.manager.linkListener("name", function(name) {
        guiLinkTickets.addTicket(chapter.linkId, "name", name);
    }, true));
    chapter.guiUnlinks.push(chapter.manager.linkListener("nickname", function(nickname) {
        guiLinkTickets.addTicket(chapter.linkId, "nickname", nickname);
    }, true));
    chapter.guiUnlinks.push(chapter.manager.linkListener("fullName", function(fullName) {
        guiLinkTickets.addTicket(chapter.linkId, "fullName", fullName);
    }, true));
    if (chapter.isOpen) chapter.showToggle();
}

let preLoaders = [];

functions.preloadPageFromAutosave = function preloadPageFromAutosave(pageId, line) {
    preLoaders[pageId] = line;
}

functions.flushLoadPagesFromAutosave = function flushLoadPagesFromAutosave() {
    // create all pages
    for (let i = 0; i < preLoaders.length; ++i) {
        if (preLoaders[i] === "skip") {
            pages.skip();
            continue;
        }
        let lines = preLoaders[i] = preLoaders[i].split("\n");
        switch (lines[0]) {
            case "chapter":
                newChapter(lines[1], lines[2]);
            break; default: throw Error("do not recognize page type " + lines[0]);
        }
    }
    // set parent/child relationships
    for (let pageId = 0; pageId < preLoaders.length; ++pageId) if (preLoaders[pageId] === "skip") continue;
    else for (let childId of preLoaders[pageId][4].split(" ")) if (childId !== "") pages.items[childId].moveTo(pageId);
    // set toggles
    for (let pageId = 0; pageId < preLoaders.length; ++pageId) pages.items[pageId].togglePage(preLoaders[pageId][3] == "o");
    // set up guiLinks for visible pages
    guiLinkSetups.chapter(pages.items[0]);
    pageTickets.addTicket(0, "smoothMode", "true");
}

functions.fetch = function fetch(type, linkId, dataName) {
    let idItem, data;
    switch (type) {
        case "page":
            idItem = getPageFromLinkId(linkId);
            switch (dataName) {
                case "name": data = [idItem.name];
                break; case "nickname": data = [idItem.nickname];
                break; default: throw Error("do not recognize dataName " + dataName);
            }
        break; default: throw Error("do not recognize type " + type);
    }
    fetched(type, linkId, dataName, ...data);
}

functions.ask = function ask(type, linkId, questionType, proposedValue) {
    let idItem;
    switch (type) {
        case "page":
            idItem = getPageFromLinkId(linkId);
            switch (questionType) {
                case "name": idItem.tryChangePageName(proposedValue);
                break; case "canDelete": idItem.checkCanDelete();
                break; default: throw Error("do not recognize dataName " + questionType);
            }
        break; default: throw Error("do not recognize type " + type);
    }
}

functions.togglePage = function togglePage(linkId, open) {
    getPageFromLinkId(linkId).togglePage(open);
}

functions.startMoveModeChecks = function startMoveModeChecks(linkId) {
    movingPage = getPageFromLinkId(linkId);
    for (let page of guiLinks.items) if (page.isChapter) postMessage(["canAcceptMove", page.linkId, page.canAcceptMove(movingPage)]);
}

functions.endMoveMode = function endMoveMode() {
    movingPage = false;
}

functions.movePage = function movePageTranslation(movingPageLinkId, parentLinkId, insertBeforeLinkId) {
    movePage(getPageFromLinkId(movingPageLinkId), getPageFromLinkId(parentLinkId), insertBeforeLinkId == +insertBeforeLinkId? getPageFromLinkId(insertBeforeLinkId): null);
    guiLinkTickets.addTicket(movingPageLinkId, "moveModeOff");
}

functions.newPageNameCheck = function newPageNameCheck(parentLinkId, line, insertBeforeLinkId, pageMode) {
    let parent = getPageFromLinkId(parentLinkId);
    if (!parent.isChapter) throw Error("page " + parent.pageId + " is not a chapter");
    for (let child of parent.childPages) if (child.name == line) return guiLinkTickets.addTicket(parentLinkId, "newPageNameCheckFail");
    guiLinkTickets.addTicket(parentLinkId, "clearPageGap");
    switch (pageMode) {
        case "chapter":
            functions.newChapter(parent.pageId, insertBeforeLinkId>=0? getPageFromLinkId(insertBeforeLinkId).pageId: null, line, true);
        break; default: throw Error("do not recognize page mode " + pageMode);
    }
}

functions.openPageProcess = function openPageProcess() {pageTickets.openProcess()};

functions.closePageProcess = function closePageProcess() {pageTickets.closeProcess()};

functions.deletePage = function deletePage(linkId) {
    let page = getPageFromLinkId(linkId);
    if (!page.canDelete()) throw Error("page " + linkId + " is still in use");
    // erase gui link
    page.makeInvisible();
    // remove from family tree
    let prev = page.previousPage, next = page.nextPage;
    if (prev) {
        prev.nextPage = next;
        prev.manager.setVarValue("siblingNumber", prev.siblingNumber);
    } else if (next) next.manager.setVarValue("siblingNumber", page.siblingNumber);
    if (next) next.previousPage = prev;
    page.parent.childPages.splice(page.siblingNumber - 1, 1);
    page.parent.preSave();
    // remove from list of all pages
    pages.eraseItem(page.pageId);
}

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

pageProto.tryChangePageName = function tryChangePageName(proposedName) {
    if (this.parent) for (let childPage of this.parent.childPages) if (childPage !== this && childPage.name == proposedName) return guiLinkTickets.addTicket(this.linkId, "pageNameCheckFail", proposedName);
    this.manager.setVarValue("name", proposedName);
}

pageProto.moveTo = function moveTo(parentId, insertBefore = false) {
    movePage(this, pages.items[parentId], insertBefore? pages.items[insertBefore]: null);
}

pageProto.togglePage = function togglePage(open = false) {
    if (this.isOpen == open) return;
    this.isOpen = open;
    this.preSave();
    if (!this.isVisible) return;
    if (open) this.showToggle();
    else if (this.isChapter) for (let child of this.childPages) child.makeInvisible();
    //if (open && movingPage) postMessage(["canAcceptMove", this.linkId, this.canAcceptMove(movingPage)]);
}

pageProto.showToggle = function showToggle() {
    if (!this.isVisible || !this.isOpen) throw Error("cannot showToggle page " + this.pageId);
    guiLinkTickets.addTicket(this.linkId, "setOpen", true);
    if (this.isChapter) for (let childPage of this.childPages) guiLinkSetups[childPage.pageType](childPage);
}

pageProto.ensureVisible = function ensureVisible() {
    if (!this.isVisible) guiLinkSetups[this.pageType](this);
}

pageProto.setPageId = function setPageId(newPageId) {
    let oldPageId = this.pageId;
    if (oldPageId == newPageId) return;
    this.pageId = newPageId;
    if (oldPageId == undefined) return;
    pageTickets.items[newPageId] = pageTickets.items[oldPageId];
    delete pageTickets.items[oldPageId];
    this.preSave();
    if (this.parent) this.parent.preSave();
}

pageProto.setLinkId = function setLinkId(newLinkId) {
    let oldLinkId = this.linkId;
    if (oldLinkId == newLinkId) return;
    this.linkId = newLinkId;
    if (oldLinkId == undefined) return;
    postMessage(["changeLinkId", oldLinkId, newLinkId]);
    guiLinkTickets.items[newLinkId] = guiLinkTickets.items[oldLinkId];
    delete guiLinkTickets.items[oldLinkId];
}

pageProto.makeInvisible = function makeInvisible() {
    postMessage(["eraseLink", this.linkId]);
    for (let unlink of this.guiUnlinks) unlink();
    this.guiUnlinks.splice(0);
    guiLinks.eraseItem(this.linkId);
    this.manager.deleteVar("linkId");
    delete this.linkId;
    this.isVisible = false;
}

pageProto.preSave = function preSave() {pageTickets.addTicket(this.pageId, "save")};

chapterProto.isChapter = true;

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

chapterProto.makeInvisible = function makeInvisible() {
    if (!this.isVisible) throw Error("page already invisible");
    if (this.isOpen) for (let child of this.childPages) child.makeInvisible();
    pageProto.makeInvisible.call(this);
}

pageProto.saveToString = function saveToString() {
    return this.pageType + "\n" + this.name + "\n" + this.nickname + "\n" + (this.isOpen? "o": "c");
}

chapterProto.saveToString = function saveToString() {
    let line = pageProto.saveToString.call(this) + "\n";
    for (let child of this.childPages) line += child.pageId + " ";
    if (this.childPages.length > 0) line = line.substring(0, line.length - 1);
    return line;
}

pageProto.canDelete = trueFunction;

pageProto.checkCanDelete = function checkCanDelete() {
    if (!this.isVisible) throw Error("checking if an invisible page can be deleted");
    if (!this.canDelete()) return;
    guiLinkTickets.addTicket(this.linkId, "canDelete");
}

chapterProto.canDelete = function canDelete() {
    return this.childPages.length === 0;
}

function emptyFunction() {}
function trueFunction() {return true}

postMessage(["errorOut", ""]);