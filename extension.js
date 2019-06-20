const Meta = imports.gi.Meta
const Main = imports.ui.main
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;

var debug = true;

let rightOpen = false;
let leftOpen = false;
let rightWindow = null;
let leftWindow = null;
let center = null; //TODO: how to deal with this changing?

// TODO: event listeners for windows closing
// TODO: event listeners for window being removed from drawer by mouse 
// TODO: store windows by worksapce, make this work with multiple desktops

const Lang = imports.lang
const Shell = imports.gi.Shell

var KeyManager = new Lang.Class({
    Name: 'MyKeyManager',

    _init: function () {
        this.grabbers = new Map()

        global.display.connect(
            'accelerator-activated',
            Lang.bind(this, function (display, action, deviceId, timestamp) {
                log('Accelerator Activated: [display={}, action={}, deviceId={}, timestamp={}]',
                    display, action, deviceId, timestamp)
                this._onAccelerator(action)
            }))
    },

    listenFor: function (accelerator, callback) {
        log('Trying to listen for hot key [accelerator={}]', accelerator)
        let action = global.display.grab_accelerator(accelerator)

        if (action == Meta.KeyBindingAction.NONE) {
            log('Unable to grab accelerator [binding={}]', accelerator)
        } else {
            log('Grabbed accelerator [action={}]', action)
            let name = Meta.external_binding_name_for_action(action)
            log('Received binding name for action [name={}, action={}]',
                name, action)

            log('Requesting WM to allow binding [name={}]', name)
            Main.wm.allowKeybinding(name, Shell.ActionMode.ALL)

            this.grabbers.set(action, {
                name: name,
                accelerator: accelerator,
                callback: callback,
                action: action
            })
        }

    },

    _onAccelerator: function (action) {
        let grabber = this.grabbers.get(action)

        if (grabber) {
            this.grabbers.get(action).callback()
        } else {
            log('No listeners [action={}]', action)
        }
    }
})

var _log = function () { }
if (debug)
    _log = log.bind(window.console);

const Config = imports.misc.config;
window.gsconnect = {
    extdatadir: imports.misc.extensionUtils.getCurrentExtension().path,
    shell_version: parseInt(Config.PACKAGE_VERSION.split('.')[1], 10)
};
imports.searchPath.unshift(gsconnect.extdatadir);

let keyManager = null;

function checkOpen(window) {
    if (window == null) {
        return false;
    }
    let windows = global.screen.get_active_workspace().list_windows();
    for (let it of windows) {
        if (it == window) {
            return true;
        }
    }
    return false;
}
function placeWindow(loc, app) {
    _log("placeWindow: " + loc);
    let x, y, w, h = 0
    var space = app.get_work_area_current_monitor()
    w = Math.floor(2 * space.width / 5);
    h = space.height;
    switch (loc) {
        case "left":
            x = space.x;
            y = space.y;

            if (!app.maximizedVertically)
                app.maximize(Meta.MaximizeFlags.VERTICAL)

            if (app.maximized_horizontally)
                app.unmaximize(Meta.MaximizeFlags.HORIZONTAL);

            app.move_resize_frame(true, x, y, w, h)
            break;
        case "right":
            x = Math.floor(space.width - w + space.x);
            y = space.y;
            if (!app.maximizedVertically)
                app.maximize(Meta.MaximizeFlags.VERTICAL)
            if (app.maximized_horizontally)
                app.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
            app.move_resize_frame(true, x, y, w, h)
            break;
        case "center":
            if (rightOpen) {
                if (!app.maximizedVertically) {
                    app.maximize(Meta.MaximizeFlags.VERTICAL);
                }
                if (app.maximized_horizontally)
                    app.unmaximize(Meta.MaximizeFlags.HORIZONTAL);

                x = space.x;
                y = space.y;
                app.move_resize_frame(true, x, y, Math.floor((3 / 2) * w), h);

            }
            else if (leftOpen) {
                if (!app.maximizedVertically) {
                    app.maximize(Meta.MaximizeFlags.VERTICAL);
                }
                if (app.maximized_horizontally)
                    app.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
                x = space.x + w;
                y = space.y;
                app.move_resize_frame(true, x, y, Math.floor((3 / 2) * w), h);
            }
            else {
                if (app.maximizedVertically) {
                    app.maximize(Meta.MaximizeFlags.VERICAL | Meta.MaximizeFlags.HORIZONTAL)
                    center = null;
                }
            }
            break;
        case "floating":
            if (app.maximized_horizontally || app.maximizedVertically)
                app.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
            break;
    }
    let window = app.get_frame_rect()
    _log(loc + " window.x: " + window.x + " window.y: " + window.y + " window.width: " + window.width + " window.height: " + window.height)
}

