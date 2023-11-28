let cwd = "/home/web_user/Desktop", lastCommand;

function addOutput(str)
{
	document.getElementById("output").textContent += str;
}

function addLine(line)
{
	addOutput(line + "\n");
}

function getInputPrefix()
{
	let path = cwd;
	if(path.substr(0,14) == "/home/web_user")
	{
		path = "~" + path.substr(14);
	}
	return "web_user@webshell:" + path + "#"; // # for root privileges, $ otherwise
}

function enableInput(prefix, placeholder = "")
{
	prefix = prefix || getInputPrefix();
	document.getElementById("input-prefix").textContent = prefix;
	document.getElementById("input").style.display = "block";
	document.querySelector("input").placeholder = placeholder;
	document.querySelector("input").focus();
	document.querySelector("input").scrollIntoView();
}

function disableInput()
{
	document.getElementById("input").style.display = "none";
}

function loadProgram(name, callback)
{
	worker.postMessage({ a: "loadProgram", b: name });
}

let argv, executing = false;

function onExecuteEnd()
{
	executing = false;
	enableInput();
}

function setInput(val)
{
	document.querySelector("input").value = val;
}

function terminal_onKeyDown(e)
{
	if (e.which == 38) // Arrow up
	{
		if (lastCommand)
		{
			setInput(lastCommand);
			e.preventDefault();
		}
	}
}

function executeCommand()
{
	disableInput();
	if(!executing)
	{
		addOutput(getInputPrefix() + " ");
	}
	if(!executing || document.querySelector("input").value.length != 0)
	{
		addLine(document.querySelector("input").value);
	}
	if(executing)
	{
		if(document.querySelector("input").value.length == 0)
		{
			input_arr[document.querySelector("input").value.length + 0] = 3;
		}
		else
		{
			str2arr(document.querySelector("input").value, input_arr);
			input_arr[document.querySelector("input").value.length + 0] = 10; /* "\n".charCodeAt(0) */
		}
		input_arr[document.querySelector("input").value.length + 1] = 0;

		document.querySelector("input").value = "";

		Atomics.notify(notify_arr, 0);
	}
	else
	{
		lastCommand = document.querySelector("input").value;
		argv = document.querySelector("input").value.split(" ");
		if(argv[0] == "help")
		{
			addLine("C/C++ programs \"installed\" on this system: pluto, lua");
			addLine("Commands provided by this console: cd, touch, edit, rm, share");
			setInput("");
			enableInput();
		}
		else if(argv[0] == "cd")
		{
			if(argv.length == 2)
			{
				let path = resolvePath(cwd, argv[1]);
				let node = fsRoot.resolvePath(path);
				if (node === undefined)
				{
					addLine("No such directory.");
				}
				else if (!FsNode_isDir(node))
				{
					addLine("Can't cd into a file.");
				}
				else
				{
					cwd = path;
				}
			}
			else
			{
				addLine("Expected a parameter.");
			}
			setInput("");
			enableInput();
		}
		else if(argv[0] == "touch")
		{
			if(argv.length == 2)
			{
				let dir = fsRoot.resolvePath(cwd);
				if(dir.getChild(argv[1]) === undefined)
				{
					dir.addFileNocheck(argv[1]);
					fsExport();
				}
			}
			else
			{
				addLine("Expected a parameter.");
			}
			setInput("");
			enableInput();
		}
		else if(argv[0] == "edit" || argv[0] == "nano")
		{
			if(argv.length == 2)
			{
				createEditor(fsRoot.resolvePath(cwd).addFile(argv[1]));
			}
			else
			{
				addLine("Expected a parameter.");
			}
			setInput("");
			enableInput();
		}
		else if(argv[0] == "rm")
		{
			if(argv.length == 2)
			{
				let dir = fsRoot.resolvePath(cwd);
				let file = dir.getChild(argv[1]);
				if(file !== undefined)
				{
					dir.removeChild(file);
					fsExport();
				}
			}
			else
			{
				addLine("Expected a parameter.");
			}
			setInput("");
			enableInput();
		}
		else if(argv[0] == "share")
		{
			if(argv.length == 2)
			{
				let file = fsRoot.resolvePath(resolvePath(cwd, argv[1]));
				if(file !== undefined && FsNode_isFile(file))
				{
					addLine("https://webshell.dev/#code=" + encodeURIComponent(file.contents) + "&ext=pluto&run=pluto");
				}
				else
				{
					addLine("No such file.");
				}
			}
			else
			{
				addLine("Expected a parameter.");
			}
			setInput("");
			enableInput();
		}
		else
		{
			executing = true;
			worker.postMessage({ a: "loadProgram", b: argv[0] });
		}
	}
	return false;
}

window.worker = new Worker("/src/worker.js");
worker.addEventListener("message", function(event)
{
	//console.log("From Worker:", event.data);
	switch(event.data.a)
	{
	case "addOutput":
		addOutput(event.data.b);
		break;

	case "loadProgram":
		if(!event.data.b)
		{
			addLine("Not a valid program.");
			onExecuteEnd();
			return;
		}
		setInput("");
		worker.postMessage({ a: "invokeMain", fs: fsRoot, cwd, argv });
		break;

	case "write":
		fsRoot.resolveFileAndCreateIfNeeded(event.data.b).contents = event.data.c;
		fsExport();
		break;

	case "input":
		enableInput("?", "program awaits input, press enter to cancel");
		break;

	case "onExecuteEnd":
		onExecuteEnd();
		break;
	}
});
window.notify_sab = new SharedArrayBuffer(4);
window.notify_arr = new Int32Array(notify_sab);
window.input_sab = new SharedArrayBuffer(1024);
window.input_arr = new Uint8Array(input_sab);
worker.postMessage({ a: "hello", b: notify_sab, c: input_sab });
