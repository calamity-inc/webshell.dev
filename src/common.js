function addLine(line)
{
	addOutput(line + "\n");
}

function str2arr(str, arr)
{
	for(let i = 0; i != str.length; ++i)
	{
		arr[i] = str.charCodeAt(i);
	}
}

// Our own filesystem structure

class FsNode
{
	type = 0;
	parent;
	name;

	constructor(parent, name)
	{
		this.parent = parent;
		this.name = name;
	}

	getPath()
	{
		return FsNode_getPath(this);
	}

	isDir()
	{
		return FsNode_isDir(this);
	}

	isFile()
	{
		return FsNode_isFile(this);
	}

	serialise()
	{
		return {
			type: this.type,
			name: this.name,
		};
	}
}

function FsNode_getPath(node)
{
	let path = node.name;
	if(node.parent != undefined)
	{
		path = FsNode_getPath(node.parent) + "/" + path;
	}
	return path;
}

function FsNode_isDir(node)
{
	return node.type == 0;
}

function FsNode_isFile(node)
{
	return node.type == 1;
}

class FsDir extends FsNode
{
	children = [];

	addDir(name)
	{
		let dir = new FsDir(this, name);
		this.children.push(dir);
		return dir;
	}

	addFile(name, contents = "")
	{
		let file = this.getChild(name);
		if(file !== undefined)
		{
			return file;
		}
		file = new FsFile(this, name, contents);
		this.children.push(file);
		if (typeof desktop_addFile == "function"
			&& this.getPath() == "/home/web_user/Desktop"
			)
		{
			desktop_addFile(file);
		}
		return file;
	}

	getChild(name)
	{
		for(let i = 0; i != this.children.length; ++i)
		{
			if(this.children[i].name == name)
			{
				return this.children[i];
			}
		}
		return undefined;
	}

	resolvePath(path)
	{
		if(path.substr(path.length - 1) == "/")
		{
			path = path.substr(0, path.length - 1);
		}

		let sections = path.split("/");
		let i = 0;
		if(sections[i] == this.name)
		{
			i = 1;
		}
		let node = this;
		for(; i != sections.length; ++i)
		{
			node = node.getChild(sections[i]);
			if (node == undefined)
			{
				break;
			}
		}
		return node;
	}

	removeChild(file)
	{
		if (typeof desktop_removeFile == "function"
			&& this.getPath() == "/home/web_user/Desktop"
			)
		{
			desktop_removeFile(file);
		}
		for(let i = 0; i != this.children.length; ++i)
		{
			this.children.splice(i, 1);
			break;
		}
	}

	serialise()
	{
		let o = super.serialise();
		o.children = [];
		for(let i = 0; i != this.children.length; ++i)
		{
			o.children.push(this.children[i].serialise());
		}
		return o;
	}
}

class FsFile extends FsNode
{
	contents;

	constructor(parent, name, contents = "")
	{
		super(parent, name);
		this.type = 1;
		this.contents = contents;
	}

	serialise()
	{
		let o = super.serialise();
		o.contents = this.contents;
		return o;
	}
}

// Path helpers stolen from emscripten

function resolvePath() {
	var resolvedPath = ""
	, resolvedAbsolute = false;
	for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
		var path = i >= 0 ? arguments[i] : FS.cwd();
		if (typeof path != "string") {
			throw new TypeError("Arguments to resolvePath must be strings")
		} else if (!path) {
			return ""
		}
		resolvedPath = path + "/" + resolvedPath;
		resolvedAbsolute = path.charAt(0) === "/"
	}
	resolvedPath = normalizeArray(resolvedPath.split("/").filter(function(p) {
		return !!p
	}), !resolvedAbsolute).join("/");
	return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
}

function normalizeArray(parts, allowAboveRoot)
{
	var up = 0;
	for (var i = parts.length - 1; i >= 0; i--) {
		var last = parts[i];
		if (last === ".") {
			parts.splice(i, 1)
		} else if (last === "..") {
			parts.splice(i, 1);
			up++
		} else if (up) {
			parts.splice(i, 1);
			up--
		}
	}
	if (allowAboveRoot) {
		for (; up; up--) {
			parts.unshift("..")
		}
	}
	return parts
}
