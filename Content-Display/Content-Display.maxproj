{
    "name": "Content-Display",
    "version": 1,
    "creationdate": 3851115631,
    "modificationdate": 3869777657,
    "viewrect": [ 980.0, 673.0, 300.0, 474.0 ],
    "autoorganize": 1,
    "hideprojectwindow": 0,
    "showdependencies": 1,
    "autolocalize": 0,
    "contents": {
        "patchers": {
            "filePathSender.maxpat": {
                "kind": "patcher",
                "local": 1
            },
            "changeMessage.maxpat": {
                "kind": "patcher",
                "local": 1
            },
            "Content-Display-main.maxpat": {
                "kind": "patcher",
                "local": 1,
                "toplevel": 1
            },
            "sendToAppDirectory.maxpat": {
                "kind": "patcher",
                "local": 1
            }
        },
        "code": {
            "FF_Utilities.js": {
                "kind": "javascript",
                "local": 1
            },
            "implicit.context.js": {
                "kind": "javascript",
                "local": 1
            },
            "jitpolymovie.js": {
                "kind": "javascript",
                "local": 1
            },
            "server.js": {
                "kind": "javascript",
                "local": 1
            }
        },
        "data": {
            "filepath.txt": {
                "kind": "textfile",
                "local": 1
            },
            "state.json": {
                "kind": "json",
                "local": 1
            },
            "package.json": {
                "kind": "json",
                "local": 1
            }
        },
        "externals": {
            "jit.ndi.send~.mxo": {
                "kind": "object",
                "local": 1
            },
            "jit.rtmp.send~.mxo": {
                "kind": "object",
                "local": 1
            },
            "jit.rtmp.server.mxo": {
                "kind": "object",
                "local": 1
            },
            "shell.mxo": {
                "kind": "object",
                "local": 1
            },
            "jit.gl.syphonserver.mxo": {
                "kind": "object",
                "local": 1
            }
        },
        "other": {
            ".gitignore": {
                "kind": "file",
                "local": 1,
                "singleton": {
                    "bootpath": "~/Documents/Programming/Content-Display/Content-Display/server",
                    "projectrelativepath": "./server"
                }
            },
            "index.html": {
                "kind": "webpage",
                "local": 1
            },
            "README.md": {
                "kind": "file",
                "local": 1,
                "singleton": {
                    "bootpath": "~/Documents/Programming/Content-Display/Content-Display/server",
                    "projectrelativepath": "./server"
                }
            }
        }
    },
    "layout": {    },
    "searchpath": {    },
    "detailsvisible": 0,
    "amxdtype": 0,
    "readonly": 0,
    "devpathtype": 0,
    "devpath": ".",
    "sortmode": 0,
    "viewmode": 0,
    "includepackages": 0
}