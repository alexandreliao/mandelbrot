#!/bin/bash

set -ex

cargo build --target=wasm32-unknown-unknown --release
cp target/wasm32-unknown-unknown/release/mandelbrot.wasm docs/mandelbrot.wasm
(cd docs && python3 -m http.server)

