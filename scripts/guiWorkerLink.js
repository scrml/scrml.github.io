let guiWorkerLink = scrmljs.guiWorkerLink = {}, loader = scrmljs.scriptLoader, emptyFunction = scrmljs.emptyFunction;
let protoModel, typeProto, linkProto;

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
    returner.overloadManager = scrmljs.overloadManager.newOverloadManager();
    // returner.links should be an idManager for the side which controls the links, but it defaults to a holder object
    returner.links = {};
    return returner;
}

protoModel.getIdManagerForLinks = function getIdManagerForLinks(idName = "linkId") {
    this.links = idManager.newManager(idName);
    this.eraseLink = protoModel.eraseManagedLink;
}

protoModel.eraseLink = function eraseLink(linkId) {
    delete this.links[linkId];
}

protoModel.eraseManagedLink = function eraseManagedLink(linkId) {
    this.links.preErase(linkId);
}

protoModel.flushErase = function flushErase() {
    this.links.flushErase();
}

protoModel.dm = function dm(typeName, functionName, linkId, ...args) {
    this.overloadManager.addTicket(linkId, typeName + " " + functionName, ...args);
}

protoModel.openProcess = function openProcess() {
    this.overloadManager.openProcess();
}

protoModel.closeProcess = function closeProcess() {
    this.overloadManager.closeProcess();
}

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

typeProto.initialize = function initialize() {
    this.initializers[this.mainLink.side]();
    for (let extension in this.extensions) this.extensions[extension].initializers[this.mainLink.side]();
    let me = this, name = me.name, mainLink = me.mainLink, side = mainLink.side, dmPosters = me.receivingFunctions[side === "host"? "worker": "host"];
    for (let functionName in dmPosters) mainLink.overloadManager.addTicketFunction(name + " " + functionName, function(linkId, ...data) {
        mainLink.postMessage(name + " " + functionName, linkId, ...data);
    });
    for (let functionName in me.receivingFunctions[side]) {
        mainLink.workerFunctions[name + " " + functionName] = function(...args) {
            me.receivingFunctions[side][functionName](...args);
        }
    }
}

typeProto.dm = function dm(...args) {this.mainLink.dm(this.name, ...args)}

linkProto = guiWorkerLink.linkProto = {};

protoModel.newLink = function newLink(type, linkId) {
    let returner = Object.create(type.linkProto);
    returner.type = type;
    if (typeof linkId === "undefined") {
        if (this.links.isIdManager) this.links.addItem(returner);
        else throw Error("trying to make a link without a link id");
    } else {
        if (this.links.isIdManager) throw Error("trying to specify a linkId when a manager is present");
        this.links[linkId] = returner;
        returner.linkId = linkId;
    }
    return returner;
}

linkProto.dm = function dm(functionName, ...args) {
    this.type.dm(functionName, this.linkId, ...args);
}

linkProto.eraseLink = function eraseLink() {
    this.type.mainLink.eraseLink(this.linkId);
}