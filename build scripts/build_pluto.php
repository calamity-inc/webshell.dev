<?php
$clang = "em++ -O3 -flto -std=c++17 -fvisibility=hidden -D PLUTO_ILP_ENABLE -D PLUTO_USE_SOUP";

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
foreach(scandir("src/vendor/Soup") as $file)
{
	if(substr($file, -4) == ".cpp")
	{
		$name = substr($file, 0, -4);
		array_push($files, "vendor/Soup/".$name);
	}
}
foreach(scandir("src") as $file)
{
	if(substr($file, -4) == ".cpp")
	{
		$name = substr($file, 0, -4);
		if($name != "luac")
		{
			array_push($files, $name);
		}
	}
}

echo "Compiling...\n";
$objects = [];
foreach($files as $file)
{
	echo $file."\n";
	passthru("$clang -c src/$file.cpp -o bin/int/".basename($file).".o");
	array_push($objects, escapeshellarg("bin/int/".basename($file).".o"));
}

echo "Linking...\n";
$clang .= " -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME=pluto -s EXPORTED_FUNCTIONS=_main,_strcpy,_free -s EXPORTED_RUNTIME_METHODS=[\"FS\",\"cwrap\"] -s FS_DEBUG=1";
//$clang .= " -s LINKABLE=1 -s EXPORT_ALL=1"; // uncomment for debugging
passthru("$clang -o pluto.js ".join(" ", $objects));