function fillDrawer(direction, app) {
    if (direction == "left") {
        leftWindow = app;
        leftOpen = true;
        toggleDrawer("left");
    }
    else if (direction == "right") {
        if (rightOpen) {
            toggleDrawer("right");
        }
        rightWindow = app;
        rightOpen = true;
        toggleDrawer("right");
    }
}

function toggleDrawer(direction) {
    if (direction == "left") {
        if (leftOpen) {
            leftWindow.minimize();
            leftOpen = false;
        }
        else {
            if (rightOpen) {
                toggleDrawer("right")
            }
            if (leftWindow != null) {
                if (leftWindow.minimized) {
                    leftWindow.unminimize();
                }
                placeWindow("left", leftWindow);
                leftOpen = true;
            }
        }

    }
    else if (direction == "right") {

        if (rightOpen) {
            rightWindow.minimize();
            rightOpen = false;
        }
        else {
            if (leftOpen) {
                toggleDrawer("left")
            }
            if (rightWindow != null) {
                if (rightWindow.minimized) {
                    rightWindow.unminimize();
                }
                placeWindow("right", rightWindow);
                rightOpen = true;
            }
        }
    }
}

function emptyDrawer(direction) {
    if (direction == "left") {
        if (leftWindow != null) {
            placeWindow("floating", leftWindow)
        }
        leftOpen = false;
        leftWindow = null;
    }
    else if (direction == "right") {
        if (rightWindow != null) {
            placeWindow("floating", rightWindow)
        }
        rightOpen = false;
        rightWindow = null;
    }
}

function moveWindow(action) {
    // TODO // needs to save center
    _log("moveWindow: " + action);
    var app = global.display.focus_window;

    // TODO //
    // maximizing center window is non-trivial, need 
    // a better way to decide what/when to maximize


    // store center if neither drawer is open, focus is maximized, focus isn't drawer window
    // and opening drawer
    if (app != null) {
        if (!(leftOpen || rightOpen) && app.maximizedVertically) {
            if ((app != leftWindow) && (app != rightWindow)) {
                if (!action.includes("fill"))
                    center = app;
            }
        }
    }

    // check if center and sides are still open, else reset those states
    if (!checkOpen(center)) {
        center = null;
    }
    if (!checkOpen(leftWindow)) {
        leftOpen = false;
        leftWindow = null;
    }
    if (!checkOpen(rightWindow)) {
        rightOpen = false;
        rightWindow = null;
    }

    // main logic for drawers
    switch (action) {
        case "fillLeft":
            if (app != null)
                fillDrawer("left", app);
            break;
        case "fillRight":
            if (app != null)
                fillDrawer("right", app);
            break;
        case "toggleLeft":
            toggleDrawer("left");
            if (center != null) {
                placeWindow("center", center);
            }
            break;
        case "toggleRight":
            toggleDrawer("right");
            if (center != null) {
                placeWindow("center", center);
            }
            break;
        case "emptyLeft":
            emptyDrawer("left");
            break;
        case "emptyRight":
            emptyDrawer("right");
            break;
    }
}

function requestMove(action) {
    _log("DRAWERS: attempting action");
    _log(action);
    Mainloop.timeout_add(10, function () {
        moveWindow(action);
    });
}

var enable = function () {
    if (!keyManager) {
        keyManager = new KeyManager();
        _log("DRAWERS: creating binds");
        Mainloop.timeout_add(3000, function () {
            keyManager.listenFor("<ctrl><super>left", function () { requestMove("toggleLeft"); })
            keyManager.listenFor("<ctrl><super>right", function () { requestMove("toggleRight"); })
            keyManager.listenFor("<super><ctrl><alt>left", function () { leftWindow ? requestMove("emptyLeft") : requestMove("fillLeft"); })
            keyManager.listenFor("<super><ctrl><alt>right", function () { rightWindow ? requestMove("emptyRight") : requestMove("fillRight"); })
        });
    }
}

var disable = function () {
    _log("DRAWERS: destroying binds");
    if (keyManager) {
        for (let it of keyManager.grabbers) {
            global.display.ungrab_accelerator(it[1].action)
            Main.wm.allowKeybinding(it[1].name, Shell.ActionMode.NONE)
        }
    }
}
