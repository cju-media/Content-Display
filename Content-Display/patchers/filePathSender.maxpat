{
    "patcher": {
        "fileversion": 1,
        "appversion": {
            "major": 9,
            "minor": 1,
            "revision": 1,
            "architecture": "x64",
            "modernui": 1
        },
        "classnamespace": "box",
        "rect": [ 2137.0, 280.0, 375.0, 326.0 ],
        "boxes": [
            {
                "box": {
                    "id": "obj-12",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 123.0, 125.0, 126.0, 22.0 ],
                    "text": "metro 1000 @active 1"
                }
            },
            {
                "box": {
                    "id": "obj-11",
                    "linecount": 3,
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 123.0, 159.0, 157.0, 49.0 ],
                    "text": "\"Macintosh HD:/Users/c/Desktop/filepath.txt\""
                }
            },
            {
                "box": {
                    "id": "obj-5",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 56.0, 263.0, 135.0, 22.0 ],
                    "text": "udpsend localhost 3238"
                }
            },
            {
                "box": {
                    "id": "obj-2",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 56.0, 213.0, 57.0, 22.0 ],
                    "text": "tosymbol"
                }
            },
            {
                "box": {
                    "id": "obj-203",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 67.0, 74.0, 101.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 36.0, 64.0, 101.0, 20.0 ],
                    "text": "Drop Folder Here"
                }
            },
            {
                "box": {
                    "id": "obj-34",
                    "maxclass": "dropfile",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 56.0, 63.0, 122.55319404602051, 42.12766045331955 ],
                    "presentation": 1,
                    "presentation_rect": [ 25.0, 53.0, 122.55319404602051, 42.12766045331955 ]
                }
            },
            {
                "box": {
                    "id": "obj-22",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 63.0, 36.0, 57.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 25.0, 26.0, 61.0, 20.0 ],
                    "text": "Coll Path"
                }
            }
        ],
        "lines": [
            {
                "patchline": {
                    "destination": [ "obj-2", 0 ],
                    "source": [ "obj-11", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-11", 0 ],
                    "source": [ "obj-12", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-5", 0 ],
                    "source": [ "obj-2", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-11", 1 ],
                    "midpoints": [ 65.5, 150.85679897665977, 270.5, 150.85679897665977 ],
                    "order": 0,
                    "source": [ "obj-34", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-2", 0 ],
                    "order": 1,
                    "source": [ "obj-34", 0 ]
                }
            }
        ],
        "autosave": 0
    }
}