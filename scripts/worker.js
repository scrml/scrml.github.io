/*
Some structure:
The worker holds all information about the SCRML file. The only thing not in the worker, beyond the structure needed to start the worker, is the DOM itself. The page calls to the worker to do things and the worker calls to the page to show/hide/manipulate DOM elements.
*/

onmessage = function onmessage(e) {
    pageTickets.openProcess();
    functions[e.data.shift()](...e.data);
    pageTickets.closeProcess();
}

function fetched(type, id, dataName, ...data) {postMessage(["fetched", type, id, dataName, ...data])}

let functions = {}, pages, pageProto = {}, chapterProto = Object.create(pageProto), statementProto = Object.create(pageProto), commentProto = Object.create(pageProto), movingPage = false, guiUnits = [], guiLinkSetups = {};

functions.log = console.log;

functions.printAll = function() {
    console.dir(pages);
};

function newPage(parentNumber, insertBeforeNumber, name, protoModel = pageProto) {
    let returner = Object.create(protoModel);
    pages.addItem(returner);
    returner.manager = newVarManager();
    returner.manager.setVarValue("name", name);
    returner.manager.linkProperty("name", returner);
    //returner.manager.linkListener("name", function(newName) {pageTickets.addTicket(returner.pageNumber, "name", newName)}, true);
    //returner.manager.linkListener("name", function(newName) {returner.updateFullName()});
    //returner.manager.linkListener("name", function() {returner.preSave()});
    returner.manager.setVarValue("nickname", "");
    returner.manager.linkProperty("nickname", returner);
    //returner.manager.linkListener("nickname", function(newNickname) {pageTickets.addTicket(returner.pageNumber, "nickname", newNickname)}, true);
    //returner.manager.linkListener("nickname", function() {returner.preSave()});
    returner.manager.setVarValue("siblingNumber", 0);
    returner.manager.linkProperty("siblingNumber", returner);
    /*returner.manager.linkListener("siblingNumber", function(siblingNumber) {
        returner.updateFullPageNumber(siblingNumber);
        if (returner.nextPage) returner.nextPage.manager.setVarValue("siblingNumber", siblingNumber+1);
        pageTickets.addTicket(returner.pageNumber, "siblingNumber", siblingNumber);
    });
    returner.manager.setVarValue("fullPageNumber", 0);
    returner.manager.linkProperty("fullPageNumber", returner);
    returner.manager.linkListener("fullPageNumber", function(fullPageNumber) {
        returner.updateFullName();
        pageTickets.addTicket(returner.pageNumber, "fullPageNumber", fullPageNumber);
    });
    returner.manager.setVarValue("fullName", name);
    returner.manager.linkProperty("fullName", returner);
    returner.manager.linkListener("fullName", function(fullName) {pageTickets.addTicket(returner.pageNumber, "fullName", fullName)});
    movePage(pageNumber, parentNumber, insertBeforeNumber);*/
    returner.manager.setVarValue("isInUse", false);
    //returner.manager.linkListener("isInUse", function(inUse) {pageTickets.addTicket(returner.pageNumber, "isInUse", inUse)}, true);
    //returner.manager.linkListener("isInUse", function() {returner.preSave()});
    //returner.preSave();
    return returner;
}

function newChapter(parentId, insertBeforeId, name, protoModel = chapterProto) {
    let returner = newPage(parentId, insertBeforeId, name, protoModel);
    returner.pageType = "chapter";
    returner.childPages = [];
    return returner;
}

function newStatement(parentNumber, insertBeforeNumber, pageNumber, name, protoModel = statementProto) {
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
}

