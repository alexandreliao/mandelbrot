"use strict";

let rust;
let mandelbrot;
let colors;
let oldRenderDimensions;

function main(rust, message) {
  const [top, left, width, height, renderWidth, renderHeight, iterations, interlaceCount] = message.data;
  
  if (mandelbrot === undefined) {
    mandelbrot = rust.mandelbrot_new(renderWidth, renderHeight);
    colors = rust.mandelbrot_colors(mandelbrot);
  } else if (oldRenderDimensions !== [renderWidth, renderHeight]) {
    rust.mandelbrot_set_render_size(mandelbrot, renderWidth, renderHeight);
    colors = rust.mandelbrot_colors(mandelbrot);
    oldRenderDimensions = [renderWidth, renderHeight];
  }
  
  rust.mandelbrot_clear(mandelbrot);
  
  for (let i = 0; i < interlaceCount; i++) {
    rust.mandelbrot_draw(mandelbrot, top, left, width, height, iterations, interlaceCount, i);
    
    const array = new Uint8ClampedArray(
      rust.memory.buffer,
      colors,
      4 * renderWidth * renderHeight
    );
    
    self.postMessage([array, i === interlaceCount - 1], []); // everything else fails
  }
}

self.onmessage = message => {
  if (rust === undefined) {
    const importObject = {
      "__wbindgen_anyref_xform__": {
        "__wbindgen_anyref_table_grow": (delta) => 0,
        "__wbindgen_anyref_table_set_null": (idx) => {}
      },
      "__wbindgen_placeholder__": {
        "__wbindgen_describe": (v) => {},
        "__wbindgen_throw": (ptr, len) => {}
      }
    };
    
    fetch("mandelbrot.wasm")
      .then(resp => resp.arrayBuffer())
      .then(bytes => WebAssembly.instantiate(bytes, importObject))
      .then(wasm => {
        rust = wasm.instance.exports;
        main(rust, message);
      })
      .catch(console.error);
  } else {
    main(rust, message);
  }
};
