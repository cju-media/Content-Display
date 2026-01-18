autowatch=1;
outlets=3;
// outlet 0 = jit_matrix / jit_gl_texture
// outlet 1 = movie attributes
// outlet 2 = special messages

const cachemode_static = 0;
const cachemode_auto = 1;


var autorestart = 0;
declareattribute("autorestart", { style: "onoff", label: "Automatic restart toggle"});
    
var verbose = 0;
declareattribute("verbose", { style: "onoff", label: "Verbose console reporting"});

// for poly~ type addressing of individual movie instances
var target = 0;
declareattribute("target", { type: "long", setter: "settarget", label: "Active target instance"});

let curmov=-1;
let isstopped=false;
let saveargs=true;
let readcount = 0;
let loopmode = 1;
let autorestartpending = false;

let targets = [];

// viddll supports all these, first 3 are supported by avf
let filetypes = ["MPEG", "mpg4","MooV", "WVC1", "WMVA", "WMV3", "WMV2", "M4V ", "VfW ","PNG ", "JPEG", "GIFf", "TIFF", "BMP "];

let moviedict = new Dict();
let movies = new Object();
let movnames = [];
let curmovob = null;
let movct = 0;

let savedargs = new Array();
let dummymatrix = new JitterMatrix(4,"char",320,240);

const outtex = "jit_gl_texture";
const outmat = "jit_matrix";

function postln(arg) {
	if(verbose)
		post(arg+"\n");
}
postln.local = 1;

let tmp = new JitterObject("jit.movie");
const engine = tmp.engine;
tmp.freepeer();
const isviddll = (engine === "viddll");
if(isviddll) {
	postln("polymovie using viddll engine");
	var cachemode = cachemode_static;
	declareattribute({ name: "cachemode", style: "enumindex", enumvals: ["Static", "Auto"], label: "Cache mode" });
	var cache_size = 0.5;
	declareattribute("cache_size", { type: "float", label: "Cache size in GBs"});
	var cache_sizeauto = 5;
	declareattribute("cache_sizeauto", { type: "float", label: "Automatic cache size in GBs"});
}
else {
	postln("polymovie using avf engine");
}

const useasync = true;
// force override here if asyncread is causing issues
//const useasync = false;

let drawtexture = false;
if(jsarguments[jsarguments.length - 1] === "jit.gl.polymovie") {
	const contextFinder = require("implicit.context.js");
	contextFinder.register_drawto(this, dosetdrawto, dosetroot);
	drawtexture = true;
	outlettypes = [null, null, "jit_gl_texture"];
}
else {
	outlettypes = [null, null, "jit_matrix"];
}

if (jsarguments.length > 3) {
	let boxargs = jsarguments.splice(1, jsarguments.length - 3);
	for(let i = 0; i < boxargs.length; ) {
		if(boxargs[i][0] === '@') {
			let attrname = boxargs[i++].slice(1);
			let args =[];
			while(i < boxargs.length && boxargs[i][0] !== '@') {
				args.push(boxargs[i++])
			}
			if(attrname === "drawto" && drawtexture) {
				set_drawto(args[0]);
			}
			else {
				let e = attrname+","+args.join();
				savedargs.push(e);
				postln(e);
			}
		}
		else {
			// not an attr-arg, assume it's a drawto
			if(drawtexture) {
				set_drawto(boxargs[i]);
			}
			i++;
		}
	}
}

/////////////////////////////////////////////
// #mark GL Context
/////////////////////////////////////////////

function dosetdrawto(arg) {
	postln("setdrawto " + arg);
	setmovieattr("drawto",arg);
	setmovieattr("output_texture",1);
}

function swapcallback(event){
	//post("callback: " + event.subjectname + " sent "+ event.eventname + " with (" + event.args + ")\n");
	if (event.eventname=="swap") {
		drawmovies();
	}
}
swapcallback.local = 1;

let swaplisten=null;
function dosetroot(rootname) {
	if(swaplisten)
		swaplisten.subjectname = "";
	swaplisten = new JitterListener(rootname,swapcallback);
}

/////////////////////////////////////////////
// #mark Movie event
/////////////////////////////////////////////

function bang() {
	if(!drawtexture)
		drawmovies();
}

