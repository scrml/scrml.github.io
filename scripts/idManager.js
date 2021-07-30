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
    this.eraseThese.sort().reverse();
    let replace, pullIndex = this.items.length - 1, numErased = this.eraseThese.length;
    while (this.eraseThese.length > 0) {
        replace = this.eraseThese.pop();
        if (replace >= pullIndex) break;
        while (this.eraseThese.includes(pullIndex)) --pullIndex;
        this.items[replace] = this.items[pullIndex];
        this.items[replace][this.setIdName](replace);
        --pullIndex;
    }
    this.items.splice(this.items.length - numErased);
    this.eraseThese.splice(0);
}