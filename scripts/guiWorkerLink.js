let protoModel, typeProto, linkProto, guiWorkerLink = scrmljs.guiWorkerLink = {}, loader = scrmljs.scriptLoader, getAllFunctions = scrmljs.getAllFunctions, portProperties = scrmljs.portProperties, emptyFunction = scrmljs.emptyFunction;

protoModel = guiWorkerLink.protoModel = {};

guiWorkerLink.openGuiWorkerLink = function openGuiWorkerLink(workerFunctions, whichSide, workerOrPostMessage) {
    let returner = Object.create(protoModel);
    returner.workerFunctions = workerFunctions;
    returner.postMessage = postMessage;
    returner.side = whichSide;
    if (whichSide === "host") {
        returner.worker = workerOrPostMessage;
        returner.postMessage = function(...args) {returner.worker.postMessage(args)};
    } else if (whichSide === "worker") returner.postMessage = workerOrPostMessage;
    else throw Error("side is " + whichSide + ", not host or worker");
    returner.types = {};
    // returner.links should be an idManager for the side which controls the links, but it defaults to a holder object
    returner.links = {};
    return returner;
}

protoModel.getLink = function getLink(linkId) {
    return this.links[linkId];
}

protoModel.getManagedLink = function getManagedLink(linkId) {
    return this.links.items[linkId];
}

protoModel.eraseLink = function eraseLink(linkId) {
    //console.log("directly deleting " + linkId);
    delete this.links[linkId];
}

protoModel.eraseManagedLink = function eraseManagedLink(linkId) {
    //console.log("managed erasing " + linkId);
    this.getLink(linkId).dm("eraseLink");
    this.links.preErase(linkId);
}

protoModel.flushErase = function flushErase() {
    this.links.flushErase();
}

protoModel.getIdManagerForLinks = function getIdManagerForLinks(idName = "linkId") {
    let manager = this.links = idManager.newManager(idName);
    this.eraseLink = this.eraseManagedLink;
    this.getLink = this.getManagedLink;
    manager.defaultSetIdName = function(id) {
        if (typeof this[idName] !== "undefined") {
            //console.log("setting linkId from " + this.linkId + " to " + id);
            this.dm(manager.setIdName, id);
        }
        this[idName] = id;
    }
}

// direct message, one side of the link directly calls a function on the other side of the link
protoModel.dm = function dm(typeName, functionName, linkId, ...data) {mainLink.postMessage(typeName + " dm " + functionName, linkId, ...data);}
// type direct message, one side of the link calls a function on the type of the other side of the link
protoModel.tdm = function tdm(typeName, functionName, ...data) {mainLink.postMessage(typeName + " tdm " + functionName, ...data);}

typeProto = guiWorkerLink.typeProto = {};

protoModel.newType = function newType(name, protoModel = typeProto) {
    if (name in this.types) throw Error(name + " is already a type");
    let returner = this.types[name] = Object.create(protoModel);
    returner.name = name;
    returner.mainLink = this;
    let myLinkProto = returner.linkProto = Object.create(linkProto);
    myLinkProto.typeName = name;
    myLinkProto.type = returner;
    returner.initializers = {host: emptyFunction, worker: emptyFunction};
    returner.receivingFunctions = {host: {}, worker: {}};
    returner.extensions = {};
    return returner;
}

let dmLog = emptyFunction;

typeProto.initialize = function initialize() {
    let me = this, name = me.name, mainLink = me.mainLink, side = mainLink.side, extensions = me.extensions, dms = {}, tdms = {};
    portProperties(getAllFunctions(me.linkProto), dms);
    this.initializers[side]();
    for (let extension in extensions) {
        extension = extensions[extension];
        extension.initializers[side]();
        portProperties(getAllFunctions(extension.linkProto), dms);
        portProperties(getAllFunctions(extension.type), tdms);
    }
    for (let func in dms) mainLink.workerFunctions[name + " dm " + func] = function(linkId, ...data) {dmLog(mainLink.side + " " + linkId + " dmed " + func + " " + data); mainLink.getLink(linkId)[func](...data)};
    for (let func in tdms) if (func !== "createLink") mainLink.workerFunctions[name + " tdm " + func] = function(...data) {dmLog(mainLink.side + " tdmed " + func + " " + data); mainLink.types[name][func](...data)};
    mainLink.workerFunctions[name + " tdm createLink"] = function(datum, extensionName) {
        if (typeof extensionName !== "undefined") return mainLink.types[name].extensions[extensionName].type.createLink(datum, extensionName);
        else return mainLink.types[name].createLink(datum);
    }
}

typeProto.dm = function dm(linkId, ...data) {dmLog(this.mainLink.side + " " + linkId + " dming " + data); this.mainLink.dm(this.name, linkId, ...data)}
typeProto.tdm = function tdm(...data) {dmLog(this.mainLink.side + " tdming " + data); this.mainLink.tdm(this.name, ...data)}

linkProto = guiWorkerLink.linkProto = {};

protoModel.newLink = function newLink(type, linkId) {
    //console.log(this.side + " creating link " + linkId);
    let returner = Object.create(type.linkProto);
    returner.type = type;
    if (typeof linkId === "undefined") {
        if (this.links.isIdManager) {
            returner.tdm("createLink", this.links.items.length, type.extensionName);
            this.links.addItem(returner);
        } else throw Error("trying to make a link without a link id");
    } else {
        if (this.links.isIdManager) throw Error("trying to specify a linkId when a manager is present");
        this.links[linkId] = returner;
        returner.linkId = linkId;
    }
    return returner;
}

linkProto.dm = function dm(functionName, ...data) {this.type.dm(functionName, this.linkId, ...data)};
linkProto.tdm = function tdm(functionName, ...data) {this.type.tdm(functionName, ...data)};

linkProto.eraseLink = function eraseLink() {
    //console.log(mainLink.side + " erasing " + this.linkId);
    this.type.mainLink.eraseLink(this.linkId);
}