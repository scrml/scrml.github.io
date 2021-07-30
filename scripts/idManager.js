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
    let keepIndexes = [];
    for (let i = this.items.length - 1; this.eraseThese.length > keepIndexes.length; --i) if (!this.eraseThese.includes(i)) keepIndexes.push(i);
    for (let i = 0; i < keepIndexes.length; ++i) {
        this.items[this.eraseThese[i]] = this.items[keepIndexes[i]];
        this.items[this.eraseThese[i]][this.setIdName](this.eraseThese[i]);
    }
    this.items.splice(this.items.length - keepindexes.length, keepIndexes.length);
    this.eraseThese = [];
}