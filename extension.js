const Meta = imports.gi.Meta
const Main = imports.ui.main
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;

let _close = 50;
var debug = false;

let rightOpen = false;
let leftOpen = false;
let rightWindow = null;
let leftWindow = null;
let center = null; //TODO: how to deal with this changing?

// TODO: event listeners for windows closing
// TODO: event listeners for window being removed from drawer by mouse 

// would be better to disable click and drag
// need to check if window exists

var _log = function () { }
if (debug)
    _log = log.bind(window.console);

window.gsconnect = {
    extdatadir: imports.misc.extensionUtils.getCurrentExtension().path,
    shell_version: parseInt(Config.PACKAGE_VERSION.split('.')[1], 10)
};
imports.searchPath.unshift(gsconnect.extdatadir);

const KeyBindings = imports.keybindings
let keyManager = null;
var oldbindings = {
    // TODO // create lists for existing bindings (shouldn't be any)
}

function isClose(a, b) {
    if (a <= b && a > b - _close)
        return true;
    else if (a >= b && a < b + _close)
        return true;
    else
        return false;
}

function placeWindow(loc, app) {
    _log("placeWindow: " + loc);
    let x, y, w, h = 0
    var space = app.get_work_area_current_monitor()
    let w = Math.floor(space.width / 3);
    let h = space.height;
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
            if (!app.maximizedVertically) {
                app.maximize(Meta.MaximizeFlags.VERTICAL);
            }
            if (app.maximized_horizontally)
                app.unmaximize(Meta.MaximizeFlags.HORIZONTAL);

            if (rightOpen && leftOpen) {
                x = space.x + w;
                y = space.y;
                app.move_resize_frame(true, x, y, w, h);
            }
            else if (rightOpen) {
                x = space.x;
                y = space.y;
                app.move_resize_frame(true, x, y, 2 * w, h);

            }
            else if (leftOpen) {
                x = space.x + w;
                y = space.y;
                app.move_resize_frame(true, x, y, 2 * w, h);
            }
            else {
                app.maximize(Meta.MaximizeFlags.VERICAL | Meta.MaximizeFlags.HORIZONTAL)
            }
        case "floating":
            if (app.maximized_horizontally || app.maximizedVertically)
                app.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
            break;
    }
    let window = app.get_frame_rect()
    _log("window.x: " + window.x + " window.y: " + window.y + " window.width: " + window.width + " window.height: " + window.height)
}

function fillDrawer(direction, app) {
    if (direction == "left") {
        if (leftOpen) {
            toggleDrawer("left");
        }
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
            if (leftDrawer != null) {
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
            if (rightDrawer != null) {
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
    _log("moveWindow: " + direction);
    var app = global.display.focus_window;
    var space = app.get_work_area_current_monitor();

    // TODO //
    // maximizing center window is non-trivial, need 
    // a better way to decide what/when to maximize


    // store center if neither drawer is open, focus is maximized, focus isn't drawer window
    // and opening drawer
    if (!(leftOpen || rightOpen) && app.maximizedVertically) {
        if ((app != leftWindow) && (app != rightWindow)) {
            center = app;
        }
    }

    // check if center and sides are still open, else reset those states

    // main logic for drawers
    switch (action) {
        case "fillLeft":
            fillDrawer("left", app);
            break;
        case "fillRight":
            fillDrawer("right", app);
            break;
        case "toggleLeft":
            toggleDrawer("left");
            if (center != null) {
                placeWindow("center", center);
            }
            center = null;
            break;
        case "toggleRight":
            toggleDrawer("right");
            if (center != null) {
                placeWindow("center", center);
            }
            center = null;
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
    Mainloop.timeout_add(10, function () {
        moveWindow(action);
    });
}

function changeBinding(settings, key, oldBinding, newBinding) {
    var binding = oldbindings[key.replace(/-/g, '_')];
    var _newbindings = [];
    for (var i = 0; i < binding.length; i++) {
        let currentbinding = binding[i];
        if (currentbinding == oldBinding)
            currentbinding = newBinding;
        _newbindings.push(currentbinding)
    }
    settings.set_strv(key, _newbindings);
}

function resetBinding(settings, key) {
    var binding = oldbindings[key.replace(/-/g, '_')];
    settings.set_strv(key, binding);
}

var enable = function () {
    if (!keyManager) {
        keyManager = new KeyBindings.Manager();
        let desktopSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.keybindings' });
        let mutterSettings = new Gio.Settings({ schema_id: 'org.gnome.mutter.keybindings' });

        Mainloop.timeout_add(3000, function () {
            keyManager.add("<Ctrl><Alt>left", function () { requestMove("toggleLeft"); })
            keyManager.add("<Ctrl><Alt>right", function () { requestMove("toggleRight"); })
            keyManager.add("<Shift><Ctrl><Alt>left", function () { leftWindow ? requestMove("emptyLeft") : requestMove("fillLeft"); })
            keyManager.add("<Shift><Ctrl><Alt>right", function () { rightWindow ? requestMove("emptyRight") : requestMove("fillRight"); })
        });
    }
}

var disable = function () {
    if (keyManager) {
        keyManager.removeAll();
        keyManager.destroy();
        keyManager = null;
    }
}
