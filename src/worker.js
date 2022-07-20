importScripts("/src/common.js");

function addOutput(str)
{
	postMessage({
		a: "addOutput",
		b: str
	});
}

const PTRSIZE = 4;

function allocateString(prog, str)
{
	let ptr = prog.malloc(str.length + 1);
	prog.strcpy(ptr, str);
	return ptr;
}

function allocateStringArray(prog, arr)
{
	let u32arr = new Uint32Array(arr.length);
	for (let i = 0; i != arr.length; ++i)
	{
		u32arr[i] = allocateString(prog, arr[i]);
	}
	let ptr = prog.malloc(PTRSIZE * arr.length);
	var heap = new Uint8Array(prog.mod.HEAPU8.buffer, ptr, PTRSIZE * arr.length);
	heap.set(new Uint8Array(u32arr.buffer));
	return heap;
}

function freePtrArray(prog, arr, len)
{
	// TODO: Free individual pointers, this code is wrong:
	/*for (let i = 0; i != len; ++i)
	{
		prog.free(arr[i]);
	}*/
	prog.free(arr);
}

let loaded_programs = {}, input = "", interrupt_input = false, notify_sab, notify_arr, input_sab, input_arr;

function loadProgram(name)
{
	if(name in loaded_programs)
	{
		postMessage({ a: "loadProgram", b: (loaded_programs[name] != null) });
		return;
	}

	//addLine("% Fetching program information...");

	exports = {};
	try
	{
		importScripts("/programs/" + name + ".js");
	}
	catch(e)
	{
		console.log("Caught", e);
		loaded_programs[name] = null;
		postMessage({ a: "loadProgram", b: false });
		return;
	}

	let config = {};

	config.locateFile = function(path)
	{
		return "/programs/" + path;
	}

	config.preInit = function()
	{
		let out = function(c)
		{
			addOutput(String.fromCharCode(c));
		};

		config.FS.init(function()
		{
			if(interrupt_input)
			{
				interrupt_input = false;
				return null;
			}
			if (input.length == 0)
			{
				postMessage({ a: "input" });

				Atomics.wait(notify_arr, 0);

				for (let i = 0; input_arr[i] != 0; ++i)
				{
					input += String.fromCharCode(input_arr[i]);
				}

				noinputisokay = true;
			}

			let c = input[0].charCodeAt(0);
			input = input.substr(1);
			if (c == 3)
			{
				return null;
			}
			if (c == 10) /* "\n".charCodeAt(0) */
			{
				interrupt_input = true;
			}
			return c;
		}, out, out);
	};

	config.noInitialRun = true;

	//addLine("% Loading program...");

	exports[name](config).then(function(mod)
	{
		loaded_programs[name] = {
			mod: mod,
			malloc: mod.cwrap("malloc", "int", ["int"]),
			free: mod.cwrap("free", "void", ["int"]),
			strcpy: mod.cwrap("strcpy", "void", ["int", "string"]),
			main: mod.cwrap("main", "int", ["int", "array"]),
		};
		postMessage({ a: "loadProgram", b: true });
	});
}

function setupFs(prog, dir)
{
	dir.children.forEach(n => {
		if(FsNode_isDir(n))
		{
			if(!prog.mod.FS.analyzePath(FsNode_getPath(n)).exists)
			{
				prog.mod.FS.mkdir(FsNode_getPath(n));
			}
			setupFs(prog, n);
		}
		else
		{
			let data = new Uint8Array(n.contents.length);
			str2arr(n.contents, data);
			let stream = prog.mod.FS.open(FsNode_getPath(n), "w+");
			prog.mod.FS.write(stream, data, 0, data.length, 0);
			prog.mod.FS.close(stream);
		}
	});
}

function finishSetupFs(prog)
{
	prog.mod.FS.trackingDelegate['onMovePath'] = function(oldpath, newpath) {
		addLine('NOTE: Moved "' + oldpath + '" to "' + newpath + '" but not be synced');
	};
	prog.mod.FS.trackingDelegate['onDeletePath'] = function(path) {
		addLine('NOTE: Deleted "' + path + '" but not synced');
	};
	prog.mod.FS.trackingDelegate['onWriteToFile'] = function(path, bytesWritten) {
		if(path.substr(0,5)!="/dev/")
		{
			addLine('NOTE: Wrote to file "' + path + '" but not synced');
		}
	};
	prog.mod.FS.trackingDelegate['onMakeDirectory'] = function(path, mode) {
		addLine('NOTE: Created directory ' + resolvePath(prog.mod.FS.cwd(), path) + " but not synced");
	};
	prog.mod.FS.trackingDelegate['onMakeSymlink'] = function(oldpath, newpath) {
		addLine('NOTE: Created symlink from ' + oldpath + ' to ' + newpath + " but not synced");
	};
}

// forEach no worky with the emscripten stuff :(
/*function printFsInner(node, prefix = "")
{
	console.log(prefix + node.name);
	prefix += "\t";
	if(node.isFolder())
	{
		node.contents.forEach(n => printFsInner(node, prefix));
	}
}

function printFs(prog)
{
	prog.mod.FS.root.contents.forEach(printFsInner);
}*/

function invokeMain(prog, argv)
{
	let argv_ptr = allocateStringArray(prog, argv);
	let status = prog.main(argv.length, argv_ptr);
	if (status != 0)
	{
		addLine("Program finished with exit code " + status + ".");
	}
	//freePtrArray(prog, argv_ptr, argv.length);
	delete loaded_programs[argv[0]]; // Delete it so we get a fresh instance next time. Doesn't call atexit, but no memory should be leaked.
	postMessage({a: "onExecuteEnd" });
}

addEventListener("message", function(event)
{
	//console.log("From Main Thread:", event.data);
	switch (event.data.a)
	{
	case "hello":
		notify_sab = event.data.b;
		notify_arr = new Int32Array(notify_sab);
		input_sab = event.data.c;
		input_arr = new Uint8Array(input_sab);
		break;

	case "loadProgram":
		loadProgram(event.data.b);
		break;

	case "invokeMain":
		let prog = loaded_programs[event.data.argv[0]];
		setupFs(prog, event.data.fs);
		finishSetupFs(prog);
		prog.mod.FS.chdir(event.data.cwd);
		invokeMain(prog, event.data.argv);
		break;
	}
});
