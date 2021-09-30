// Nameless pages aren't actually nameless, they just set their names to "namelessPage##" where ## is their pageId. Also they don't show their names or other identifying information in the gui.

let pageType = scrmljs.mainLink.types.page, namelessType, gui = scrmljs.gui, editor = scrmljs.editor;

let hostInitializer = function hostInitializer() {
    scrmljs.loadCSS("styles/guiLinks/nameless.css");
    let extension = pageType.extensions.nameless, namelessProto = extension.linkProto = Object.create(pageType.linkProto);
    namelessProto.isType = "nameless";
    namelessProto.isNameless = true;
    namelessType = extension.type = Object.create(pageType);
    namelessType.isNameless = true;
    namelessType.linkProto = namelessProto;
    pageType.showNameless = namelessType.createLink = function createLink(linkId, extensionName = "nameless") {
        let page = pageType.createLink(linkId, extensionName);
        page.div.setAttribute("nameless", "");
        return page;
    }
}

let workerInitializer = function workerInitializer() {
    // first the raw nameless stuff
    let nameless = scrmljs.nameless = {}, pageProto = scrmljs.pageProtos.page, namelessProto = scrmljs.pageProtos.nameless = Object.create(pageProto);
    nameless.namePrefix = "SCRMLJS_nameless_name_is_pageID";
    nameless.overrideNamePrefix = "namelessNameOverride";
    
    namelessProto.pageType = "nameless";
    namelessProto.isNameless = true;
    
    nameless.namedConstructor = scrmljs.pageCreators.nameless = function newNameless(name, nickname, protoModel = namelessProto) {
        if (typeof name === "undefined") return nameless.namelessConstructor(protoModel);
        let returner = scrmljs.pageCreators.page(name, nickname, protoModel);
        if (name !== nameless.namePrefix + returner.pageId) throw Error("nameless page was given incompatible name" + name);
        return returner;
    }
    
    nameless.namelessConstructor = function newNameless(protoModel = namelessProto) {
        let newName = nameless.namePrefix + scrmljs.pages.items.length;
        // ensure newName is available
        let overrides = {}, allNames = {}, pages = scrmljs.pages.items;
        for (let page of pages) {
            allNames[page.name] = undefined;
            if (page.name === newName) overrides[page.pageId] = undefined;
        }
        let override = 0;
        for (let pageId in overrides) {
            while ((nameless.overrideNamePrefix + override) in allNames) ++override;
            pages[pageId].manager.setVarValue("name", nameless.overrideNamePrefix + override);
            ++override;
        }
        return nameless.namedConstructor(newName, "", protoModel);
    }
    
    namelessProto.setPageId = function setPageId(newId, oldId) {
        if (this.manager) this.manager.setVarValue("name", nameless.namePrefix + newId);
        pageProto.setPageId.call(this, newId, oldId);
    }
    
    // now for guiLink stuff
    
    let extension = pageType.extensions.nameless, nLinkProto = extension.linkProto = Object.create(pageType.linkProto);
    nLinkProto.isType = "nameless";
    nLinkProto.isNameless = true;
    namelessType = extension.type = Object.create(pageType);
    namelessType.linkProto = nLinkProto;
    namelessType.extensionName = "nameless";
    namelessType.createLink = function createLink(page, extensionName = "nameless") {
        return pageType.createLink(page, extensionName);
    }
}

pageType.extensions.nameless = {
    initializers: {
        host: hostInitializer,
        worker: workerInitializer
    }
}