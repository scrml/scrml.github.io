//var loaderLog = emptyFunction;
var loaderLog = console.log;

var Loader = {}

Loader.protoModel = {}

Loader.newLoader = function newLoader(protoModel = Loader.protoModel) {
    let returner = Object.create(protoModel);
    returner.tiers = [];
    /*
        index for which tier is currently processing
        negative means not processing
        -1 means process on adding an item, not -1 means don't process after adding item
    */
    returner.onTier = -1;
    returner.tiersByName = {};
    returner.items = {};
    returner.listOfItemsToAdd = {};
    returner.listeners = [];
    returner.ephemeralListeners = [];
    returner.isComplete = true;
    returner.isHung = false;
    return returner;
}

Loader.tierProto = {}

Loader.protoModel.newTier = function newTier(tierName, processor = emptyFunction, protoModel = Loader.tierProto) {
    if (tierName in this.tiers) return;
    let tier = Object.create(protoModel);
    tier.tierNumber = this.tiers.length;
    this.tiers.push(tier);
    this.tiersByName[tierName] = tier;
    tier.loader = this;
    tier.name = tierName;
    tier.processor = processor;
    tier.listeners = [];
    tier.ephemeralListeners = [];
    for (let itemName in this.items) {
        let item = this.items[itemName];
        item.isComplete[tierName] = false;
        if (!item.dependsOn[tierName]) item.dependsOn[tierName] = {};
        item.isReady[tierName] = true;
        item.isProcessing[tierName] = false;
        if (!item.dependedOnBy[tierName]) item.dependedOnBy[tierName] = {};
        item.listeners[tierName] = [];
        item.ephemeralListeners[tierName] = [];
    }
    tier.isComplete = isEmpty(this.items);
    return tier;
}

Loader.tierProto.addListener = function addListener(listener) {
    this.listeners.push(listener);
    if (this.isComplete) listener();
}

Loader.tierProto.addEphemeralListener = function addEphemeralListener(listener) {
    if (this.isComplete) listener();
    else this.ephemeralListeners.push(listener);
}

Loader.tierProto.markComplete = function markComplete() {
    loaderLog("tier " + this.name + " complete");
    this.isComplete = true;
    for (let listener of this.listeners) listener();
    for (let listener of this.ephemeralListeners) listener();
    this.ephemeralListeners.splice(0);
    if (this.loader.isHung) {
        loaderLog("unhunging");
        this.loader.isHung = false;
        this.loader.process();
    }
}

Loader.itemProto = {}

Loader.protoModel.addItem = function addItem(name, dependsOn = {}, data = {}, protoModel = Loader.itemProto) {
    loaderLog("preadding " + name);
    this.listOfItemsToAdd[name] = {
        name: name,
        dependsOn: dependsOn,
        data: data,
        protoModel: protoModel
    }
    if (this.onTier === -1) this.flushItemsList();
    else loaderLog("on tier " + this.tiers[this.onTier].name);
}

Loader.protoModel.flushItemsList = function flushItemsList() {
    loaderLog("flushing");
    for (let name in this.listOfItemsToAdd) {
        let info = this.listOfItemsToAdd[name];
        if (this.items[name]) continue;
        loaderLog("adding item " + info.name);
        let item = Object.create(info.protoModel);
        this.items[name] = item;
        item.loader = this;
        item.name = name;
        item.data = info.data;
        item.isComplete = {};
        item.dependsOn = info.dependsOn;
        item.isReady = {};
        item.isProcessing = {};
        item.dependedOnBy = {};
        item.listeners = {};
        item.ephemeralListeners = {};
        for (let tier of this.tiers) {
            tier.isComplete = false;
            item.isComplete[tier.name] = false;
            item.isProcessing[tier.name] = false;
            item.isReady[tier.name] = true;
            item.dependedOnBy[tier.name] = {};
            item.listeners[tier.name] = [];
            item.ephemeralListeners[tier.name] = [];
            if (tier.name in info.dependsOn) {
                for (let subName in info.dependsOn[tier.name]) {
                    let sub = this.items[subName];
                    sub.dependedOnBy[tier.name][info.name] = undefined;
                    if (!sub.isComplete[tier.name]) item.isReady[tier.name] = false;
                }
            }
        }
    }
    this.listOfItemsToAdd = {};
    this.onTier = -1;
    this.process();
}

Loader.itemProto.addListener = function addListener(tierName, listener) {
    this.listeners[tierName].push(listener);
    if (this.isComplete[tierName]) listener(this);
}

Loader.itemProto.addEphemeralListener = function addEphemeralListener(tierName, listener) {
    if (this.isComplete[tierName]) listener(this);
    else this.ephemeralListeners[tierName].push(listener);
}

