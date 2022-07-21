# webshell.dev

A desktop environment to run C/C++ programs directly in your browser using WASM.

## Compiling Programs

No modification to the source is needed, thanks to the great work done by the Emscripten team.

- Should have `-fvisibility=hidden` to avoid bloat
- Link with `-s EXPORT_NAME=pluto -s WASM=1 -s MODULARIZE=1 -s EXPORTED_FUNCTIONS=_main,_strcpy,_free -s EXPORTED_RUNTIME_METHODS=[\"FS\",\"cwrap\"] -s FS_DEBUG=1` but likely with a different EXPORT_NAME

## Hosting

We need `SharedArrayBuffer`, so the website needs to be hosted over HTTPS, and localhost is not whitelisted from that. Additionaly, the following response headers are needed:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

This completely locks us out from the rest of the internet, so that's why no CDN is used for Ace.js, and the web browser fetches from the "web" folder, but luckily I managed to fit the entire internet in that folder.

Jokes aside, the restrictions for `SharedArrayBuffer` are ridiculous and clearly not very well thought through, but it's really the only way I have to communicate with the worker thread once it enters the program's main.

## Credits

Background image photo by Luca Micheli
