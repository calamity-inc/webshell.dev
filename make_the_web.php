<?php
function delTree($dir) // Adapted from https://stackoverflow.com/a/14531691
{ 
	$files = array_diff(scandir($dir), array('.', '..'));

	foreach ($files as $file)
	{
		if(is_dir("$dir/$file"))
		{
			delTree("$dir/$file");
		}
		else
		{
			unlink("$dir/$file");
		}
	}

	return rmdir($dir); 
}

if(!is_dir("web"))
{
	mkdir("web");
}
chdir("web");


if(!is_dir("int"))
{
	mkdir("int");
}
chdir("int");

if(!is_dir("plutolang.github.io"))
{
	passthru("git clone https://github.com/plutolang/plutolang.github.io");
}
chdir("plutolang.github.io");
passthru("git pull");
passthru("npm ci");
passthru("npm run build");
chdir("..");

chdir("..");
if(is_dir("plutolang.github.io"))
{
	delTree("plutolang.github.io");
}
rename("int/plutolang.github.io/build", "plutolang.github.io");
