/*
Some structure:
The worker holds all information about the SCRML file. The only thing not in the worker, beyond the structure needed to start the worker, is the DOM itself. The page calls to the worker to do things and the worker calls to the page to show/hide/manipulate DOM elements.
*/

onmessage = function onmessage(e) {
    let line = e.data.toString();
    try {
        pageTickets.openProcess();
        functions[e.data.shift()](...e.data);
        pageTickets.closeProcess();
    } catch (x) {
        console.log("worker failing");
        console.log(line);
        throw x;
    }
}

function fetched(type, id, dataName, ...data) {postMessage(["fetched", type, id, dataName, ...data])}

let functions = {}, pages, pageProto = {}, chapterProto = Object.create(pageProto), statementProto = Object.create(pageProto), commentProto = Object.create(pageProto), movingPage = false, guiUnits = [], guiLinkSetups = {};

functions.log = console.log;

functions.printAll = function() {
    console.dir(pages);
};

function newPage(name, nickname = "", protoModel = pageProto) {
    let returner = Object.create(protoModel);
    pages.addItem(returner);
    returner.manager = newVarManager();
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
    //movePage(pageNumber, parentNumber, insertBeforeNumber);
    //returner.manager.setVarValue("isInUse", false);
    //returner.manager.linkListener("isInUse", function(inUse) {guiLinkTickets.addTicket(returner.pageNumber, "isInUse", inUse)}, true);
    //returner.manager.linkListener("isInUse", function() {returner.preSave()});
    returner.preSave();
    return returner;
}

function newChapter(name, nickname, protoModel = chapterProto) {
    let returner = newPage(name, nickname, protoModel);
    returner.pageType = "chapter";
    returner.childPages = [];
    return returner;
}

/*function newStatement(parentNumber, insertBeforeNumber, pageNumber, name, protoModel = statementProto) {
    let returner = newPage(parentNumber, insertBeforeNumber, pageNumber, name, protoModel);
    returner.pageType = "statement";
    return returner;
}

function newComment(parentNumber, insertBeforeNumber, pageNumber, name, protoModel = commentProto) {
    let returner = newPage(parentNumber, insertBeforeNumber, pageNumber, name, protoModel);
    returner.pageType = "comment";
    returner.manager.setVarValue("tex", "");
    returner.manager.linkProperty("tex", returner);
    returner.manager.linkListener("tex", function(tex) {fetched(returner.pageNumber, "tex", tex)});
    returner.manager.linkListener("tex", function() {returner.preSave()});
    return returner;
}*/

function movePage(page, parent, insertBefore) {
    if (page === insertBefore) return;
    if (insertBefore && page.nextPage === insertBefore) return;
    else if (page.parent && page.parent === parent && insertBefore === null && !page.nextPage) return;
    if (page.parent) {
        let oldParent = page.parent, sn = page.siblingNumber, prev = page.previousPage, next = page.nextPage;
        page.previousPage = page.nextPage = undefined;
        if (prev) prev.nextPage = next;
        if (next) next.previousPage = prev;
        oldParent.childPages.splice(sn-1, 1);
        if (next) next.manager.setVarValue("siblingNumber", next.siblingNumber - 1);
        oldParent.preSave();
    }
    if (parent) {
        page.parent = parent;
        if (insertBefore) {
            page.nextPage = insertBefore;
            page.previousPage = insertBefore.previousPage;
            if (page.previousPage) page.previousPage.nextPage = page;
            insertBefore.previousPage = page;
            parent.childPages.splice(insertBefore.siblingNumber-1, 0, page);
            page.manager.setVarValue("siblingNumber", insertBefore.siblingNumber);
        } else {
            let prev = parent.childPages[parent.childPages.length - 1];
            parent.childPages.push(page);
            page.previousPage = prev;
            if (prev) prev.nextPage = page;
            page.manager.setVarValue("siblingNumber", parent.childPages.length);
        }
        parent.preSave();
    } else {
        if (pageNumber != 0) throw Error("only page 0 can not have a parent");
        page.manager.setVarValue("siblingNumber", 1);
    }
}

functions.newChapter = function toldToMakeNewChapter(parentId, insertBeforeId, name, visible = false) {
    let chapter = newChapter(parentId, insertBeforeId, name);
    if (visible) guiLinkSetups.chapter(chapter);
}

