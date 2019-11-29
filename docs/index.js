function BoundingBox(top, left, width, height) {
  this.top = top;
  this.left = left;
  this.width = width;
  this.height = height;
}

const zoomAt = (x, y, zoom, aspectRatio) => {
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
  
  return new BoundingBox(top, left, width, height);
}

window.onload = () => {
  const canvas = document.getElementById("canvas");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  let ctx = canvas.getContext('2d');
  
  let x = 0.;
  let y = 0.;
  let zoom = 0.5;
  let workerCount = window.navigator.hardwareConcurrency;
  let interlaceCount = 7;
  let iterations = 1024;
  let boudingBox = zoomAt(x, y, zoom, innerWidth / innerHeight);
  
  let workers = [];
  let interrupt = false;
  let workersAvailable = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(new Worker('worker.js'));
    workersAvailable.push(true);
  }
  
  let drawJobs = [];
  const draw = () => {
    resetWorkers();
    
    drawJobs.forEach(job => cancelAnimationFrame(job));
    drawJobs = [];
    
    boudingBox = zoomAt(x, y, zoom, innerWidth / innerHeight);
    
    const workerRenderHeight = Math.ceil(innerHeight / workerCount);
    const workerHeight = boudingBox.height * workerRenderHeight / innerHeight;
    
    for (let i = 0; i < workerCount; i++) {
      workersAvailable[i] = false; // I'm using this worker!
      
      const workerNumber = i;
      workers[i].postMessage([
        boudingBox.top - workerNumber * workerHeight,
        boudingBox.left,
        boudingBox.width,
        workerHeight,
        
        innerWidth,
        workerRenderHeight,
        
        iterations,
        interlaceCount
      ]);
      workers[i].onmessage = message => {
        const [buffer, complete] = message.data;
        workersAvailable[workerNumber] = complete;
        const imageData = new ImageData(buffer, innerWidth, workerRenderHeight);
        drawJobs.push(requestAnimationFrame(() => ctx.putImageData(imageData, 0, workerNumber * workerRenderHeight)));
      }
    }
  };
  
  const resetWorkers = () => {
    for (let i = 0; i < workers.length; i++) {
      if (!workersAvailable[i]) {
        workers[i].terminate();
        workers[i] = new Worker('worker.js');
        workersAvailable[i] = true;
      }
    }
  };
  
  window.onresize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    
    ctx = canvas.getContext('2d');
    draw();
  };
  
  let history = [];
  
  window.onclick = e => {
    if (e.which == 1) { // ctrl-click is zoom
      history.push([x, y, zoom]);
      
      zoom *= 10;
      x = e.clientX / innerWidth * boudingBox.width + boudingBox.left;
      y = boudingBox.top - e.clientY / innerHeight * boudingBox.height;
      
      draw();
    }
  };
  
  window.onkeypress = e => {
    if (e.key == "p") {
      history.push([x, y, zoom]);
      x = 0.0;
      y = 0.0;
      zoom = 0.5;
      
      draw();
    } else if (e.key == "o") {
      const message = JSON.stringify([x, y, zoom]);
      let inputString = prompt('[x, y, zoom level]', message);
      if (inputString.charAt(0) != '[') {
        inputString = '[' + inputString + ']';
      }
      const input = JSON.parse(inputString);
      if (
        Array.isArray(input) &&
        input.length == 3 &&
        input.filter((x) => typeof x != 'number').length == 0 &&
        input != message
      ) {
        [x, y, zoom] = input;
        
        draw();
      }
    } else if (e.key == "q") {
      if (history.length > 0) {
        [x, y, zoom] = history.pop();
        
        draw();
      }
    } else if (e.key == "i") {
      const input = JSON.parse(prompt('Iterations', iterations));
      if (typeof input == 'number' && input >= 0 && input != iterations) {
        iterations = input;
        draw();
      }
    } else if (e.key == "e") {
      const input = JSON.parse(prompt('Interlace', interlaceCount));
      if (typeof input == 'number' && input >= 1 && input != interlaceCount) {
        interlaceCount = input;
      }
    } else if (e.key == "t") {
      const input = JSON.parse(prompt('Workers', workerCount));
      if (typeof input == 'number' && input >= 1 && input != workerCount) {
        workerCount = input;
        resetWorkers();
      }
    } else if (e.key == "r") {
      for (let i = 0; i < workers.length; i++) {
        workers[i].terminate();
        workers[i] = new Worker('worker.js');
        workersAvailable[i] = true;
      }
      draw();
    } else if ("wasd".includes(e.key)) {
      history.push([x, y, zoom]);
      if (e.key == "w") {
        y += boudingBox.height / 5.0;
      } else if (e.key == "a") {
        x -= boudingBox.width / 5.0;
      } else if (e.key == "s") {
        y -= boudingBox.height / 5.0;
      } else if (e.key == "d") {
        x += boudingBox.width / 5.0;
      }
      draw();
    } else if (e.key == "h") {
      alert(
`Click anywhere to zoom in x10
Press Q to go back
Press P to return to origin
Use WASD to move around
Press O to view/change your coordinates. You can save your favorite places!
 
Press I to view/change the detail level
Press E to view/change the fade-in (higher numbers = more responsive)`
      );
    }
  };
  
  draw();
}
