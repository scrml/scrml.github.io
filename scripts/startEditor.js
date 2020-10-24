ScriptManager.openScript(filePrefix + "scripts/gui.js", "gui");
Scripts["gui"].script.addEventListener("managed", start);

let root, pageProto = {}, chapterProto = Object.create(pageProto), statementProto, commentProto, buttons, pageTools, numPages = 0, allPagesByNumber = [], allPagesByName = {};

function start() {
    document.getElementById("debugButton").addEventListener("click", function() {
        console.log(allPagesByNumber);
        console.log(allPagesByName);
    });
    //gui.button("clear memory", document.body, function() {window.localStorage.clear()});
    document.getElementById("debugButton").setAttribute("hide", "");
    editor.appendChild(testDiv);
    makePageTools();
    let savedRoot = storage.fetch("root");
    storage.deactivated = true;
    root = newChapter(false, false, savedRoot === null? "Book": savedRoot);
    root.show();
    root.chapterHead.setAttribute("id", "rootHead");
    document.getElementById("editor").appendChild(root.div);
    root.newPageMakers = {
        chapter: function(gap, name) {
            newChapter(gap.SCRMLEditorTiein.chapter, gap.SCRMLEditorTiein.nextPage, name);
        }
    };
    root.setPageMode = function setPageMode(mode) {
        if (this.newPageMode != "moveHere" && this.newPageMode != "dontMoveHere") this.lastPageMode = this.newPageMode? this.newPageMode: mode;
        this.newPageMode = mode;
        this.applyToSubChapters(function() {
            if (this.cleanupGaps) for (let f of this.cleanupGaps) {
                f.SCRMLEditorTiein.gap.setAttribute("mode", mode);
                f.SCRMLEditorTiein.gap.removeAttribute("disabled");
            }
        });
    }
    root.setPageMode("chapter");
    for (let type of ["chapter", "statement", "comment"]) document.getElementById(type+"Mode").addEventListener("click", function() {root.setPageMode(type)});
    storage.deactivated = false;
    root.updateSave = function updateSave(newFullName, oldFullName) {
        chapterProto.updateSave.apply(root, [newFullName, oldFullName]);
        storage.store("root", newFullName);
    }
    if (savedRoot) buildPageFromSave(storage.fetch("root")); else root.open(true);
}

let focusLocked = false, isFocused = undefined;

function makePageTools() {
    pageTools = gui.element("div", false, ["id", "pageTools"]);
    pageTools.moveButton = gui.button("⇳", pageTools, toMoveMode, ["disguise", "", "bigger", ""]);
    pageTools.deleteBundle = gui.deleteBundle(pageTools, function() {isFocused.deletePage()});
}

function pageToolsMouseoverListener(e) {
    if (focusLocked) return;
    e = e.target;
    while (!e.SCRMLEditorTiein || !e.SCRMLEditorTiein.page) e = e.parentElement;
    e.SCRMLEditorTiein.page.focus();
}

function lockFocus(page) {
    page.focus();
    focusLocked = true;
}

function unlockFocus() {
    if (root.newPageMode == "moveHere") root.setPageMode(root.lastPageMode);
    focusLocked = false;
    isFocused = undefined;
    if (pageTools.parentElement) pageTools.parentElement.removeChild(pageTools);
}

function toMoveMode(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (focusLocked) {
        unlockFocus();
        root.setPageMode(root.lastPageMode);
        return;
    }
    lockFocus(isFocused);
    root.setPageMode("moveHere");
    isFocused.applyToSubChapters(function() {
        if (this.cleanupGaps) for (let f of this.cleanupGaps) {
            f.SCRMLEditorTiein.gap.setAttribute("mode", "dontMoveHere");
            f.SCRMLEditorTiein.gap.setAttribute("disabled", "");
        }
    });
}

