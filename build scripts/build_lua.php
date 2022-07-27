<?php
$clang = "em++ -O3 -flto -x c++ -std=c++20 -fvisibility=hidden -D LUA_USE_LONGJMP";

// Setup folders
if(!is_dir("bin"))
{
	mkdir("bin");
}
if(!is_dir("bin/int"))
{
	mkdir("bin/int");
}

// Find work
$files = [];
foreach(scandir(".") as $file)
{
	if(substr($file, -2) == ".c")
	{
		$name = substr($file, 0, -2);
		if($name != "luac")
		{
			array_push($files, $name);
		}
	}
}

//echo "Compiling...\n";
$objects = [];
foreach($files as $file)
{
	//echo $file."\n";
	//passthru("$clang -c $file.c -o bin/int/$file.o");
	array_push($objects, escapeshellarg("$file.c"));
}

//echo "Linking...\n";
$clang .= " -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME=lua -s EXPORTED_FUNCTIONS=_main,_strcpy,_free -s EXPORTED_RUNTIME_METHODS=[\"FS\",\"cwrap\"] -s FS_DEBUG=1";
//$clang .= " -s LINKABLE=1 -s EXPORT_ALL=1"; // uncomment for debugging
passthru("$clang -o lua.js ".join(" ", $objects));
