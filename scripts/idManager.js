scriptLoader.ensureJS("generalFunctions");

var idManager = {};

idManager.protoModel = {};

idManager.newManager = function newManager(idName = "id", protoModel = idManager.protoModel) {
    let returner = Object.create(protoModel);
    returner.items = [];
    returner.idName = idName;
    returner.setIdName = "set"+capitalizeFirstLetter(idName);
    returner.defaultSetIdName = function(id) {this[idName] = id};
    returner.numHoles = 0;
    return returner;
}

idManager.protoModel.addItem = function addItem(item) {
    if (this.idName in item) throw Error("item already has property " + this.idName);
    if (!item[this.setIdName]) item[this.setIdName] = this.defaultSetIdName;
    item[this.setIdName](this.items.length);
    this.items.push(item);
}

idManager.protoModel.eraseItem = function eraseItem(id) {
    this.items[id] = false;
    ++this.numHoles;
}

idManager.protoModel.collapse = function collapse() {
    if (this.numHoles === 0) return;
    let shift = 0;
    for (let i = 0; i < this.items.length; ++i) {
        if (this.items[i]) {
            if (shift === 0) continue;
            let item = this.items[i];
            item[this.idName] -= shift;
            this.items[item[this.idName]] = item;
            if (item.setId) item.setId(item[this.idName]);
        } else ++shift;
    }
    this.items.splice(this.items.length - this.numHoles);
    this.numHoles = 0;
}