function movcallback(event){
	if(event.eventname==="read") {
		let m = movies[event.subjectname];
		finalizemovie(m);

		if(readcount == movnames.length) {
			finalizeread();
		}
	}
	else if(event.eventname==="seeknotify") {
		outlet(2, "seeknotify", target);
		if(autorestartpending) {
			let m = movies[event.subjectname];
			if(m.index == curmov) {
				autorestartpending = 0;
				curmovob.start();
				isstopped = false;
			}
		}
	}
	else if(event.eventname==="loopreport") {
		outlet(2, "loopnotify", target);
	}
	//post("callback: " + event.subjectname + " sent "+ event.eventname + " with (" + event.args + ")\n");		
}
movcallback.local = 1;

function drawmovies() {
	if(!targets.length) {
		drawmovie();
	}
	else {
		outtype = outtex;
		outnames = [];
		outpositions = [];
		for(i = 0; i < targets.length; i++) {
			let o = targets[i];
			if(!o)
				continue;

			if(drawtexture) {
				o.matrixcalc(dummymatrix,dummymatrix);
				outnames.push(o.texture_name);
			}
			else {
				outtype = outmat;
				let movdim = o.movie_dim;
				let matdim = dummymatrix.dim;
				if(movdim[0]!=matdim[0] || movdim[1]!=matdim[1])
					dummymatrix.dim=movdim;
				o.matrixcalc(dummymatrix,dummymatrix);
				outnames.push(dummymatrix.name);
			}
			outpositions.push(o.position);
		}		
		outlet(0, outtype, outnames);
		outlet(2, "position", outpositions);
	}
}
drawmovies.local = 1;

function drawmovie() {
	if(autorestartpending)
		return;
	
	if(!curmovob)
		return;

	let o = curmovob;
	if(drawtexture) {
		o.matrixcalc(dummymatrix,dummymatrix);
		outlet(0,outtex,o.texture_name);
	}
	else {
		let movdim = o.movie_dim;
		let matdim = dummymatrix.dim;
		if(movdim[0]!=matdim[0] || movdim[1]!=matdim[1])
			dummymatrix.dim=movdim;
		o.matrixcalc(dummymatrix,dummymatrix);
		outlet(0,outmat,dummymatrix.name);
	}
	outlet(2, "position", o.position);
}
drawmovie.local = 1;


function getmovie_index(i) {
	if(i>=0 && i<movnames.length) 
		return movies[movnames[i]]["movie"];
	return null;
}
getmovie_index.local = 1;

function getmovie_name(n) {
	return movies[n]["movie"];
}
getmovie_name.local = 1;


/////////////////////////////////////////////
// #mark Read and Init
/////////////////////////////////////////////

function clear() {
	settarget(0);
	readcount = 0;
	curmovob = null;
	for(n in movies) {
		getmovie_name(n).freepeer();
	}
	movnames.splice(0,movnames.length);
	movies = new Object();
	moviedict.clear();
	movct = 0;
	autorestartpending = 0;
	outlet(2, "movielist", "clear");
}

function doreadfolder(path) {
    let f;
    if(path) {
        f = new Folder(path);
    }
    else {
        f = new Folder();
        let openpath = f.opendialog();
		if(!openpath) {
			return null;
		}
    }
	return f;
}

function readfolder(path) {
    let f = doreadfolder(path);
	if(f) {
		clear();
		doappendfolder(f);
	}
}

function appendfolder(path) {
    let f = doreadfolder(path);
	if(f) {
		doappendfolder(f);
	}
}

function doappendfolder(f) {
	
	let fpath = f.pathname + "/";
	let fcount = f.count;
	f.reset();

	while (!f.end) {
		if(ismovie(f.filetype)) {
			postln(fpath + f.filename);
			addmovie(fpath + f.filename);
		}
		f.next();
	}
	doargattrs();
	if(!useasync) {
		finalizeread();
	}
}

function appendmovie(path) {
	addmovie(path)
	doargattrs();
}

function dictionary(dname) {
	postln("reading dictionary " + dname);
	let d = new Dict(dname);
	let keys = d.getkeys();
	if(!keys)
		return;
	
	clear();

	// convert single value to array
	if(typeof(keys) === "string") {
		keys = [keys];
	}
	keys.forEach(function (key, i) {
		let m = d.get(key);
		addmovie(m.get("path"));
	});

	// apply arg attrs first...
	doargattrs();

	// then apply dictionary attrs
	keys.forEach(function (key, i) {
		let m = d.get(key)
		let attrs = m.get("attributes");
		if(attrs) {
			let akeys = attrs.getkeys();
			let movie = getmovie_index(i);

			// convert single value to array
			if(typeof(akeys) === "string") {
				akeys = [akeys];
			}
			akeys.forEach(function (akey, j) {
				//postln("attribute: " + akey + ", vals: " + attrs.get(akey));
				if(movie) {
					sendmovie(movie, akey, attrs.get(akey));
				}
			});
		}
	});
	
	if(!useasync) {
		finalizeread();
	}
}

