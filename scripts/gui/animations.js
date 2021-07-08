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
    gui.defaultOptions.smoothSwap = {
        duration: .5,
        onEnd: emptyFunction,
        doSmoothly: true
    }
});

gui.smoothErase = function smoothErase(element, options = {}) {
    let option = optionFetcher(gui.defaultOptions.smoothErase, options);
    if (!option("doSmoothly")) {
        element.parentElement.removeChild(element);
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
        option(defaultOptions, "onEnd")();
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

gui.smoothSwap = function smoothSwap(element, placeBefore, options = {}) {
    let option = optionFetcher(gui.defaultOptions.smoothSwap);
    if (!option("doSmoothly")) {
        placeBefore.parentElement.insertBefore(element, placeBefore);
        option("onEnd")();
        return;
    }
    if (options.width) options.width = Math.round(options.width);
    if (options.height) options.height = Math.round(options.height);
    let box = element.getBoundingClientRect(),
        height = options.height || Math.round(box.height),
        width = options.width || Math.round(box.width),
        x = box.x,
        y = box.y,
        placeBeforeBox = placeBefore.getBoundingClientRect(),
        x2 = placeBeforeBox.x,
        y2 = placeBeforeBox.y,
        oldParent = element.parentElement,
        newParent = placeBefore.parentElement,
        shrink = "smoothSwapShrink" + width + "x" + height,
        move = "smoothSwapMove" + width + "x" + height,
        grow = "smoothSwapGrow" + width + "x" + height,
        duration = option("duration");
    let style = gui.element("style", document.head);
    style.innerHTML = "@keyframes "+shrink+" {0% {width: "+width+"px; height: "+height+"px} 100% {width: 0px; height: 0px}}"
    + " @keyFrames "+grow+" {0% {width: 0px; height: 0px} 100% {width: "+width+"px; height: "+height+"px}}"
    + " @keyFrames "+move+" {0% {left: 0px; top: 0px} 100% {left: "+(x2-x)+"px; top: "+(y2-y-height)+"px}}"
    + " #"+shrink+" {animation-name: "+shrink+"; animation-duration: "+duration+"s; position: relative}"
    + " #"+grow+" {animation-name: "+grow+"; animation-duration: "+duration+"s}"
    + " #"+move+" {animation-name: "+move+"; animation-duration: "+duration+"s; position: relative; height: "+height+"px; width: "+width+"px}";
    let shrinkDiv = gui.element("div", oldParent, ["id", shrink], element),
        moveDiv = gui.element("div", shrinkDiv, ["id", move]),
        growDiv = gui.element("div", newParent, ["id", grow], placeBefore);
    moveDiv.appendChild(element);
    window.setTimeout(function() {
        newParent.insertBefore(element, placeBefore);
        document.head.removeChild(style);
        oldParent.removeChild(shrinkDiv);
        newParent.removeChild(growDiv);
        option("onEnd")();
    }, duration*1000);
}