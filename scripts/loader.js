let Loader = scrmljs.Loader = {}

Loader.log = scrmljs.emptyFunction;

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
    returner.listeners = [];
    returner.ephemeralListeners = [];
    returner.isComplete = true;
    returner.isHung = false;
    returner.isMidProcess = false;
    returner.cueExtraProcess = false;
    return returner;
}

Loader.tierProto = {}

Loader.protoModel.newTier = function newTier(tierName, processor = scrmljs.emptyFunction, protoModel = Loader.tierProto) {
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
    tier.isComplete = scrmljs.isEmpty(this.items);
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
    Loader.log("tier " + this.name + " complete");
    this.isComplete = true;
    for (let listener of this.listeners) listener();
    for (let listener of this.ephemeralListeners) listener();
    this.ephemeralListeners.splice(0);
    if (this.loader.isHung) {
        Loader.log("unhunging");
        this.loader.isHung = false;
        this.loader.process();
    }
}

Loader.itemProto = {}

Loader.protoModel.addItem = function addItem(name, dependsOn = {}, data = {}, protoModel = Loader.itemProto) {
    if (this.items[name]) return this.setDependencies(name, dependsOn);
    Loader.log("adding item " + name);
    let item = Object.create(protoModel);
    this.items[name] = item;
    item.loader = this;
    item.name = name;
    item.data = data;
    item.isComplete = {};
    item.dependsOn = dependsOn;
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
        if (tier.name in dependsOn) {
            for (let subName in dependsOn[tier.name]) {
                let sub = this.items[subName];
                sub.dependedOnBy[tier.name][name] = undefined;
                if (!sub.isComplete[tier.name]) item.isReady[tier.name] = false;
            }
        }
    }
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

let processCall = 0;

Loader.protoModel.process = function process() {
    /*if (processCall >= 30) {
        console.log("about to fail. loader is");
        console.log(this);
        console.log("printing any unfinisheds");
        for (let i in this.items) for (let t in this.tiersByName) if (!this.items[i].isComplete[t]) console.log(i + " " + t);
        throw Error("too many processes?");
    }*/
    if (this.isMidProcess) return;
    this.isMidProcess = true;
    Loader.log("process call " + ++processCall);
    let myCall = processCall;
    this.isComplete = false;
    if (this.onTier < 0) this.onTier = 0;
    else Loader.log("already processing tier "+this.onTier + " out of " + this.tiers.length + " on call " + myCall);
    while ((this.onTier < this.tiers.length) && this.tiers[this.onTier].isComplete) {
        Loader.log("call " + myCall + " tier " + this.onTier + " is complete");
        ++this.onTier;
    }
    // think process is complete because each tier is complete
    if (this.onTier === this.tiers.length) {
        Loader.log("checking that process call " + myCall + " is complete");
        let allComplete = true;
        for (let item in this.items) for (let tier in this.items[item].isComplete) allComplete = allComplete && this.items[item].isComplete[tier];
        if (!allComplete) {
            Loader.log("call " + myCall + " is not actually complete");
            if (this.isHung) this.process();
            else Loader.log("call " + myCall + " is not hung, something is wrong with tier completion statuses");
            this.isMidProcess = false;
            return;
        }
        Loader.log("process call " + myCall + " is complete");
        this.onTier = -1;
        this.isComplete = true;
        this.isMidProcess = false;
        this.cueExtraProcess = false;
        for (let listener of this.listeners) {
            Loader.log("executing " + listener);
            listener();
        }
        for (let listener of this.ephemeralListeners) {
            Loader.log("executing " + listener);
            listener();
        }
        this.ephemeralListeners.splice(0);
        if (this.cueExtraProcess) this.process();
        return;
    }
    let tier = this.tiers[this.onTier];
    for (let itemName in this.items) {
        let item = this.items[itemName];
        if (item.isReady[tier.name] && !item.isComplete[tier.name] && !item.isProcessing[tier.name]) {
            Loader.log(tier.name + " processing " + item.name);
            item.isProcessing[tier.name] = true;
            tier.processor(item);
            if (!item.isComplete[tier.name]) {
                this.isHung = true;
                Loader.log("became hung on call " + myCall);
                this.isMidProcess = false;
                return;
            }
        }
    }
    if (!this.isHung) {
        Loader.log("call " + myCall + " is not hung, reprocessing");
        this.isMidProcess = false;
        this.process();
    }
    Loader.log("call " + myCall + " terminating");
    this.isMidProcess = false;
}

Loader.protoModel.markComplete = function markComplete(item, tier) {
    Loader.log("marking " + item.name + " " + tier.name + " complete");
    if (!item.isReady[tier.name]) throw Error("cannot mark " + item.name + " as complete because it is not even ready");
    item.isComplete[tier.name] = true;
    item.isProcessing[tier.name] = false;
    for (let waiterName in item.dependedOnBy[tier.name]) {
        let waiter = this.items[waiterName];
        waiter.isReady[tier.name] = true;
        for (let sub in waiter.dependsOn[tier.name]) waiter.isReady[tier.name] = waiter.isReady[tier.name] && this.items[sub].isComplete[tier.name];
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
    this.process();
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
                Loader.log("unreadying " + itemName + " tier " + t);
                item.isComplete[t] = item.isProcessing[t] = item.isReady[t] = false;
            }
        }
    }
}

Loader.tiers = {}

{
    let tierName = "js", processor = function(item) {
        scrmljs.importScript(item.name, item.data.js, function() {
            item.loader.markComplete(item, item.loader.jsTier);
        });
    }
    let ensureJS = function ensureJS(name, dependencies = [], location = filePrefix+"scripts/"+name+".js") {
        if (name in this.items) return;
        let d = {};
        for (let x of dependencies) d[x] = undefined;
        this.addItem(name, {js: d}, {js: location});
    }
    Loader.tiers.js = function addJsAJAXTier(loader) {
        loader.jsTier = loader.newTier(tierName, processor);
        loader.ensureJS = ensureJS;
    }
}

{
    let tierName = "initialize", processor = function(item) {
        if (item.data.initialize) item.data.initialize();
        item.loader.markComplete(item, item.loader.initializeTier);
    }
    
    Loader.tiers.initialize = function initializationTier(loader) {
        loader.initializeTier = loader.newTier(tierName, processor);
    }
}