function newChapter(parent, insertBefore, name = "") {
    let returner = Object.create(chapterProto);
    returner.isChapter = true;
    allPagesByNumber.push(returner);
    returner.manager = newVarManager();
    returner.manager.setVarValue("name", name);
    returner.manager.linkProperty("name", returner);
    returner.manager.setVarValue("pageNumber", numPages++);
    returner.manager.linkProperty("pageNumber", returner);
    returner.manager.setVarValue("nickname", "");
    returner.manager.linkProperty("nickname", returner);
    returner.nicknameMode = false;
    returner.manager.setVarValue("chapterNumber", -1);
    returner.manager.linkProperty("chapterNumber", returner);
    returner.manager.linkListener("chapterNumber", function(chapterNumber) {
        returner.updateFullChapterNumber(chapterNumber);
        if (returner.nextChapter) returner.nextChapter.manager.setVarValue("chapterNumber", chapterNumber+1);
    }, true);
    returner.manager.linkProperty("fullChapterNumber", returner);
    returner.manager.linkListener("fullChapterNumber", function() {if (returner.firstChapter) returner.firstChapter.updateFullChapterNumber(1)});
    returner.manager.setVarValue("fullName", "");
    returner.manager.linkListener("name", function(newName) {returner.updateFullName(newName)});
    returner.manager.linkListener("fullChapterNumber", function() {returner.updateFullName()}, true);
    returner.manager.linkProperty("fullName", returner);
    returner.manager.linkListener("fullName", function(newName, oldName) {
        delete allPagesByName[oldName];
        allPagesByName[newName] = returner;
    }, true);
    returner.manager.linkListener("nickname", function(nickname) {
        returner.nickname = nickname;
        returner.updateSave(returner.fullName, returner.fullName);
    });
    returner.manager.linkListener("fullName", function(newName, oldName) {returner.updateSave(newName, oldName)});
    returner.manager.linkListener("name", function() {if (returner.parent) returner.parent.updateSave(returner.parent.fullName)});
    if (parent) parent.insertBefore(returner, insertBefore);
    return returner;
}

chapterProto.childNameScreen = function childNameScreen(proposal) {
    if (!gui.nodeNameScreen(proposal)) return false;
    let page = this.firstPage;
    while (page) {
        if (page.name == proposal) return false;
        page = page.nextPage;
    }
    return true;
}

pageProto.orphan = function orphan() {
    if (!this.parent) return;
    if (this.parent.showCleanups && this.parent.isOpen) {
        let array = this.parent.cleanupGaps;
        for (let i = 0; i < array.length; ++i) if (array[i].SCRMLEditorTiein.gap == this.previousGap) {
            array[i]();
            array.splice(i, 1);
            break;
        }
        this.nextGap.SCRMLEditorTiein.previousPage = this.previousPage;
        if (this.previousPage) this.previousPage.nextGap = this.nextGap;
        this.div.parentElement.removeChild(this.div);
    }
    if (this.previousPage) this.previousPage.nextPage = this.nextPage;
    else this.parent.firstPage = this.nextPage;
    if (this.nextPage) this.nextPage.previousPage = this.previousPage;
    else this.parent.lastPage = this.previousPage;
    if (this.previousChapter) this.previousChapter.nextChapter = this.nextChapter;
    else this.parent.firstChapter = this.nextChapter;
    if (this.nextChapter) this.nextChapter.previousChapter = this.previousChapter;
    else this.parent.lastChapter = this.previousChapter;
    if (this.previousChapter) this.previousChapter.manager.setVarValue("chapterNumber", this.previousChapter.chapterNumber);
    else if (this.nextChapter) this.nextChapter.manager.setVarValue("chapterNumber", this.nextChapter.chapterNumber-1);
    this.parent = this.previousPage = this.nextPage = this.previousChapter = this.nextChapter = undefined;
}

