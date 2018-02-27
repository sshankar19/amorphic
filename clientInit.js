const __controllerTemplate = 'Controller';
const __appVersion = __ver || 0;

var controller = typeof(controller) === 'undefined' ? null : controller;
var firstTimeLoad = typeof(firstTimeLoad) === 'undefined';

// Establish a new session whether first time or because of expiry / server restart
function __bindController (newController, sessionExpiration) {
    if (controller && typeof(controller.shutdown) === 'function') {
        controller.shutdown();
    }
    controller = newController;
    if (firstTimeLoad) {
        firstTimeLoad = false;
        if (typeof(controller.clientInit) === 'function') {
            controller.clientInit(sessionExpiration);
        }
    }
    else {
        if (typeof(controller.clientInit) === 'function') {
            controller.clientInit(sessionExpiration);
        }
        controller.refresh(1);
    }
}

// Rerender after xhr request received
function __refresh (hadChanges) {
    controller.refresh(1, hadChanges);
}

// When a new version is detected pop up "about to be refreshed" and
// then reload the document after 5 seconds.
function __reload () {
    controller.amorphicStatus = 'reloading';
    controller.refresh(1);
    setTimeout(function reload () {
        document.location.reload(true);
    }, 3000);
}

// If communication lost pop up dialog
function __offline () {
    controller.amorphicStatus = 'offline';
}

// Create amorphic client session
amorphic.establishClientSession(__controllerTemplate, __appVersion, __bindController, __refresh, __reload, __offline);