function movePage(pageNumber, parentNumber, insertBeforeNumber) {
    if (pageNumber == insertBeforeNumber) return;
    let page = pages[pageNumber], newParent = pages[parentNumber], insertBefore = pages[insertBeforeNumber];
    if (insertBefore && page.nextPage == insertBefore) return;
    else if (page.parent && page.parent.pageNumber == parentNumber && insertBefore == null && !page.nextPage) return;
    fetched(pageNumber, "parent", parentNumber, insertBeforeNumber);
    if (page.parent) {
        let oldParent = page.parent, sn = page.siblingNumber, prev = page.previousPage, next = page.nextPage;
        page.previousPage = page.nextPage = undefined;
        if (prev) prev.nextPage = next;
        if (next) next.previousPage = prev;
        oldParent.childPages.splice(sn-1, 1);
        if (oldParent.childPages.length == 0) oldParent.manager.setVarValue("isInUse", false);
        if (next) next.manager.setVarValue("siblingNumber", next.siblingNumber - 1);
        pageTickets.addTicket(oldParent.pageNumber, "save");
    }
    if (newParent) {
        page.parent = newParent;
        if (insertBefore) {
            page.nextPage = insertBefore;
            page.previousPage = insertBefore.previousPage;
            if (page.previousPage) page.previousPage.nextPage = page;
            insertBefore.previousPage = page;
            newParent.childPages.splice(insertBefore.siblingNumber-1, 0, page);
            page.manager.setVarValue("siblingNumber", insertBefore.siblingNumber);
        } else {
            let prev = newParent.childPages[newParent.childPages.length - 1];
            newParent.childPages.push(page);
            page.previousPage = prev;
            if (prev) prev.nextPage = page;
            page.manager.setVarValue("siblingNumber", newParent.childPages.length);
        }
        if (!newParent.isInUse) newParent.manager.setVarValue("isInUse", true);
        pageTickets.addTicket(parentNumber, "save");
    } else {
        if (pageNumber != 0) throw Error("only page 0 can not have a parent");
        page.manager.setVarValue("siblingNumber", 0);
    }
}

functions.newChapter = function toldToMakeNewChapter(parentId, insertBeforeId, name, open = false) {
    let chapter = newChapter(parentId, insertBeforeId, name);
    if (open) guiLinkSetups.chapter(chapter);
}

guiLinkSetups.chapter = function setupChapterGuiLink(chapter) {
    if (chapter.unlinkGuiLink) throw Error("gui link already set up for chapter id " + chapter.id);
    guiLinks.addItem(chapter);
    postMessage(["openChapter", chapter.linkId, chapter.name]);
    let unlinks = chapter.unlinkGuiLink = {};
    unlinks.name = chapter.manager.linkListener("name", function(name) {
        fetched("page", chapter.id, "name", name);
    }, true);
}

functions.newStatement = newStatement;
functions.newComment = newComment;

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
    pageTickets.addTicket(pageNumber, "save");
}

functions.setNickname = function setNickname(pageNumber, nickname) {
    pages[pageNumber].manager.setVarValue("nickname", nickname);
    pageTickets.addTicket(pageNumber, "save");
}

functions.fetchParent = function fetchParent(pageNumber) {
    fetched(pageNumber, "parent", pages[pageNumber].parent);
}

functions.fetchName = function fetchName(pageNumber) {
    fetched(pageNumber, "name", pages[pageNumber].name);
}

functions.fetchNickname = function fetchNickname(pageNumber) {
    fetched(pageNumber, "nickname", pages[pageNumber].nickname);
}

functions.fetchFullName = function fetchFullName(pageNumber) {
    fetched(pageNumber, "fullName", pages[pageNumber].fullName);
}

functions.fetchPageNumber = function fetchPageNumber(pageNumber) {
    fetched(pageNumber, "pageNumber", pages[pageNumber].pageNumber);
}

functions.fetchFullPageNumber = function fetchFullPageNumber(pageNumber) {
    fetched(pageNumber, "fullPageNumber", pages[pageNumber].fullPageNumber);
}

functions.fetchAll = function fetchAll(pageNumber) {
    functions.fetchParent(pageNumber);
    functions.fetchName(pageNumber);
    functions.fetchNickname(pageNumber);
    functions.fetchFullName(pageNumber);
    functions.fetchPageNumber(pageNumber);
    functions.fetchFullPageNumber(pageNumber);
}

functions.pageNameCheck = function pageNameCheck(guiLinkId, proposedValue) {
    pageTickets.addTicket(getPageIdFromGuiLinkId(guiLinkId), "pageNameCheck", proposedValue);
}

functions.openDetails = function openDetails(pageNumber, open) {
    pages[pageNumber].openDetails(open);
}

functions.setTex = function setTex(pageNumber, tex) {
    pages[pageNumber].manager.setVarValue("tex", tex);
}

functions.startMoveModeChecks = function startMoveModeChecks(pageNumber) {
    movingPage = pages[pageNumber];
    for (let page of pages) if (page.isOpen && page.pageType == "chapter") postMessage(["canAcceptMove", page.pageNumber, page.canAcceptMove(pages[pageNumber])]);
}

functions.endMoveMode = function endMoveMode() {
    movingPage = false;
}

functions.move = function move(movingPageNumber, parentNumber, insertBeforeNumber) {
    movePage(movingPageNumber, parentNumber, insertBeforeNumber);
}

functions.openPageProcess = function openPageProcess() {pageTickets.openProcess()};

functions.closePageProcess = function closePageProcess() {pageTickets.closeProcess()};

