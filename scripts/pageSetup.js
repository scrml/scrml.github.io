scrmljs.scriptLoader.items.drawBanner.addListener("js", function() {
    let banner = scrmljs.drawBanner.newBanner();
    document.body.insertBefore(banner.canvas, document.body.firstChild);
    banner.canvas.setAttribute("text", "SCRML");
})