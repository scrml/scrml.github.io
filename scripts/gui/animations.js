let gui = scrmljs.gui,
    emptyFunction = scrmljs.emptyFunction,
    optionFetcher = scrmljs.optionFetcher;
gui.moduleDependency("animations", ["textWidth"], function() {
    gui.defaultOptions.smoothErase = {
        duration: .5,
        onEnd: emptyFunction,
        doSmoothly: true
    }
    gui.defaultOptions.smoothInsert = {
        duration: .5,
        testingPlace: testDiv,
        onEnd: emptyFunction,
        doSmoothly: true
    }
    gui.defaultOptions.smoothMove = {
        duration: .5,
        onEnd: emptyFunction,
        doSmoothly: true
    }
});

gui.smoothErase = function smoothErase(element, options = {}) {
    let option = optionFetcher(gui.defaultOptions.smoothErase, options);
    if (!option("doSmoothly")) {
        gui.orphan(element);
        option("onEnd")();
        return;
    }
    if (options.width) options.width = Math.round(options.width);
    if (options.height) options.height = Math.round(options.height);
    let box = element.getBoundingClientRect(),
        height = options.height || Math.round(box.height),
        width = options.width || Math.round(box.width),
        parent = element.parentElement,
        name = "smoothErase" + width + "x" + height,
        duration = option("duration");
    let div = gui.element("div", null, ["id", name]);
    element.parentElement.replaceChild(div, element);
    div.appendChild(element);
    let style = gui.element("style", document.head);
    style.innerHTML = "@keyframes "+name+" {0% {height: "+height+"px; width: "+width+"px} 100% {height: 0px; width: 0px}} #"+name+" {animation-name: "+name+"; animation-duration: "+duration+"s; overflow: hidden}";
    window.setTimeout(function() {
        div.parentElement.removeChild(div);
        document.head.removeChild(style);
        option("onEnd")();
    }, duration*1000);
}

gui.smoothInsert = function smoothInsert(element, parent, insertBefore = null, options = {}) {
    let option = optionFetcher(gui.defaultOptions.smoothInsert, options);
    if (!option("doSmoothly")) {
        parent.insertBefore(element, insertBefore);
        option("onEnd")();
        return;
    }
    if (options.width) options.width = Math.round(options.width);
    if (options.height) options.height = Math.round(options.height);
    option("testingPlace").appendChild(element);
    let box = element.getBoundingClientRect(),
        height = options.height || Math.round(box.height),
        width = options.width || Math.round(box.width),
        name = "smoothInsert" + width + "x" + height,
        duration = option("duration");
    let div = gui.element("div", parent, ["id", name], insertBefore);
    div.appendChild(element);
    let style = gui.element("style", document.head);
    style.innerHTML = "@keyframes "+name+" {0% {height: 0px; width: 0px} 100% {height: "+height+"px; width: "+width+"px}} #"+name+" {animation-name: "+name+"; animation-duration: "+duration+"s; overflow: hidden}";
    window.setTimeout(function() {
        parent.replaceChild(element, div);
        document.head.removeChild(style);
        option("onEnd")();
    }, duration*1000);
}

gui.smoothElement = function smoothElement(type, loadHere, atts, insertBefore, options) {
    let returner = gui.element(type, null, atts);
    gui.smoothInsert(returner, loadHere, insertBefore, options);
    return returner;
}

gui.smoothMove = function smoothMove(element, newParent, insertBefore = null, options = {}) {
    let option = optionFetcher(gui.defaultOptions.smoothMove, options);
    if (insertBefore) if (newParent !== insertBefore.parentElement) throw Error("parent is not parent element of insertBefore");
    if (!option("doSmoothly")) {
        newParent.insertBefore(element, insertBefore);
        option("onEnd")();
        return;
    }
    let box = element.getBoundingClientRect(),
        height = Math.round(options.height || box.height),
        width = Math.round(options.width || box.width),
        x = box.x,
        y = box.y,
        realInsertBefore = gui.element("div", newParent, [], insertBefore),
        insertBeforeBox = realInsertBefore.getBoundingClientRect(),
        x2 = insertBeforeBox.x,
        y2 = insertBeforeBox.y,
        oldParent = element.parentElement,
        shrink = "smoothMoveShrink" + width + "x" + height,
        move = "smoothMoveMove" + width + "x" + height,
        grow = "smoothMoveGrow" + width + "x" + height,
        duration = option("duration");
    let style = gui.element("style", document.head);
    style.innerHTML = "@keyframes "+shrink+" {0% {width: "+width+"px; height: "+height+"px} 100% {width: 0px; height: 0px}}"
    + " @keyFrames "+grow+" {0% {width: 0px; height: 0px} 100% {width: "+width+"px; height: "+height+"px}}"
    + " @keyFrames "+move+" {0% {left: 0px; top: 0px} 100% {left: "+(x2-x)+"px; top: "+(y2-y-height)+"px}}"
    + " ."+shrink+" {animation-name: "+shrink+"; animation-duration: "+duration+"s; position: relative}"
    + " ."+grow+" {animation-name: "+grow+"; animation-duration: "+duration+"s}"
    + " ."+move+" {animation-name: "+move+"; animation-duration: "+duration+"s; position: relative; height: "+height+"px; width: "+width+"px}";
    let shrinkDiv = gui.element("div", oldParent, ["class", shrink], element),
        moveDiv = gui.element("div", shrinkDiv, ["class", move]),
        growDiv = gui.element("div", newParent, ["class", grow], realInsertBefore);
    moveDiv.appendChild(element);
    window.setTimeout(function() {
        newParent.insertBefore(element, realInsertBefore);
        gui.orphan(realInsertBefore);
        gui.orphan(style);
        gui.orphan(shrinkDiv);
        gui.orphan(growDiv);
        option("onEnd")();
    }, duration*1000);
}