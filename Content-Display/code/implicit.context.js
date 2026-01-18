include("FF_Utilities.js");

var drawto = "";
let implicit_drawto = "";
let explicit_drawto = "";
let drawto_is_explicit = false;
let force_setdrawto = false;
let implicit_tracker = new JitterObject("jit_gl_implicit");
let implicit_listener = new JitterListener(implicit_tracker.name, implicit_callback);

let drawto_callback = null;
let root_callback = null;

let rootname = null;
const proxy = new JitterObject("jit.proxy");

function set_drawto(val) {
    // FF_Utils.Print("SET_DRAWTO", explicit_drawto)
	drawto_is_explicit = true;
    explicit_drawto = val;
    // first delete the tracker and its listener
    dispose();
    // then recreate them
    implicit_tracker = new JitterObject("jit_gl_implicit");
    implicit_tracker.drawto = val;
    implicit_listener = new JitterListener(implicit_tracker.name, implicit_callback);

    set_object_drawto(explicit_drawto);
}

function get_rootname(newdrawto) {
    if(newdrawto == rootname || !newdrawto) {
        return;
    }
    proxy.name = newdrawto;
	if(proxy.class !== undefined) {
		if(proxy.class != "jit_gl_context_view") {
			return get_rootname(proxy.send("getdrawto")[0]);
		}
	}
    rootname = newdrawto;
}
get_rootname.local = true;

function set_object_drawto(newdrawto) {
    // FF_Utils.Print("SET OBJ DRAWTO")
    drawto = newdrawto;
    if(drawto_callback) {
        drawto_callback(newdrawto);
    }
}
set_object_drawto.local = true;

function set_object_root(newdrawto) {
    if (root_callback) {
        get_rootname(newdrawto);
        root_callback(rootname);
    }
}
set_object_root.local = true;

// gets called ONLY when drawto attribute of implicit_tracker changes
function implicit_callback(event) {
    // FF_Utils.Print("EVENT IMPLICIT CALLBACK", event.eventname)
    const isWillfree = event.eventname == "willfree";

    if(event.eventname == "dest_closing") {
        force_setdrawto = true;
    }
	// this is called in case a drawto attribute is not specified
    else if(!drawto_is_explicit && (force_setdrawto || implicit_drawto != implicit_tracker.drawto[0])) {
        implicit_drawto = implicit_tracker.drawto[0];
        if(implicit_drawto != "") {
            // FF_Utils.Print("SET_DRAWTO IMPLICIT", implicit_drawto);
            set_object_drawto(implicit_drawto);
            set_object_root(implicit_drawto);
        }
    }
    // else if(drawto_is_explicit && (force_setdrawto)) { <---- what is force_setdrawto for? @Rob

    // this is called in case a drawto attribute IS specified
    else if((drawto_is_explicit || force_setdrawto) && !isWillfree) {
        if(implicit_tracker.drawto[0] != "") {
            // FF_Utils.Print("SET_DRAWTO EXPLICIT", explicit_drawto);
            // just set the root, since drawto is already been set explicitely
            set_object_root(explicit_drawto);
        }
    }
}
implicit_callback.local = 1;

//////// exports ////////

function dispose() {
    implicit_listener.freepeer();
    implicit_tracker.freepeer();
}
dispose.local = 1;

function register_drawto(js_context, drawtoCallback, rootCallback) {
    if (!js_context) {
        post("Error: No js context provided for declareattribute.\n");
        return;
    }

    Object.defineProperty(js_context, "drawto", {
        get: function () { return drawto; },
        set: function (val) { set_drawto(val); }
    });

    js_context.set_drawto = set_drawto;
    js_context.declareattribute("drawto", { setter: "set_drawto", label: "Drawto" });

	drawto_callback = drawtoCallback;
    root_callback = rootCallback;
}
register_drawto.local = true;

module.exports = {
    dispose,
    register_drawto
};