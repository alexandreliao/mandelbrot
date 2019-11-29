let rust;
let mandelbrot;

self.onmessage = message => {
  if (rust === undefined) {
    
    let importObject = {
      "__wbindgen_anyref_xform__": {
        "__wbindgen_anyref_table_grow": (delta) => { 0 },
        "__wbindgen_anyref_table_set_null": (idx) => {}
      },
      "__wbindgen_placeholder__": {
        "__wbindgen_describe": (v) => {},
        "__wbindgen_throw": (ptr, len) => {}
      }
    };
    let utf8decoder = new TextDecoder();
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

const main = (rust, message) => {
  const [top, left, width, height, renderWidth, renderHeight, iterations, interlaceCount] = message.data;
  
  if (mandelbrot === undefined) {
    mandelbrot = rust.mandelbrot_new(renderWidth, renderHeight);
  } else {
    rust.mandelbrot_set_render_size(mandelbrot, renderWidth, renderHeight);
  }
  
  rust.mandelbrot_clear(mandelbrot);
  
  let colors = rust.mandelbrot_colors(mandelbrot);
  
  for (let i = 0; i < interlaceCount; i++) {
    rust.mandelbrot_draw(mandelbrot, top, left, width, height, iterations, interlaceCount, i);
    
    let data = new Uint8ClampedArray(
      rust.memory.buffer,
      colors,
      4 * renderWidth * renderHeight
    );
    
    postMessage([data.slice(), i === interlaceCount - 1]);
  }
}