guiLinkSetups.chapter = function setupChapterGuiLink(chapter) {
    if (chapter.unlinkGuiLink) throw Error("gui link already set up for chapter id " + chapter.pageId);
    guiLinks.addItem(chapter);
    postMessage(["showChapter", chapter.linkId, chapter.name]);
    let unlinks = chapter.unlinkGuiLink = {};
    unlinks.name = chapter.manager.linkListener("name", function(name) {
        guiLinkTickets.addTicket(chapter.linkId, "name", name);
    }, true);
    unlinks.nickname = chapter.manager.linkListener("nickname", function(nickname) {
        guiLinkTickets.addTicket(chapter.linkId, "nickname", nickname);
    }, true);
    unlinks.fullName = chapter.manager.linkListener("fullName", function(fullName) {
        guiLinkTickets.addTicket(chapter.linkId, "fullName", fullName);
    }, true);
}

pageProto.ensureVisible = function ensureVisible() {
    if (!this.unlinkGuiLink) guiLinkSetups[this.pageType](this);
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
    // set up guiLinks for visible pages
    guiLinkSetups.chapter(pages.items[0]);
    if (preLoaders[0][3] === "o") pages.items[0].togglePage(true);
    pageTickets.addTicket(0, "smoothMode", "true");
}

functions.resetName = function resetName(pageNumber) {
    fetched(pageNumber, "name", pages[pageNumber].name);
}

functions.resetNickname = function resetNickname(pageNumber) {
    fetched(pageNumber, "nickname", pages[pageNumber].nickname);
}

functions.setName = function setName(pageNumber, name) {
    let page = pages[pageNumber];
    if (!page.parent) return page.manager.setVarValue("name", name);
    let sibling = page.previousPage;
    while (sibling) {
        if (sibling.name == name) return postMessage(["errorOut", pageNumber, "name", name]);
        sibling = sibling.previousPage;
    }
    sibling = page.nextPage;
    while (sibling) {
        if (sibling.name == name) return postMessage(["errorOut", pageNumber, "name", name]);
        sibling = sibling.nextPage;
    }
    page.manager.setVarValue("name", name);
    guiLinkTickets.addTicket(pageNumber, "save");
}

functions.setNickname = function setNickname(pageNumber, nickname) {
    pages[pageNumber].manager.setVarValue("nickname", nickname);
    guiLinkTickets.addTicket(pageNumber, "save");
}

functions.fetch = function fetch(type, linkId, dataName) {
    let link = guiLinks.items[linkId], data;
    switch (type) {
        case "page":
            switch (dataName) {
                case "name": data = [link.name];
                break; default: throw Error("do not recognize dataName " + dataName);
            }
        break; default: throw Error("do not recognize type " + type);
    }
    fetched(type, linkId, dataName, ...data);
}

functions.ask = function ask(type, linkId, questionType, proposedValue) {
    switch (type) {
        case "page":
            switch (questionType) {
                case "name": guiLinkTickets.addTicket(getPageIdFromGuiLinkId(linkId), "pageNameCheck", proposedValue);
                break; default: throw Error("do not recognize dataName " + dataName);
            }
        break; default: throw Error("do not recognize type " + type);
    }
}

functions.togglePage = function togglePage(linkId, open) {
    guiLinks.items[linkId].togglePage(open);
}

functions.setTex = function setTex(pageNumber, tex) {
    pages[pageNumber].manager.setVarValue("tex", tex);
}

functions.startMoveModeChecks = function startMoveModeChecks(pageNumber) {
    movingPage = pages[pageNumber];
    for (let page of pages) if (page.isOpen && page.isChapter) postMessage(["canAcceptMove", page.pageNumber, page.canAcceptMove(pages[pageNumber])]);
}

functions.endMoveMode = function endMoveMode() {
    movingPage = false;
}

functions.move = function move(movingPageNumber, parentNumber, insertBeforeNumber) {
    movePage(movingPageNumber, parentNumber, insertBeforeNumber);
}

functions.openPageProcess = function openPageProcess() {pageTickets.openProcess()};

functions.closePageProcess = function closePageProcess() {pageTickets.closeProcess()};

