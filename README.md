# Drawer Extension


## Description

This is a basic extension to the GNOME 3 desktop environment to move an application into a 'drawer.' These drawers can quickly reveal and hide an app while retaining focus on another window. This can be useful for holding documentation files, art references, or messaging applications. This is similar in concept to virtual desktops or a second monitor, but allows referencing these other resources without switching views or requiring extra hardware. For an example of what this experience is like, see the [https://apps.kde.org/yakuake/](Yakuake) project, which provides a similar (read, smoother) experience. The implementation of this extension is more a proof of concept than anything, so there are some quirks with how it interacts with other window management features. In particular, tiled windows and closing windows in drawers may not behave as expected.

## Setup

Installation of this extension works much as any GNOME shell extension. Download, extract, and move to the extensions directory.

### Dependencies

* gnome-tweaks
* GNOME 3 desktop environment. When I developed this, I was running version 3.2.2; I have since switched to KDE, so I have neither continued to use nor develop this extension for any other versions.

### Installation

* Download or clone all files
* copy contents into `~/.local/share/gnome-shell/extensions/drawer-extension@kxnr.me`
* restart GNOME

### Executing program

* activate the extension via gnome-tweaks


## Authors

* [Connor Keane](kxnr.me)

## License

This project is licensed under the GPL3 License - see the LICENSE.md file for details

## Acknowledgments

* The beginnings of this project came from [https://github.com/fmstrat/wintile](wintile)
* Code for managing key bindings is adapted from this [https://superuser.com/questions/471606/gnome-shell-extension-key-binding/1182899#1182899](post)