chapterProto.insertBefore = function insertBefore(newPage, beforeMe) {
    if (newPage == beforeMe || (beforeMe && newPage.nextPage == beforeMe) || (newPage == this.lastPage && !beforeMe)) return;
    if (beforeMe && (this != beforeMe.parent)) throw Error("the kid is not my son");
    let oldParent = newPage.parent;
    newPage.orphan();
    if (oldParent) oldParent.updateSave(oldParent.fullName);
    if (!this.childNameScreen(newPage.name)) {
        let modifier = 0;
        while (!this.childNameScreen(newPage.name + "_" + ++modifier));
        newPage.manager.setVarValue("name", newPage.name + "_" + modifier);
    }
    newPage.parent = this;
    if (beforeMe) {
        if (beforeMe == this.firstPage) this.firstPage = newPage;
        else {
            beforeMe.previousPage.nextPage = newPage;
            newPage.previousPage = beforeMe.previousPage;
        }
        newPage.nextPage = beforeMe;
        beforeMe.previousPage = newPage;
    } else {
        if (this.lastPage) {
            this.lastPage.nextPage = newPage;
            newPage.previousPage = this.lastPage;
        } else this.firstPage = newPage;
        this.lastPage = newPage;
    }
    if (newPage.isChapter) {
        if (beforeMe && beforeMe.isChapter) {
            newPage.nextChapter = beforeMe;
            newPage.previousChapter = beforeMe.previousChapter;
            if (beforeMe.previousChapter) beforeMe.previousChapter.nextChapter = newPage;
            else this.firstChapter = newPage;
            beforeMe.previousChapter = newPage;
        } else {
            if (beforeMe && beforeMe.nextChapter) {
                newPage.nextChapter = beforeMe.nextChapter;
                newPage.previousChapter = beforeMe.nextChapter.previousChapter;
                beforeMe.nextChapter.previousChapter = newPage;
                if (newPage.previousChapter) newPage.previousChapter.nextChapter = newPage;
                else this.firstChapter = newPage;
            } else {
                if (this.lastChapter) {
                    this.lastChapter.nextChapter = newPage;
                    newPage.previousChapter = this.lastChapter;
                } else this.firstChapter = newPage;
                this.lastChapter = newPage;
            }
        }
        let page = newPage.previousChapter;
        if (!page) page = this.firstPage;
        while (page != newPage) {
            page.nextChapter = newPage;
            page = page.nextPage;
        }
        page = beforeMe;
        while (page && !page.isChapter) {
            page.previousChapter = newPage;
            page = page.nextPage;
        }
        if (newPage.previousChapter) newPage.previousChapter.manager.setVarValue("chapterNumber", newPage.previousChapter.chapterNumber);
        else newPage.manager.setVarValue("chapterNumber", 1);
    }
    if (this.showCleanups && this.isOpen) {
        newPage.show();
        let replacing;
        if (beforeMe) replacing = beforeMe.previousGap;
        else if (newPage.previousPage) replacing = newPage.previousPage.nextGap;
        else replacing = this.cleanupGaps[0].SCRMLEditorTiein.gap;
        this.div.insertBefore(newPage.div, replacing);
        this.cleanupGaps.push(newGap(this, newPage, "previous", gapHandler));
        newPage.nextGap = replacing;
        replacing.SCRMLEditorTiein.previousPage = newPage;
    } else newPage.hide();
    newPage.updateFullName();
    this.updateSave(this.fullName);
}
chapterProto.show = function show() {
    if (this.showCleanups) return;
    let me = this;
    me.showCleanups = {};
    me.div = gui.element("details", null, ["class", "chapter"]);
    me.div.SCRMLEditorTiein = {chapter: this, page: this};
    me.showCleanups.removeDiv = function() {removeAndErase(me, "div", me.smoothly)}
    let elements = {};
    me.showCleanups.EraseElements = function() {for (let e in elements) me[e] = undefined}
    elements.chapterHead = gui.element("summary", me.div, ["class", "chapterHead"]);
    elements.chapterHead.chapter = me;
    elements.chapterHead.addEventListener("click", function() {
        if (me.isOpen) me.close(); else me.open();
        me.updateSave(me.fullName);
    });
    elements.chapterNumberSpan = gui.element("span", elements.chapterHead, ["class", "chapterNumber"]);
    elements.chapterNumberText = gui.text("", elements.chapterNumberSpan);
    elements.nameSwapButton = gui.button("⥄", elements.chapterHead, function() {me.nameSwap()}, ["class", "nameSwapButton", "disguise", ""]);
    gui.absorbClicks(elements.nameSwapButton);
    elements.nameSpan = gui.linkedScreenedInput(elements.chapterHead, me.manager, "name", {
        screen: me.parent? function(name) {return me.parent.childNameScreen(name)}: gui.nodeNameScreen,
        atts: ["class", "name", "disguise", ""],
        absorbClicks: true
    });
    me.showCleanups.unlinkName = elements.nameSpan.unlink;
    elements.nameSpan = elements.nameSpan.element;
    elements.nicknameSpan = gui.linkedScreenedInput(null, me.manager, "nickname", {
        screen: trueFunction,
        atts: ["class", "nickname", "disguise", "", "placeholder", "nickname"],
        absorbClicks: true
    });
    me.showCleanups.unlinkNickname = elements.nicknameSpan.unlink;
    elements.nicknameSpan = elements.nicknameSpan.element;
    for (let e in elements) {me[e] = elements[e]}
    me.showCleanups.chapterNumberText = me.manager.linkProperty("fullChapterNumber", elements.chapterNumberText, "nodeValue");
    if (me.parent) me.parent.div.appendChild(me.div);
    if (me.wasOpen) me.open(true);
    if (me.nicknameMode) {
        me.nicknameMode = false;
        me.nameSwap();
    }
    this.chapterHead.addEventListener("mouseover", pageToolsMouseoverListener);
}