functions.skipPageSpot = function skipPageSpot() {
    pages.push("skipped");
}

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

functions.removeSkippedPages = function removeSkippedPages() {
    let newPages = pages.filter(function(page) {return page != "skipped"});
    // check this part interval? after deleting page it throws this error
    if (newPages.length == pages.length) throw Error("should only call worker's removeSkippedPages if there are skipped pages to remove, did not find any");
    let i = 0;
    while (i < newPages.length) newPages[i].setPageNumber(i++);
    pages.splice(0, pages.length, ...newPages);
    functions.saveAll();
}

functions.saveAll = function saveAll() {
    for (let page of pages) page.preSave();
}

function getPageIdFromGuiLinkId(guiLinkId) {
    return guiLinks.items[guiLinkId].id;
}

pageProto.setId = function setId(newId) {
    this.id = newId;
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

pageProto.openDetails = function openDetails(open) {
    this.isOpen = open;
    pageTickets.saveTheseObject[this.pageNumber] = undefined;
    if (open && movingPage) postMessage(["canAcceptMove", this.pageNumber, this.canAcceptMove(movingPage)]);
}

pageProto.preSave = function preSave() {pageTickets.saveTheseObject[this.pageNumber] = undefined}

chapterProto.childPages = [];

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
    if (page.pageType == "chapter" && page.isAncestorOf(this)) return false;
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

// ticket system
{
    /*
        A ticket system is a way of deferring action until a process is complete. It starts by opening a process. Tickets are added while processes are open (if there are no open processes, the ticket is executed immediately). A ticket is stored in a (name, function) pair, both strings, where name is intended to be the id of an object and function refers to a function which can be performed on that object. The tickets pile up as a process continues, but only by name and function. That is, no matter how many times a ticket is added for a given (name, function) pair, that function will evaluate for that name only once at the end. The tickets are all automatically evaluated and flushed once the processes are all closed.
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

    pageTickets.addTicket = function addTicket(pageId, ticketFunction, ...data) {
        postMessage(["setLoadingScreen", pages.items[pageId].name + " " + ticketFunction + " " + data]);
        ticketProto.addTicket.call(this, pageId, ticketFunction, ...data);
    }

    pageTickets.closeProcess = function closeProcess() {
        if (--this.openProcesses == 0) {
            for (let item in this.items) for (let ticketFunction in this.items[item]) this.ticketFunctions[ticketFunction](item, ...this.items[item][ticketFunction]);
            this.items = {};
            postMessage(["save", this.saveThese()]);
            postMessage(["closeLoadingScreen"]);
        }
    }

    pageTickets.saveThese = function saveThese() {
        let returner = [];
        for (let pageNumber in this.saveTheseObject) {
            let save = {pageNumber: pageNumber};
            if (pages[pageNumber] == "skipped") save.line = "skipped";
            else save.line = pages[pageNumber].saveToString();
            if (pages[pageNumber].pageType == "comment") {
                save.commentTex = pages[pageNumber].tex;
            }
            returner.push(save);
        }
        this.saveTheseObject = {};
        return returner;
    }

    pageTickets.addTicketFunction("name", function(pageNumber, name) {
        fetched(pageNumber, "name", name);
    });

    pageTickets.addTicketFunction("nickname", function(pageNumber, nickname) {
        fetched(pageNumber, "nickname", nickname);
    });

    pageTickets.addTicketFunction("fullName", function(pageNumber, fullName) {
        fetched(pageNumber, "fullName", fullName);
    });

    pageTickets.addTicketFunction("pageNameCheck", function(pageId, proposedValue) {
        let page = pages.items[pageId];
        if (page.parent) for (let child of page.parent.childPages) if (proposedValue === child.name) return postMessage(["pageNameCheck", pageId, proposedValue, false]);
        page.manager.setVarValue("name", proposedValue);
    });

    pageTickets.addTicketFunction("siblingNumber", function(pageNumber, siblingNumber) {
        fetched(pageNumber, "siblingNumber", siblingNumber);
    });

    pageTickets.addTicketFunction("fullPageNumber", function(pageNumber, fullPageNumber) {
        fetched(pageNumber, "fullPageNumber", fullPageNumber);
    });

    pageTickets.addTicketFunction("save", function(pageNumber) {
        pageTickets.saveTheseObject[pageNumber] = undefined;
    });

    pageTickets.addTicketFunction("isInUse", function(pageNumber, inUse) {
        fetched(pageNumber, "isInUse", inUse);
    });
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
    
    pages = idManager.newManager();
    guiLinks = idManager.newManager("linkId");
}