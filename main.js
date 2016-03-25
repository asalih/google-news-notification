/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function (intentData) {
    chrome.app.window.create('index.html', {
        id: "mainwin",
        innerBounds: {
            width: 254,//663
            height: 412
        },
        frame: { type: "none" },
        resizable: false
    });
});