function writedict() {
	writeloopstatetodict(curmovob);
	if(arguments.length) {
		moviedict.export_json(arguments[0]);
	}
	else {
		moviedict.export_json();
	}
}

function readdict() {
	let d = new Dict();
	if(arguments.length) {
		d.import_json(arguments[0]);
	}
	else {
		d.import_json();
	}
	dictionary(d.name);
}

function getdict() {
	writeloopstatetodict(curmovob);
	outlet(2, "dictionary", moviedict.name);
}

// from patcherargs
function done() {
	saveargs=false;
	doargattrs();
}

function addmovie(path) {
	let o = new JitterObject("jit.movie");
	o.autostart=0;
	o.automatic=0;
	if(!drawtexture) {
		postln("disable output_texture")
		o.output_texture=0;
	}
	else {
		postln("enable output_texture")
		o.output_texture=1;
		o.drawto=drawto;
	}

	// engine specific stuff goes here...
	if(isviddll) {
		o.cache_size = cache_size;
	}
	
	let idx = movct++;
	let regname = o.getregisteredname();
	movnames.push(regname);
	let m = new Object();
	movies[regname] = m;
	m.movie = o;
	m.index = idx;
	m.listener = new JitterListener(regname, movcallback);

	// placeholder values, will overwrite in finalizemovie
	moviedict.setparse(m.index, '{ "name" : "'+m.movie.moviename+'", "path" : "' + m.movie.moviepath + '"}' );
	
	// placeholder for proper umenu ordering
	outlet(2, "movielist", "append", m.path);
	
	if(useasync) {
		o.asyncread(path);
	}
	else {
		o.read(path);
		finalizemovie(m);
	}
}
addmovie.local = 1;

function ismovie(t) {
	for(f in filetypes) {
		if(filetypes[f]===t)
			return true;
	}
	return false;
}
ismovie.local = 1;

function finalizeread() {
	outlet(2, "readfolder", "done", readcount);
	outlet(2, "dictionary", moviedict.name);
}
finalizeread.local = 1;

function finalizemovie(m) {
	readcount++;
	moviedict.replace(m.index+"::name", m.movie.moviename);
	moviedict.replace(m.index+"::path", m.movie.moviepath);

	// overwrite full path with filename
	outlet(2, "movielist", "setitem", m.index, m.movie.moviename);
	
	postln("movie info for movie index: "+m.index);
	postln("name: "+m.movie.moviename);
}
finalizemovie.local = 1;

// maybe not an issue, but only write looppoints on movie changes or dictionary writes
function writeloopstatetodict(ob) {
	if(ob) {
		let idx = movies[ob.getregisteredname()].index;
		moviedict.replace(idx + "::attributes::looppoints_secs", ob.looppoints_secs);
	}
}
writeloopstatetodict.local = 1;

// loop state is reset on file read, so grab it from the dictionary when playback triggered
function readloopstatefromdict(ob) {
	if(ob) {
		let idx = movies[ob.getregisteredname()].index;
		if(moviedict.contains(idx + "::attributes::looppoints_secs")) {
			ob.looppoints_secs = moviedict.get(idx + "::attributes::looppoints_secs");
		}
	}
}
readloopstatefromdict.local = 1;

/////////////////////////////////////////////
// #mark Playback
/////////////////////////////////////////////

function settarget(t) {
	postln("setting target " + t);
	target = t;
	if(target === 0 && targets.length) {
		curmovob = targets[0];
		targets.splice(0, targets.length);
		postln("target length is: " + targets.length);
	}
	else if(target > 0) { 
		if(target <= targets.length)
			curmovob = targets[target - 1];
		else 
			curmovob = null;
	}
}

