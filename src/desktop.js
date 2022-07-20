let dragWnd, dragX, dragY, resizeWnd, highz = 0;

function window_bringToFront(wnd)
{
	if(document.querySelector(".topmost"))
	{
		document.querySelector(".topmost").classList.remove("topmost");
	}
	wnd.classList.add("topmost");
	wnd.style.zIndex = ++highz;
}

function event_getClientX(e)
{
	return "changedTouches" in e
		? e.changedTouches[0].clientX
		: e.clientX
		;
}

function event_getClientY(e)
{
	return "changedTouches" in e
		? e.changedTouches[0].clientY
		: e.clientY
		;
}

function window_addEventListeners(wnd)
{
	wnd.onmousedown = wnd.ontouchstart = function(e)
	{
		window_bringToFront(this);
		if(e.target.className == "window-head"
			|| e.target.className == "window-title"
			)
		{
			let rect = this.getBoundingClientRect();
			dragWnd = this;
			document.querySelector(".desktop").classList.add("drag");
			dragX = rect.x - event_getClientX(e);
			dragY = rect.y - event_getClientY(e);
			e.preventDefault();
		}
		else if(e.target.className == "window-resize")
		{
			resizeWnd = this;
			document.querySelector(".desktop").classList.add("drag");
			document.querySelector(".desktop").style.cursor = "se-resize";
			e.preventDefault();
		}
	};
	wnd.querySelector(".window-close").onclick = function()
	{
		window_close(wnd);
	};
}

window.onmousemove = window.ontouchmove = function(e)
{
	if(dragWnd)
	{
		window_setPos(dragWnd, dragX + event_getClientX(e), dragY + event_getClientY(e));
	}
	if(resizeWnd)
	{
		let rect = resizeWnd.getBoundingClientRect();
		window_setWidth(resizeWnd, event_getClientX(e) - rect.x + 1);
		window_setHeight(resizeWnd, event_getClientY(e) - rect.y + 1);
	}
};

window.onmouseup = window.ontouchend = function(e)
{
	if(dragWnd)
	{
		window_clamp(dragWnd);
		dragWnd = undefined;
		document.querySelector(".desktop").classList.remove("drag");
	}
	if(resizeWnd)
	{
		window_clamp(resizeWnd);
		resizeWnd = undefined;
		document.querySelector(".desktop").classList.remove("drag");
		document.querySelector(".desktop").style.cursor = "";
	}
};

function window_setPos(wnd, x, y)
{
	window_setX(wnd, x);
	window_setY(wnd, y);
}

function window_setX(wnd, x)
{
	wnd.style.left = x + "px";
}

function window_setY(wnd, y)
{
	wnd.style.top = y + "px";
}

function window_setWidth(wnd, width)
{
	if(width < 50)
	{
		width = 50;
	}
	wnd.style.width = width + "px";
}

function window_setHeight(wnd, height)
{
	if(height < 50)
	{
		height = 50;
	}
	wnd.style.height = height + "px";
}

function window_setPosToCenter(wnd)
{
	window_setX(wnd, (document.querySelector(".desktop").clientWidth - wnd.clientWidth) / 2);
	window_setY(wnd, (document.querySelector(".desktop").clientHeight - wnd.clientHeight) / 2);
}

function window_clamp(wnd)
{
	let rect = wnd.getBoundingClientRect();

	if(wnd.clientWidth > document.querySelector(".desktop").clientWidth)
	{
		window_setX(wnd, 0);
		window_setWidth(wnd, document.querySelector(".desktop").clientWidth);
	}
	else if(rect.x < 0)
	{
		window_setX(wnd, 0);
	}
	else if(rect.x + rect.width > document.querySelector(".desktop").clientWidth)
	{
		window_setX(wnd, document.querySelector(".desktop").clientWidth - rect.width);
	}

	if(wnd.clientHeight > document.querySelector(".desktop").clientHeight)
	{
		window_setY(wnd, 0);
		window_setHeight(wnd, document.querySelector(".desktop").clientHeight);
	}
	else if(rect.y < 0)
	{
		window_setY(wnd, 0);
	}
	else if(rect.y + rect.height > document.querySelector(".desktop").clientHeight)
	{
		window_setY(wnd, document.querySelector(".desktop").clientHeight - rect.height);
	}
}

function window_close(wnd)
{
	wnd.parentNode.removeChild(wnd);
}

function window_getTitle(wnd)
{
	return wnd.querySelector(".window-title").textContent;
}

function createWindow(_title, body)
{
	let wnd = document.createElement("div");
	wnd.className = "window";
	wnd.style.width = "900px";
	wnd.style.height = "500px";

	let head = document.createElement("div");
	head.className = "window-head";

	let title = document.createElement("span");
	title.className = "window-title";
	title.textContent = _title;
	head.appendChild(title);

	let close = document.createElement("span");
	close.className = "window-close";
	close.textContent = "X";
	head.appendChild(close);

	wnd.appendChild(head);

	body.classList.add("window-body");
	wnd.appendChild(body);

	let resize = document.createElement("div");
	resize.className = "window-resize";
	wnd.appendChild(resize);

	document.querySelector(".desktop").appendChild(wnd);

	window_setPosToCenter(wnd);
	window_clamp(wnd);
	window_bringToFront(wnd);
	window_addEventListeners(wnd);

	return wnd;
}

function createTerminal()
{
	let body = document.createElement("div");
	body.style.fontFamily = "monospace";

	let output = document.createElement("pre");
	output.id = "output";
	body.appendChild(output);

	body.innerHTML += '<form onsubmit="return executeCommand();"><pre id="input"><span id="input-prefix">web_user@webshell:~/Desktop#</span> <input type="text"></pre></form>';

	createWindow("Terminal", body);

	addLine("Welcome to the web shell. Everything here is happening in your browser.");
	addLine('Use "help" to get a list of commands.');
}

function createWebBrowser()
{
	let body = document.createElement("iframe");
	body.src = "/web/plutolang.github.io/";
	createWindow("Web Browser", body);
}

function createEditor(file)
{
	let div = document.createElement("div");
	div.id = "editor";
	div.textContent = file.contents;

	let wnd = createWindow("Editor - " + file.getPath(), div);

	let editor = ace.edit("editor");
	editor.setTheme("ace/theme/monokai");
	editor.session.setUseWorker(false);
	editor.session.setMode("ace/mode/lua");
	editor.session.on("change", function(delta)
	{
		editor_getFile(wnd).contents = editor.getValue();
	});
	editor.focus();
}

function editor_getPath(wnd)
{
	return window_getTitle(wnd).substr(9);
}

function editor_getFile(wnd)
{
	return fsRoot.resolvePath(editor_getPath(wnd));
}

window.onresize = function()
{
	document.querySelectorAll(".window").forEach(window_clamp);
}

function desktop_addFile(file)
{
	let div = document.createElement("div");
	div.className = "file";
	div.textContent = file.name;
	div.onclick = function()
	{
		createEditor(fsRoot.resolvePath(resolvePath("/home/web_user/Desktop", this.textContent)));
	};
	document.querySelector(".desktop").appendChild(div);
}

function desktop_removeFile(file)
{
	for(let i = 0; i != document.querySelector(".desktop").children.length; ++i)
	{
		let elm = document.querySelector(".desktop").children[i];
		if(elm.classList.contains("file")
			&& elm.textContent == file.name
			)
		{
			document.querySelector(".desktop").removeChild(elm);
			break;
		}
	}
}

window.fsRoot = new FsDir(undefined, "");
fsRoot.addDir("home").addDir("web_user").addDir("Desktop");