functions.deletePage = function deletePage(pageNumber) {
    let page = pages[pageNumber];
    if (page.isInUse) throw Error("page " + pageNumber + " is still in use");
    page.preSave();
    pages[pageNumber] = "skipped";
    let prev = page.previousPage, next = page.nextPage;
    if (prev) {
        prev.nextPage = next;
        prev.manager.setVarValue("siblingNumber", prev.siblingNumber);
    } else if (next) next.manager.setVarValue("siblingNumber", page.siblingNumber);
    if (next) next.previousPage = prev;
    page.parent.childPages.splice(page.siblingNumber - 1, 1);
    page.parent.preSave();
}

function getPageIdFromGuiLinkId(guiLinkId) {
    return guiLinks.items[guiLinkId].pageId;
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

pageProto.moveTo = function moveTo(parentId, insertBefore = false) {
    movePage(this, pages.items[parentId]);
}

pageProto.togglePage = function togglePage(open = false) {
    if (!this.unlinkGuiLink) throw Error("cannot toggle page " + this.id + " because it is not visible");
    if (this.isOpen == open) return;
    this.isOpen = open;
    guiLinkTickets.addTicket(this.linkId, "setOpen", this.isOpen);
    if (open && this.isChapter) {
        for (let childPage of this.childPages) {
            childPage.ensureVisible();
            guiLinkTickets.addTicket(childPage.linkId, "moveTo", this.linkId);
        }
    }
    this.preSave();
    //if (open && movingPage) postMessage(["canAcceptMove", this.pageNumber, this.canAcceptMove(movingPage)]);
}

pageProto.preSave = function preSave() {pageTickets.addTicket(this.pageId, "save")};
chapterProto.isChapter = true;

chapterProto.isAncestorOf = function isAncestorOf(page) {
    while (page) {
        if (this == page) return true;
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
    for (let child of this.childPages) if (page != child && child.name == page.name) return false;
    return true;
}

pageProto.saveToString = function saveToString() {
    return this.pageType + "\n" + this.name + "\n" + this.nickname + "\n" + (this.isOpen? "o": "c");
}

chapterProto.saveToString = function saveToString() {
    let line = pageProto.saveToString.call(this) + "\n";
    for (let child of this.childPages) line += child.pageNumber + " ";
    if (this.childPages.length > 0) line = line.substring(0, line.length - 1);
    return line;
}

statementProto.saveToString = function saveToString() {
    let line = pageProto.saveToString.call(this);
    return line;
}

commentProto.saveToString = function saveToString() {
    let line = pageProto.saveToString.call(this);
    return line;
}

function emptyFunction() {}

// Workers don't have a way of importing js except modules, but modules don't work on locally hosted sites, so we just put copy/paste all the modules here.

// ticket system
{
    /*
        A ticket system is a way of deferring action until a process is complete. It starts by opening a process. Tickets are added while processes are open. A ticket is stored in a (name, function) pair, both strings, where name is intended to be the id of an object and function refers to a function which can be performed on that object. The tickets pile up as a process continues, but only by name and function. That is, no matter how many times a ticket is added for a given (name, function) pair, that function will evaluate for that name only once at the end. The tickets are all automatically evaluated and flushed once the processes are all closed. If there are no open processes, the ticket is executed immediately.
    */
    
    var ticketSystem = {};
    
    var ticketProto = {};
    
    ticketSystem.newTicketSystem = function newTicketSystem(protoModel = ticketProto) {
        let returner = Object.create(protoModel);
        returner.items = {};
        returner.ticketFunctions = {};
        returner.openProcesses = 0;
        return returner;
    }
    
    ticketProto.addTicketFunction = function addTicketFunction(name, func) {
        if (this.ticketFunctions[name]) throw Error(name + " is already a ticket function");
        this.ticketFunctions[name] = func
    }
    
    ticketProto.openProcess = function openProcess() {++this.openProcesses}
    
    ticketProto.closeProcess = function closeProcess() {
        if (--this.openProcesses == 0) {
            for (let item in this.items) for (let ticketFunction in this.items[item]) this.ticketFunctions[ticketFunction](item, ...this.items[item][ticketFunction]);
            this.items = {};
        }
    }
    
    ticketProto.addTicket = function addTicket(item, ticketFunction, ...data) {
        if (this.openProcesses == 0) return this.ticketFunctions[ticketFunction](item, ...data);
        if (!this.items[item]) this.items[item] = {};
        this.items[item][ticketFunction] = data;
    }
    
    var pageTickets = ticketSystem.newTicketSystem();
    pageTickets.saveTheseObject = {};
    
    pageTickets.addTicketFunction("save", function(pageId) {
        pageTickets.saveTheseObject[pageId] = undefined;
    });
    
    pageTickets.addTicketFunction("smoothMode", function(pageId, smoothMode){
        postMessage(["smoothMode", smoothMode]);
    });
    
    pageTickets.addTicket = function addTicket(pageId, ticketFunction, ...data) {
        postMessage(["setLoadingScreen", pages.items[pageId].name + " " + ticketFunction + " " + data]);
        ticketProto.addTicket.call(this, pageId, ticketFunction, ...data);
    }
    
    pageTickets.openProcess = function openProcess() {
        ticketProto.openProcess.call(this);
    }
    
    pageTickets.closeProcess = function closeProcess() {
        if (--this.openProcesses == 0) {
            for (let item in this.items) for (let ticketFunction in this.items[item]) this.ticketFunctions[ticketFunction](item, ...this.items[item][ticketFunction]);
            this.items = {};
            this.save();
            postMessage(["closeLoadingScreen"]);
        }
    }
    
    pageTickets.save = function save() {
        for (let pageId in this.saveTheseObject) postMessage(["save", pageId, pages.items[pageId].saveToString()]);
        this.saveTheseObject = {};
        postMessage(["setMaxPageId", pages.items.length]);
    }
    
    var guiLinkTickets = ticketSystem.newTicketSystem();
    
    guiLinkTickets.addTicket = function addTicket(linkId, ticketFunction, ...data) {
        postMessage(["setLoadingScreen", guiLinks.items[linkId].name + " " + ticketFunction + " " + data]);
        ticketProto.addTicket.call(this, linkId, ticketFunction, ...data);
    }
    
    guiLinkTickets.openProcess = function openProcess() {
        pageTickets.openProcess();
        ticketProto.openProcess.call(this);
    }
    
    guiLinkTickets.closeProcess = function closeProcess() {
        if (--this.openProcesses == 0) {
            for (let item in this.items) for (let ticketFunction in this.items[item]) this.ticketFunctions[ticketFunction](item, ...this.items[item][ticketFunction]);
            pageTickets.closeProcess();
        }
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
    
    guiLinkTickets.addTicketFunction("pageNameCheck", function(pageId, proposedValue) {
        let page = pages.items[pageId];
        if (page.parent) for (let child of page.parent.childPages) if (proposedValue === child.name) return postMessage(["pageNameCheck", pageId, proposedValue, false]);
        page.manager.setVarValue("name", proposedValue);
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
    
    guiLinkTickets.addTicketFunction("moveTo", function(linkId, parentId) {
        postMessage(["movePage", linkId, parentId]);
    })
}

// varManager
{
    let unitProto = {
        unlink: function() {
            this.next.previous = this.previous;
            this.previous.next = this.next;
        }
    }
    let changeProto = {
        addUnit: function(lastOne, unit) {
            lastOne.previous.next = unit;
            unit.previous = lastOne.previous;
            lastOne.previous = unit;
            unit.next = lastOne;
        }
    };
    let varManagerProtoModel = {
        setVarValue: function setVarValue(name, value) {
            if (!(name in this.vars)) {
                let linkedLists = Object.create(changeProto);
                this.vars[name] = linkedLists;
                linkedLists.firstProperty = {};
                linkedLists.lastProperty = {previous: linkedLists.firstProperty, object: linkedLists, propertyName: "value"};
                linkedLists.firstProperty.next = linkedLists.lastProperty;
                linkedLists.firstListener = {};
                linkedLists.lastListener = {previous: linkedLists.firstListener, listener: emptyFunction};
                linkedLists.firstListener.next = linkedLists.lastListener;
                linkedLists.firstUnlink = {};
                linkedLists.lastUnlink = {previous: linkedLists.firstUnlink, unlink: emptyFunction};
                linkedLists.firstUnlink.next = linkedLists.lastUnlink;
            }
            let change = this.vars[name], unit = change.firstProperty, oldValue = change.value;
            while (unit = unit.next) unit.object[unit.propertyName] = value;
            unit = change.firstListener;
            while (unit = unit.next) unit.listener(value, oldValue);
        },
        deleteVar: function deleteVar(varName) {
            let unit = this.vars[varName].firstUnlink;
            while (unit = unit.next) unit.unlink();
            delete this.vars[varName];
        },
        linkProperty: function linkProperty(varName, object, propertyName = varName) {
            let change = this.vars[varName];
            object[propertyName] = change.value;
            let unit = Object.create(unitProto);
            unit.object = object;
            unit.propertyName = propertyName;
            change.addUnit(change.lastProperty, unit);
            let unlinkUnit = {};
            unlinkUnit.unlink = function() {
                unit.unlink();
                unit.unlink.call(unlinkUnit);
            }
            change.addUnit(change.lastUnlink, unlinkUnit);
            return unlinkUnit.unlink;
        },
        linkListener: function linkListener(varName, listener, fireWith = undefined) {
            let change = this.vars[varName];
            if (typeof fireWith != "undefined") listener(change.value, fireWith);
            let unit = Object.create(unitProto);
            unit.listener = listener;
            change.addUnit(change.lastListener, unit);
            let unlinkUnit = {};
            unlinkUnit.unlink = function() {
                unit.unlink();
                unit.unlink.call(unlinkUnit);
            }
            change.addUnit(change.lastUnlink, unlinkUnit);
            return unlinkUnit.unlink;
        },
        clearAll: function clearAll() {
            for (let v in this.vars) this.deleteVar(v);
        },
        numLinkeds: function numLinkeds(varName) {
            let returner = 0;
            if (varName === undefined) {
                for (let name in this.vars) returner += this.numLinkeds(name);
                return returner;
            }
            let change = this.vars[varName];
            let unit = change.firstProperty.next;
            while (unit) {
                ++returner;
                unit = unit.next;
            }
            unit = change.firstListener.next;
            while (unit) {
                ++returner;
                unit = unit.next;
            }
            unit = change.firstUnlink.next;
            while (unit) {
                ++returner;
                unit = unit.next;
            }
            return returner;
        },
        numAllLinkeds: function numAllLinkeds() {
            let returner = 0;
            for (let name in this.vars) returner += this.numLinkeds(name);
            return returner;
        }
    };

    function newVarManager(protoModel = varManagerProtoModel) {
        let returner = Object.create(varManagerProtoModel);
        returner.vars = {};
        return returner;
    }
}

// idSystem
{
    function capitalizeFirstLetter(line) {
        if (line.length == 0) return line;
        return line.charAt(0).toUpperCase() + line.slice(1);
    }
    
    var idManager = {};

    idManager.protoModel = {};

    idManager.newManager = function newManager(idName = "id", protoModel = idManager.protoModel) {
        let returner = Object.create(protoModel);
        returner.items = [];
        returner.idName = idName;
        returner.setIdName = "set"+capitalizeFirstLetter(idName);
        returner.defaultSetIdName = function(id) {this[idName] = id};
        returner.numHoles = 0;
        return returner;
    }

    idManager.protoModel.addItem = function addItem(item) {
        if (this.idName in item) throw Error("item already has property " + this.idName);
        if (!item[this.setIdName]) item[this.setIdName] = this.defaultSetIdName;
        item[this.setIdName](this.items.length);
        this.items.push(item);
    }

    idManager.protoModel.eraseItem = function eraseItem(id) {
        this.items[id] = false;
        ++this.numHoles;
    }
    
    idManager.protoModel.skip = function skip() {
        this.eraseItem(this.items.length);
    }

    idManager.protoModel.collapse = function collapse() {
        if (this.numHoles === 0) return;
        let shift = 0;
        for (let i = 0; i < this.items.length; ++i) {
            if (this.items[i]) {
                if (shift === 0) continue;
                let item = this.items[i];
                item[this.idName] -= shift;
                this.items[item[this.idName]] = item;
                if (item.setId) item.setId(item[this.idName]);
            } else ++shift;
        }
        this.items.splice(this.items.length - this.numHoles);
        this.numHoles = 0;
    }
    
    pages = idManager.newManager("pageId");
    guiLinks = idManager.newManager("linkId");
}