scriptLoader.ensureJS("guiWorkerLink");

scriptLoader.items.guiWorkerLink.addEphemeralListener("js", function() {
    let pageType = guiWorkerLink.types.page = {};
    pageType.protoModel = Object.create(guiWorkerLink.linkProto);
    pageType.protoModel.isType = function() {return "page"};
    pageType.protoModel.isPage = true;
    
    pageType.protoModel.fetch = function fetch(dataName) {
        guiWorkerLink.linkProto.fetch.call(this, "page", dataName);
    }
    
    pageType.protoModel.askWorker = function askWorker(questionType, proposedValue) {
        guiWorkerLink.linkProto.askWorker.call(this, "page", questionType, proposedValue);
    }
    
    pageType.createUnit = function createUnit(linkId, loadHere, insertBefore, type = pageType) {
        let page = guiWorkerLink.newLink(linkId, loadHere, type, insertBefore);
        page.div = gui.element("details", loadHere, ["class", page.isType(), "linkid", linkId], insertBefore);
        page.div.addEventListener("toggle", type.toggleListener);
        page.div.addEventListener("mouseenter", type.focusListener);
        page.pageHead = gui.element("summary", page.div, ["class", "pageHead"]);
        page.pageHead.addEventListener("mouseenter", type.focusListener);
        page.siblingNumberSpan = gui.element("span", page.pageHead, ["class", "siblingnumber"]);
        page.siblingNumberText = gui.text("", page.siblingNumberSpan);
        page.fullPageNumberSpan = gui.element("span", page.pageHead, ["class", "fullpagenumber"]);
        page.fullPageNumberText = gui.text("", page.fullPageNumberSpan);
        page.nameSpan = gui.screenedInput(page.pageHead, {
            atts: ["class", "name", "disguise", ""],
            placeholder: "page name",
            onchange: type.nameProcessorListener,
            absorbClicks: true
        });
        page.nameSpan.addEventListener("blur", type.nameBlurredListener);
        page.nicknameSpan = gui.element("input", page.pageHead, ["type", "text", "placeholder", "nickname", "class", "nickname", "disguise", ""]);
        page.nicknameSpan.addEventListener("change", type.nameProcessorListener);
        gui.absorbClicks(page.nicknameSpan);
        page.fullNameSpan = gui.element("span", page.pageHead, ["class", "fullname"]);
        page.fullNameText = gui.text("", page.fullNameSpan);
        page.pageNumberOut = gui.text(linkId, page.pageHead);
        return page;
    }
    
    pageType.climber = gui.basicClimber(".page", editor);
    
    pageType.getLinkFromEvent = function getLinkFromEvent(e, type = pageType) {
        e = type.climber(e);
        return guiWorkerLink.links[e.getAttribute("linkid")];
    }
    
    pageType.toggleListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        console.log("toggling");
    }
    
    pageType.focusListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        console.log("focusing");
    }
    
    pageType.nameProcessorListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        e.askWorker("name", e.nameSpan.value);
    }
    
    pageType.nameBlurredListener = function(e, type = pageType) {
        e = type.getLinkFromEvent(e, type);
        e.fetch("name");
    }
    
    let chapterType = guiWorkerLink.types.chapter = Object.create(pageType);
    
    chapterType.protoModel = Object.create(pageType.protoModel);
    chapterType.protoModel.isType = function() {return "chapter"};
    chapterType.protoModel.isChapter = true;
    
    chapterType.climber = gui.basicClimber(".chapter", editor);
    portTypedEventListeners(pageType, chapterType, ["getLinkFromEvent", "nameBlurredListener", "focusListener", "nameProcessorListener"]);
        
    guiWorkerLink.openers.chapter = function openGuiChapter(linkId, name) {
        let returner = pageType.createUnit(linkId, editor, null, chapterType);
        return returner;
    }
});

function portTypedEventListeners(proto, instance, functionNames, defaultType = instance) {
    for (let name of functionNames) instance[name] = function(e, type = defaultType) {return proto[name](e, type)};
}