Loader.protoModel.markProcessComplete = function markProcessComplete(myCall) {
    loaderLog("checking process call " + myCall + " is complete");
    if (this.listOfItemsToAdd.length > 0) return this.flushItemsList();
    let allComplete = true;
    for (let item in this.items) for (let tier in this.items[item].isComplete) allComplete = allComplete && this.items[item].isComplete[tier];
    if (!allComplete) {
        loaderLog("call " + myCall + " not actually complete");
        if (this.isHung) this.process();
        else loaderLog("call " + myCall + " not hung");
        return;
    }
    loaderLog("call " + myCall + " marking process complete");
    this.onTier = -1;
    this.isComplete = true;
    for (let listener of this.listeners) {
        loaderLog("executing " + listener);
        listener();
    }
    for (let listener of this.ephemeralListeners) {
        loaderLog("executing " + listener);
        listener();
    }
    this.ephemeralListeners.splice(0);
    loaderLog("process call " + myCall + " is now done");
}

let processCall = 0;

Loader.protoModel.process = function process() {
    loaderLog("process call " + ++processCall);
    let myCall = processCall;
    if (!isEmpty(this.listOfItemsToAdd)) {
        loaderLog("call " + myCall + " ending with item flush");
        return this.flushItemsList();
    }
    //console.trace();
    this.isComplete = false;
    if (this.onTier < 0) this.onTier = 0;
    else loaderLog("already processing tier "+this.onTier + " out of " + this.tiers.length + " on call " + myCall);
    while ((this.onTier < this.tiers.length) && this.tiers[this.onTier].isComplete) {loaderLog("call " + myCall + " tier " + this.onTier + " is complete");++this.onTier;}
    if (this.onTier === this.tiers.length) {
        loaderLog("call " + myCall + " ending with mark process complete");
        return this.markProcessComplete(myCall);
    }
    let tier = this.tiers[this.onTier];
    for (let itemName in this.items) {
        let item = this.items[itemName];
        if (item.isReady[tier.name] && !item.isComplete[tier.name] && !item.isProcessing[tier.name]) {
            tier.processor(item);
            if (!item.isComplete[tier.name]) {
                this.isHung = true;
                loaderLog("became hung on call " + myCall);
            }
        }
    }
    if (!this.isHung) {
        loaderLog("call " + myCall + " is not hung, reprocessing");
        this.process();
    }
    loaderLog("call " + myCall + " terminating");
}

Loader.protoModel.markComplete = function markComplete(item, tier) {
    loaderLog("marking " + item.name + " " + tier.name + " complete");
    if (!item.isReady[tier.name]) throw Error("cannot mark " + item.name + " as complete because it is not even ready");
    item.isComplete[tier.name] = true;
    item.isProcessing[tier.name] = false;
    for (let waiterName in item.dependedOnBy[tier.name]) {
        let waiter = this.items[waiterName];
        waiter.isReady[tier.name] = true;
        for (let sub in waiter.dependsOn[tier.name]) if (!this.items[sub].isComplete[tier.name]) waiter.isReady[tier.name] = false;
        if (waiter.isReady[tier.name]) this.process();
    }
    let tierComplete = true;
    for (let name in this.items) if (!this.items[name].isComplete[tier.name]) {
        tierComplete = false;
        break;
    }
    if (tierComplete) tier.markComplete();
    for (let listener of item.listeners[tier.name]) listener(item);
    for (let listener of item.ephemeralListeners[tier.name]) listener(item);
    item.ephemeralListeners[tier.name].splice(0);
    let allComplete = true;
    for (let aTier of this.tiers) allComplete = allComplete && aTier.isComplete;
    if (allComplete) this.markProcessComplete("from marking item "+item.name);
    else if (this.onTier < 0) this.process();
}

Loader.protoModel.addListener = Loader.tierProto.addListener;

Loader.protoModel.addEphemeralListener = function addEphemeralListener(listener) {
    if (this.isComplete) listener();
    else this.ephemeralListeners.push(listener);
}

Loader.protoModel.setDependencies = function setDependencies(itemName, dependencies) {
    for (let tierName in dependencies) {
        if (this.tiersByName[tierName].tierNumber <= this.onTier) throw Error("cannot alter tier " + tierName + " while processing tier " + this.tiers[this.onTier].name);
    }
    let item = this.items[itemName];
    for (let t in dependencies) {
        if (!item.dependsOn[t]) item.dependsOn[t] = {};
        for (let td in dependencies[t]) {
            let other = this.items[td];
            item.dependsOn[t][td] = undefined;
            if (!other.dependedOnBy[t]) other.dependedOnBy[t] = {};
            other.dependedOnBy[t][itemName] = undefined;
            if (!other.isComplete[t]) {
                loaderLog("unreadying " + itemName + " tier " + t);
                item.isComplete[t] = item.isProcessing[t] = item.isReady[t] = false;
            }
        }
    }
}

Loader.tiers = {}

{
    let tierName = "js", processor = function(item) {
        loaderLog("js processing " + item.name);
        if (item.isComplete.js || item.isProcessing.js || !item.isReady.js) throw Error("cannot process item " + item.name);
        item.isProcessing.js = true;
        let script = document.createElement("script");
        script.setAttribute("defer", "");
        script.setAttribute("async", "");
        script.setAttribute("src", item.data.js);
        document.head.appendChild(script);
        script.addEventListener("load", function() {item.loader.markComplete(item, item.loader.jsTier)});
    }
    Loader.tiers.js = function addJSTier(loader) {
        loader.jsTier = loader.newTier(tierName, processor);
    }
}