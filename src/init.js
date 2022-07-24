let params = new URLSearchParams(location.hash.replace("#", ""));
let editorWnd;
let presetInput;
if(params.has("code"))
{
	let filename = "tmp";
	if(params.has("ext"))
	{
		filename += ".";
		filename += params.get("ext");
	}
	editorWnd = createEditor(fsRoot.getChild("tmp").addFile(filename, params.get("code")));
	if(params.has("run"))
	{
		cwd = "/tmp";
		presetInput = params.get("run") + " " + filename;
	}
}
let terminalWnd = createTerminal();
if(editorWnd)
{
	desktop_duelwield(editorWnd, terminalWnd);
}
if(presetInput)
{
	setInput(presetInput);
	executeCommand();
}
