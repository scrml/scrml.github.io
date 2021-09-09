let scriptLoader = scrmljs.scriptLoader,
    capitalizeFirstLetter = scrmljs.capitalizeFirstLetter,
    emptyFunction = scrmljs.emptyFunction;

let idManager = scrmljs.idManager = {};

idManager.protoModel = {isIdManager: true};

idManager.newManager = function newManager(idName = "id", protoModel = idManager.protoModel) {
    let returner = Object.create(protoModel);
    returner.items = [];
    returner.idName = idName;
    returner.setIdName = "set"+capitalizeFirstLetter(idName);
    // this isn't on the prototype chain because it's a function meant to be called on items, not on idManager, and the items don't necessarily know about the idManager so can't access returner.idName
    returner.defaultSetId = function(id) {this[returner.idName] = id};
    returner.eraseThese = [];
    return returner;
}

idManager.protoModel.addItem = function addItem(item) {
    if (this.idName in item) throw Error("item already has property " + this.idName + ": " + item[this.idName]);
    if (!item[this.setIdName]) item[this.setIdName] = this.defaultSetId;
    item[this.setIdName](this.items.length);
    this.items.push(item);
}

idManager.protoModel.preErase = function preErase(id) {
    this.eraseThese.push(id);
    this.items[id] = undefined;
}

idManager.protoModel.flushErase = function flushErase() {
    if (this.eraseThese.length === 0) return;
    let replace, items = this.items, erase = this.eraseThese, pullIndex = items.length - 1, numErased = erase.length, setIdName = this.setIdName;
    erase.sort().reverse();
    while (erase.length > 0) {
        replace = erase.pop();
        while (erase.includes(pullIndex)) {
            --pullIndex;
        }
        if (replace >= pullIndex) {
            break;
        }
        items[replace] = items[pullIndex];
        items[replace][setIdName](replace, pullIndex);
        --pullIndex;
    }
    items.splice(items.length - numErased);
    erase.splice(0);
}

idManager.protoModel.flushErasePreserveOrder = function flushErasePreserveOrder() {
    if (this.eraseThese.length === 0) return;
    let eraseIndex = 0, itemIndex = 0, erases = this.eraseThese, items = this.items, length = items.length, setIdName = this.setIdName;
    erases.sort();
    while (itemIndex < length) {
        if (erases[eraseIndex] === itemIndex) {
            ++eraseIndex;
            ++itemIndex;
            continue;
        }
        if (eraseIndex !== 0) {
            items[itemIndex][setIdName](itemIndex - eraseIndex, itemIndex);
            items[itemIndex - eraseIndex] = items[itemIndex];
        }
        ++itemIndex;
    }
    items.splice(items.length - eraseIndex);
    erases.splice(0);
}