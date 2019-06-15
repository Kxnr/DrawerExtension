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
// need to check if window exist

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
        toggleDrawer("left");
    }
    else if (direction == "right") {
        if (rightOpen) {
            toggleDrawer("right");
        }
        rightWindow = app;
        toggleDrawer("right");
    }
}

function toggleDrawer(direction) {
    if (direction == "left") {

        if (leftOpen) {
            leftWindow.minimize();
        }
        else {
            if (leftDrawer != null) {
                placeWindow("left", leftWindow);
            }
        }

    }
    else if (direction == "right") {
        if (rightOpen) {
            rightWindow.minimize();
        }
        else {
            if (rightDrawer != null) {
                placeWindow("right", rightWindow);
            }
        }
    }
    if (center != null) {
        placeWindow("center", center);
        center = null;
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
    var maximized = (app.maximizedVertically && app.maximized_horizontally);

    // store center if neither drawer is open, focus is maximized, focus isn't drawer window
    // and opening drawer

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
            break;
        case "toggleRight":
            toggleDrawer("right");
            break;
        case "emptyLeft":
            emptyDrawer("left");
            break;
        case "emptyRight":
            emptyDrawer("right");
            break;
    }
}

function requestMove(direction) {
    Mainloop.timeout_add(10, function () {
        moveWindow(direction);
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

        // TODO // set drawer keybindings
        changeBinding(desktopSettings, 'unmaximize', '<Super>Down', '<Control><Shift><Super>Down');
        changeBinding(desktopSettings, 'maximize', '<Super>Up', '<Control><Shift><Super>Up');
        changeBinding(mutterSettings, 'toggle-tiled-left', '<Super>Left', '<Control><Shift><Super>Left');
        changeBinding(mutterSettings, 'toggle-tiled-right', '<Super>Right', '<Control><Shift><Super>Right');
        Mainloop.timeout_add(3000, function () {
            // TODO // key handling logic
            keyManager.add("<Super>left", function () { requestMove("left") })
            keyManager.add("<Super>right", function () { requestMove("right") })
            keyManager.add("<Super>up", function () { requestMove("up") })
            keyManager.add("<Super>down", function () { requestMove("down") })
        });
    }
}

var disable = function () {
    if (keyManager) {
        keyManager.removeAll();
        keyManager.destroy();
        keyManager = null;
        let desktopSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.keybindings' });
        let mutterSettings = new Gio.Settings({ schema_id: 'org.gnome.mutter.keybindings' });
        resetBinding(desktopSettings, 'unmaximize');
        resetBinding(desktopSettings, 'maximize');
        resetBinding(mutterSettings, 'toggle-tiled-left');
        resetBinding(mutterSettings, 'toggle-tiled-right');
    }
}
