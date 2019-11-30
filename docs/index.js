"use strict";

window.onload = () => {
  const canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let ctx = canvas.getContext("2d");
  
  const workerCount = window.navigator.hardwareConcurrency;
  
  const iterations = 1024;
  const interlaceCount = 7;
  
  let x = 0.0;
  let y = 0.0;
  let zoom = 0.5;
  
  let drawBounds = new Rect(0, 0, window.innerWidth, window.innerHeight);
  let zoomBounds = zoomAt(x, y, zoom, window.innerWidth / window.innerHeight);
  
  let history = [[x, y, zoom]];
  
  const drawer = new Drawer(workerCount);
  
  drawer.draw(ctx, drawBounds, zoomBounds, iterations, interlaceCount);
  
  
  window.onresize = () => {
    drawBounds = new Rect(0, 0, window.innerWidth, window.innerHeight);
    zoomBounds = zoomAt(x, y, zoom, window.innerWidth / window.innerHeight);
    
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    
    ctx = canvas.getContext('2d');
    
    drawer.draw(ctx, drawBounds, zoomBounds, iterations, interlaceCount);
  };
  
  window.onclick = e => {
    if (e.which === 1) {
      history.push([x, y, zoom]);
      zoom *= 10;
      x = e.clientX / window.innerWidth * zoomBounds.width + zoomBounds.left;
      y = zoomBounds.top - e.clientY / window.innerHeight * zoomBounds.height;
      
      zoomBounds = zoomAt(x, y, zoom, window.innerWidth / window.innerHeight)
      drawer.draw(ctx, drawBounds, zoomBounds, iterations, interlaceCount);
    }
  };
  
  window.onkeypress = e => {
    if (e.key === "q") {
      if (history.length > 0) {
        [x, y, zoom] = history.pop();
        zoomBounds = zoomAt(x, y, zoom, window.innerWidth / window.innerHeight);
        drawer.draw(ctx, drawBounds, zoomBounds, iterations, interlaceCount);
      }
    } else if (e.key === "e") {
      history.push([x, y, zoom]);
      [x, y, zoom] = [0.0, 0.0, 0.5];
      zoomBounds = zoomAt(x, y, zoom, window.innerWidth / window.innerHeight);
      drawer.draw(ctx, drawBounds, zoomBounds, iterations, interlaceCount);
    } else if ("wasd".includes(e.key)) {
      // do nothing if threads not done working...
      for (let i = 0; i < workerCount; i++) {
        if (drawer.workerBusy[i]) {
          return;
        }
      }
      // this is not ideal...
      
      let currentZoomBounds;
      let currentDrawBounds;
      
      if (e.key === "w") {
        y += zoomBounds.height / 5;
      } else if (e.key === "a") {
        x -= zoomBounds.width / 5;
      } else if (e.key === "s") {
        y -= zoomBounds.height / 5;
      } else if (e.key === "d") {
        x += zoomBounds.width / 5;
      }
      
      history.push([x, y, zoom]);
      
      zoomBounds = zoomAt(x, y, zoom, window.innerWidth / window.innerHeight);
      
      if (e.key === "w") {
        currentZoomBounds = new Rect(
          zoomBounds.top,
          zoomBounds.left,
          zoomBounds.width,
          zoomBounds.height / 5
        );
        currentDrawBounds = new Rect(
          drawBounds.top,
          drawBounds.left,
          drawBounds.width,
          drawBounds.height / 5
        );
        
        const currentImageData = ctx.getImageData(
          0,
          0,
          drawBounds.width,
          drawBounds.height * 4 / 5
        );
        ctx.putImageData(currentImageData, 0, drawBounds.height / 5);
      } else if (e.key === "a") {
        currentZoomBounds = new Rect(
          zoomBounds.top,
          zoomBounds.left,
          zoomBounds.width / 5,
          zoomBounds.height
        );
        currentDrawBounds = new Rect(
          drawBounds.top,
          drawBounds.left,
          drawBounds.width / 5,
          drawBounds.height
        );
        
        const currentImageData = ctx.getImageData(
          0,
          0,
          drawBounds.width * 4 / 5,
          drawBounds.height
        );
        ctx.putImageData(currentImageData, drawBounds.width / 5, 0);
      } else if (e.key === "s") {
        currentZoomBounds = new Rect(
          zoomBounds.top - zoomBounds.height * 4 / 5,
          zoomBounds.left,
          zoomBounds.width,
          zoomBounds.height / 5
        );
        currentDrawBounds = new Rect(
          drawBounds.top + drawBounds.height * 4 / 5,
          drawBounds.left,
          drawBounds.width,
          drawBounds.height / 5
        );
        
        const currentImageData = ctx.getImageData(
          0,
          drawBounds.height / 5,
          drawBounds.width,
          drawBounds.height * 4 / 5
        );
        ctx.putImageData(currentImageData, 0, 0);
      } else if (e.key === "d") {
        currentZoomBounds = new Rect(
          zoomBounds.top,
          zoomBounds.left + zoomBounds.width * 4 / 5,
          zoomBounds.width / 5,
          zoomBounds.height
        );
        currentDrawBounds = new Rect(
          drawBounds.top,
          drawBounds.left + drawBounds.width * 4 / 5,
          drawBounds.width / 5,
          drawBounds.height
        );
        
        const currentImageData = ctx.getImageData(
          drawBounds.width / 5,
          0,
          drawBounds.width * 4 / 5,
          drawBounds.height
        );
        ctx.putImageData(currentImageData, 0, 0);
      }
      
      drawer.draw(ctx, currentDrawBounds, currentZoomBounds, iterations, interlaceCount);
    }
  };
};

