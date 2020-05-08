{
    let me = Scripts.PageSetup;
    var PageSetup = me.object;

    me.waitFor({gui: undefined, drawBanner: undefined}, function() {
        let banner = drawBanner.newBanner();
        document.body.insertBefore(banner.canvas, document.body.firstChild);
        banner.canvas.setAttribute("text", "SCRML");
    });
}