chapterProto.hide = function hide() {
    if (this.wasOpen = this.isOpen) this.close();
    doAll(this.showCleanups);
    this.showCleanups = undefined;
    if (this == isFocused) unlockFocus();
}

chapterProto.open = function open(simulated = false) {
    this.show();
    let me = this;
    me.isOpen = me.smoothly = true;
    if (simulated) me.div.setAttribute("open", "");
    doAll(me.cleanupsBeforeOpening);
    me.cleanupsBeforeOpening = undefined;
    me.cleanupsBeforeClosing = {};
    let page = me.firstPage;
    while (page) {
        page.smoothly = true;
        page.show();
        page = page.nextPage;
    }
    me.cleanupGaps = [];
    me.cleanupsBeforeClosing.cleanupGaps = function() {doEach(me.cleanupGaps)}
    me.cleanupGaps.push(newGap(me, undefined, undefined, gapHandler));
    page = me.firstPage;
    if (page) {
        me.cleanupGaps[0].SCRMLEditorTiein.gap.SCRMLEditorTiein.nextPage = page;
        page.previousGap = me.cleanupGaps[0].SCRMLEditorTiein.gap;
        me.div.insertBefore(me.cleanupGaps[0].SCRMLEditorTiein.gap, page.div);
    }
    while (page) {
        me.cleanupGaps.push(newGap(me, page, "next", gapHandler));
        page = page.nextPage;
    }
}

chapterProto.close = function close(simulated = false) {
    this.isOpen = this.smoothly = false;
    if (simulated) this.div.removeAttribute("open");
    doAll(this.cleanupsBeforeClosing);
    this.cleanupsBeforeClosing = undefined;
    this.cleanupsBeforeOpening = {};
    let page = this.firstPage;
    while (page) {
        page.smoothly = false;
        page.hide();
        page = page.nextPage;
    }
    this.updateSave(this.fullName);
}

chapterProto.focus = function focus() {
    if (focusLocked || this == isFocused) return;
    isFocused = this;
    this.chapterHead.appendChild(pageTools);
    pageTools.deleteBundle.resetBundle();
}
let gapNumber = 0;
function newGap(chapter, page, direction, onclick, text = "", divClass = "gap") {
    let gap = gui.button(text, chapter.div, onclick, ["class", divClass, "disguise", "", "mode", root.newPageMode], page? direction == "previous"? page.div: page.div.nextElementSibling: null);
    gap.gapNumber = gapNumber++;
    gap.setAttribute("gapNumber", gap.gapNumber);
    if (root.newPageMode == "moveHere" && isAncestorOf(isFocused, chapter)) {
        gap.setAttribute("mode", "dontMoveHere");
        gap.setAttribute("disabled", "");
    }
    gap.SCRMLEditorTiein = {chapter: chapter};
    if (page) page[direction+"Gap"] = gap;
    let oppositeDirection = direction == "previous"? "next": "previous";
    gap.SCRMLEditorTiein[oppositeDirection+"Page"] = page;
    if (page && page[direction+"Page"]) {
        page[direction+"Page"][oppositeDirection+"Gap"] = gap;
        gap.SCRMLEditorTiein[direction+"Page"] = page[direction+"Page"];
    }
    let returner = function() {
        if (gap.parentElement) gap.parentElement.removeChild(gap);
        if (gap.SCRMLEditorTiein.previousPage) gap.SCRMLEditorTiein.previousPage.nextGap = undefined;
        if (gap.SCRMLEditorTiein.nextPage) gap.SCRMLEditorTiein.nextPage.previousGap = undefined;
    }
    returner.SCRMLEditorTiein = {gap: gap};
    return returner;
}

function gapHandler(e) {
    let gap = e.target;
    while (!gap.SCRMLEditorTiein) gap = gap.parentElement;
    if (root.newPageMode == "moveHere") {
        let moving = isFocused, beforeHere = gap.SCRMLEditorTiein.nextPage, chapter = gap.SCRMLEditorTiein.chapter;
        unlockFocus();
        root.setPageMode(root.lastPageMode);
        chapter.insertBefore(moving, beforeHere);
    } else gui.focusedScreenedInputReplace(
        gap.parentElement,
        gap,
        function(name) {root.newPageMakers[root.newPageMode](gap, name)},
        {
            atts: ["class", "gap", "disguise", ""],
            screen: function(name) {return gap.SCRMLEditorTiein.chapter.childNameScreen(name)}
        }
    );
}