function Rect(top, left, width, height) {
  this.top = top;
  this.left = left;
  this.width = width;
  this.height = height;
}

function zoomAt(x, y, zoom, aspectRatio) {
  let widthStretch = 1.0;
  let heightStretch = 1.0;
  
  if (aspectRatio > 1.0) {
    widthStretch = aspectRatio;
  } else {
    heightStretch = 1.0 / aspectRatio;
  }
  
  let width = 2.0 / zoom * widthStretch;
  let height = 2.0 / zoom * heightStretch;
  let top = y + height / 2.0;
  let left = x - width / 2.0;
  
  return new Rect(top, left, width, height);
}

function showHelp() {
  alert(
`Click anywhere to zoom in x10
Press Q to go back
Press E to return to origin
Use WASD to move around

Press J to view/change the fade-in (higher numbers = more responsive)
Press K to view/change the detail level
Press L (that's the letter!) to save/load your coordinates
Press ; to view/change number of threads used`
  );
};

function Drawer(workerCount) {
  this.workerCount = workerCount;
  this.workers = [];
  this.workerBusy = [];
  for (let i = 0; i < workerCount; i++) {
    this.workers.push(new Worker('worker.js'));
    this.workerBusy.push(false);
  }
  
  this.scheduledFrames = [];
  
  this.oldParameters = [];
  this.timestamp;
  this.draw = (context, drawBounds, zoomBounds, iterations, interlaceCount) => {
    // check if anything has changed
    const paramters = [context, drawBounds, zoomBounds, iterations, interlaceCount];
    if (this.oldParameters === paramters) {
      return; // we do nothing if nothing has changed
    }
    this.oldDrawParameters = paramters;
    
    // cancel all pending animation frames
    for (let i = 0; i < this.scheduledFrames.length; i++) {
      window.cancelAnimationFrame(this.scheduledFrames[i]);
    }
    this.scheduledFrames = [];
    
    this.timestamp = performance.now();
    const workerTimestamp = this.timestamp;
    
    const workerRenderHeight = Math.ceil(drawBounds.height / this.workerCount);
    const workerHeight = zoomBounds.height * workerRenderHeight / drawBounds.height;
    
    for (let i = 0; i < this.workerCount; i++) {
      const workerIndex = i;
      
      // kill workers still working
      if (this.workerBusy[workerIndex]) {
        this.workers[i].terminate();
        this.workers[i] = new Worker('worker.js');
        this.workerBusy[i] = false;
      }
      
      // now throw work at them
      const worker = this.workers[workerIndex];
      
      this.workerBusy[workerIndex] = true;
      
      const workerDrawLocation = workerIndex;
      
      worker.onmessage = message => {
        const [array, finishedWorking] = message.data;
        
        this.workerBusy[workerIndex] = !finishedWorking;
        
        const imageData = new ImageData(array, drawBounds.width, workerRenderHeight);
        const frame = window.requestAnimationFrame(
          () => context.putImageData(
            imageData,
            drawBounds.left,
            drawBounds.top + workerDrawLocation * workerRenderHeight
          )
        );
        this.scheduledFrames.push(frame);
      };
      
      worker.postMessage([
        zoomBounds.top - i * workerHeight,
        zoomBounds.left,
        zoomBounds.width,
        workerHeight,
        
        drawBounds.width,
        workerRenderHeight,
        
        iterations,
        interlaceCount
      ], []);
    }
  };
}