function play() {
	let i=0;	
	if(arguments.length) {
		i=arguments[0];
	}

	if(movieindexvalid(i)) {
		endmovie();
		curmov = i;
		curmovob = getmovie_index(curmov);
		postln("playing movie: " + curmov + " " + curmovob.moviefile);
		if(!isstopped || target > 0)
			doplay();
		
		curmovob.loop = loopmode;
		readloopstatefromdict(curmovob);
		let loopi = curmovob.looppoints_secs[0] / curmovob.seconds;
		let loopo = curmovob.looppoints_secs[1] / curmovob.seconds;
		// output normalized looppoints for GUI
		outlet(2, "looppoints", loopi, loopo);

		if(isviddll && cachemode == cachemode_auto) {
			postln("autosizing cache: "+cache_sizeauto);
			curmovob.cache_size = cache_sizeauto;
		}
	}

	if(target > 0) {
		targets[target-1] = curmovob;
		postln("added target, length is: " + targets.length);
	}
}

function start() {
	doplay();
}

function stop() {
	autorestartpending = 0;
	if(curmovob) {
		curmovob.stop();
        if(autorestart) {
            curmovob.time = curmovob.looppoints[0];
        }
    }
	isstopped = true;
}

function scrub(pos) {
	if(curmovob) {
		curmovob.position = pos;
	}
}

function doplay() {
	if(curmovob) {
        if(autorestart) {
			if(!isviddll && curmovob.duration > 1) {
				autorestartpending = true;
				curmovob.time = curmovob.looppoints[0];
				return;
			}
            curmovob.time = curmovob.looppoints[0];
        }
		curmovob.start();
	}
	isstopped = false;
}
doplay.local = 1;

function endmovie() {
	if(curmovob) {
		curmovob.stop();
		writeloopstatetodict(curmovob);
		if(isviddll && curmovob && cachemode == cachemode_auto) {
			postln("zeroing cache");
			curmovob.cache_size = 0;
		}
	}
}
endmovie.local = 1;

function movieindexvalid(idx) {
	return (idx < movnames.length && idx >= 0);
}
movieindexvalid.local = 1;

/////////////////////////////////////////////
// #mark Args Attrs and Messages
/////////////////////////////////////////////

function anything() {
	if(saveargs) {
		let a = arrayfromargs(arguments);
		let e = messagename+","+a.join();
		savedargs.push(e);
	}
	if(curmovob) {
		let a = arrayfromargs(arguments);
		sendmovie(curmovob, messagename, a);
	}
}

function sendmovies() {
	let a = arrayfromargs(arguments);
	let mess = a[0];
	if(a.length>1)
		a.splice(0,1)
		
	for(n in movies) {
		sendmovie(getmovie_name(n),mess, a);
	}	
}

// special case handlers for position and loop attrs
function position(p) {
	if(curmovob) {
		curmovob.position = p;
	}
}

function loop(state) {
	loopmode = state;
	if(curmovob) {
		curmovob.loop = loopmode;
	}
}

function looppoints(loopi, loopo) {
	if(curmovob) {
		if(loopi <= 1. && loopo <= 1.) {
			// special polymovie normalized looppoints
			let loopsecin = (loopi < loopo ? loopi : loopo) * curmovob.seconds;
			let loopsecout = (loopi < loopo ? loopo : loopi) * curmovob.seconds;
			curmovob.looppoints_secs = [loopsecin, loopsecout];
		}
		else {
			// conventional looppoints
			curmovob.looppoints = [loopi, loopo];
		}
	}
}

function automatic(v) {
	post("modifying automatic unsupported\n");
}

function autostart(v) {
	post("modifying autostart unsupported\n");
}

function output_texture(v) {
	post("modifying output_texture unsupported\n");
}

function sendmovie(movie, mess, args) {
	if (Function.prototype.isPrototypeOf(movie[mess])) {
		postln("sending message " + mess + " with args " + args);
		movie[mess](args);
	} 
	else if(mess.search("get")==0) {
		let attr=mess.substr(3, mess.length);
		postln("getting attr " + attr);
		outlet(1, attr, movie[attr]);
	}
	else {
		postln("setting attr " + mess + " with args " + args);
		movie[mess] = args;	
		let regname = movie.getregisteredname();
		let idx = movies[regname].index;
		moviedict.replace(idx + "::attributes::" + mess, args);
	}	
}
sendmovie.local = 1;

function doargattrs() {
	for(n in movies) {
		let m = getmovie_name(n);
		for(i in savedargs) {
			let str = savedargs[i];
			let ary = str.split(",");
			sendmovie(m, ary[0], ary.slice(1,ary.length));
		}
	}
}
doargattrs.local = 1;

function setmovieattr(arg, val) {	
	for(n in movies) 
		getmovie_name(n)[arg] = val;
}
setmovieattr.local = 1;