chapterProto.nameSwap = function nameSwap() {
    if (this.nicknameMode) {
        this.chapterHead.replaceChild(this.nameSpan, this.nicknameSpan);
        this.nameSwapButton.innerHTML = "⥄";
    } else {
        this.chapterHead.replaceChild(this.nicknameSpan, this.nameSpan);
        this.nameSwapButton.innerHTML = "⥂";
    }
    this.nicknameMode = !this.nicknameMode;
    this.updateSave(this.fullName);
}

chapterProto.computeFullChapterNumber = function computeFullChapterNumber(chapterNumber) {
    if (this.parent) {
        if (this.parent.parent) return this.parent.fullChapterNumber + "." + chapterNumber;
        else return chapterNumber;
    }
    else return "";
}

chapterProto.updateFullChapterNumber = function updateFullChapterNumber(chapterNumber) {
    this.manager.setVarValue("fullChapterNumber", this.computeFullChapterNumber(chapterNumber));
}

chapterProto.computeFullName = function computeFullName(name) {
    if (typeof name == "undefined") name = this.name;
    if (this.parent) {
        if (this.parent.parent) return this.parent.fullChapterNumber + "." + name;
        else return this.parent.name + "." + name;
    } else return name;
}

chapterProto.updateFullName = function updateFullName(name) {
    this.manager.setVarValue("fullName", this.computeFullName(name));
}

chapterProto.applyToSubChapters = function applyToSubChapters(func, ...args) {
    func.apply(this, args);
    let sub = this.firstChapter;
    while (sub) {
        sub.applyToSubChapters(func, args);
        sub = sub.nextChapter;
    }
}

chapterProto.deletePage = function deletePage() {
    while (this.firstPage) this.parent.insertBefore(this.firstPage, this);
    delete allPagesByName[this.fullName];
    storage.erase("page "+this.fullName);
    let parent = this.parent;
    this.orphan();
    if (allPagesByNumber[this.pageNumber+1]) allPagesByNumber[this.pageNumber+1].decrementPageNumber();
    allPagesByNumber.pop();
    --numPages;
    parent.updateSave(parent.fullName);
}

chapterProto.decrementPageNumber = function decrementPageNumber() {
    this.manager.setVarValue("pageNumber", this.pageNumber-1);
    allPagesByNumber[this.pageNumber] = this;
    if (allPagesByNumber[this.pageNumber+2]) allPagesByName[this.pageNumber+2].decrementPageNumber();
}

chapterProto.saveToString = function saveToString() {
    let line = "";
    line += this.nickname + "\n";
    line += this.nicknameMode? "nickname ": "name ";
    line += this.isOpen? "open\n" : "closed\n";
    let child = this.firstPage;
    while (child) {
        line += child.fullName;
        child = child.nextPage;
        if (child) line += " ";
    }
    line += "\n";
    return line;
}

function buildPageFromSave(fullName) {
    if (!(fullName in allPagesByName)) throw Error(fullName + " is not a page");
    let page = allPagesByName[fullName];
    storage.deactivated = false;
    let lines = storage.fetch("page "+fullName).split("\n");
    storage.deactivated = true;
    page.manager.setVarValue("nickname", lines[0]);
    let sublines = lines[1].split(" ");
    if (sublines[0] == "nickname" && !page.nicknameMode) {
        if (page.showCleanups) page.nameSwap();
        else page.nicknameMode = true;
    }
    if (sublines[1] == "open" && !page.isOpen) page.open(true);
    if (lines[2] != "") {
        let pageFullNames = lines[2].split(" ");
        for (let pageFullName of pageFullNames) {
            storage.deactivated = true;
            newChapter(page, false, nameFromFullName(pageFullName));
            buildPageFromSave(pageFullName);
        }
    }
    storage.deactivated = false;
}

function nameFromFullName(line) {
    if (line == root.name) return line;
    if (line.substring(0, root.name.length) == root.name) return line.substring(root.name.length+1);
    let i = 0;
    while (!gui.nodeNameScreen(line.charAt(i))) ++i;
    return line.substring(i);
}

chapterProto.updateSave = function updateSave(newFullName, oldFullName = newFullName) {
    storage.erase("page "+oldFullName);
    storage.store("page "+newFullName, this.saveToString());
}

function doAll(functions, ...args) {for (let f in functions) functions[f](args)}

function doEach(functions, ...args) {for (let f of functions) f(args)}

function removeAndErase(object, elementName, smooth = false) {
    if (object[elementName]) if (object[elementName].parentNode) {
        if (smooth) gui.smoothErase(object[elementName]);
        else object[elementName].parentNode.removeChild(object[elementName]);
    }
    object[elementName] = undefined;
}
