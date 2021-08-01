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
    returner.defaultSetIdName = function(id) {this[returner.idName] = id};
    returner.eraseThese = [];
    return returner;
}

idManager.protoModel.addItem = function addItem(item) {
    if (this.idName in item) throw Error("item already has property " + this.idName + ": " + item[this.idName]);
    if (!item[this.setIdName]) item[this.setIdName] = this.defaultSetIdName;
    item[this.setIdName](this.items.length);
    this.items.push(item);
}

idManager.protoModel.preErase = function preErase(id) {
    this.eraseThese.push(id);
}

idManager.protoModel.flushErase = function flushErase() {
    if (this.eraseThese.length === 0) return;
    let replace, items = this.items, erase = this.eraseThese, pullIndex = items.length - 1, numErased = erase.length, setIdName = this.setIdName;
    erase.sort().reverse();
    while (erase.length > 0) {
        replace = erase.pop();
        if (replace >= pullIndex) break;
        while (erase.includes(pullIndex)) --pullIndex;
        items[replace] = items[pullIndex];
        items[replace][setIdName](replace);
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
            items[itemIndex][setIdName](itemIndex - eraseIndex);
            items[itemIndex - eraseIndex] = items[itemIndex];
        }
        ++itemIndex;
    }
    items.splice(items.length - eraseIndex);
    erases.splice(0);
}