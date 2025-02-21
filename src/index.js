let pixelRatio, sizeOnScreen, segmentWidth, vp, timeBase;

// navigator.getUserMedia = navigator.getUserMedia
//                       || navigator.webkitGetUserMedia
//                       || navigator.mozGetUserMedia;

const timeBaseSlider = document.getElementById("frequency"),
  gainSlider = document.getElementById("gain"),
  lowPassSlider = document.getElementById("lowpass"),
  highPassSlider = document.getElementById("highpass"),
  thresholdSlider = document.getElementById("threshold"),
  rmsSlider = document.getElementById("rms"),
  smoothingSlider = document.getElementById("smoothing"),
  audioInputSelect = document.getElementById("audioSource");

timeBase = timeBaseSlider.value / 1000;

const canvas = document.getElementById("canvas"),
  c = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
pixelRatio = canvas.width / canvas.height;
vp = canvas.height / 768;
sizeOnScreen = canvas.getBoundingClientRect();
canvas.width = sizeOnScreen.width * pixelRatio;
canvas.height = sizeOnScreen.height * pixelRatio;
canvas.style.width = canvas.width / pixelRatio + "px";
canvas.style.height = canvas.height / pixelRatio + "px";

c.fillStyle = "#000";
c.fillRect(0, 0, canvas.width, canvas.height);

c.shadowColor = "#33ee55";
c.shadowBlur = 20 * vp;
c.shadowOffsetX = 0;
c.shadowOffsetY = 0;

c.strokeStyle = "#33ee55";
c.lineWidth = 12 * vp;
c.beginPath();
c.moveTo(0, canvas.height / 2);
c.lineTo(canvas.width, canvas.height / 2);
c.stroke();



const audioContext = new AudioContext();

const flicker = (opacity, counter = 0) => {

  if (counter < 5) {
    setTimeout(() => {
      canvas.style.opacity = opacity;
      console.log(counter);
      flicker(opacity ? 0 : 1, counter + 1);
    }, 50 + Math.random() * 50);
  }
};

// GATE
// ---------

const rmsAnalyser = audioContext.createAnalyser();
let rmsDataArray = new Uint8Array(rmsAnalyser.frequencyBinCount);

let logoTimeout,
  scopeTimeout,
  scopeOn = true,
  logoWait = false,
  scopeWait = false,
  threshold = thresholdSlider.value;

setInterval(function () {
  // Time domain values
  rmsAnalyser.getByteTimeDomainData(rmsDataArray);

  // Get the RMS value as a value of intensity (envelope)
  let rms = Math.sqrt(
    rmsDataArray.reduce(function (acc, val) {
      return acc + Math.pow((val - 128) / 128, 2);
    }, 0) / rmsDataArray.length
  );

  rmsSlider.value = rms;

  if (rms < threshold) {
    clearTimeout(scopeTimeout);
    scopeWait = false;

    if (scopeOn && !logoWait) {
      logoWait = true;
      logoTimeout = setTimeout(() => {
        console.log("off");
        flicker(0);
        scopeOn = false;
        logoWait = false;
      }, 1000);
    }
  } else {
    clearTimeout(logoTimeout);
    logoWait = false;

    if (!scopeOn && !scopeWait) {
      scopeWait = true;
      scopeTimeout = setTimeout(() => {
        console.log("on");
        flicker(1);
        scopeOn = true;
        scopeWait = false;
      }, 1000);
    }
  }
}, 50);


// ANALYSER
// ---------

const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 1;

let dataArray = new Uint8Array(analyser.frequencyBinCount);
let previousData = new Uint8Array(analyser.frequencyBinCount);
let dataToDraw = new Uint8Array(analyser.frequencyBinCount);


// LOW PASS FILTER
// ---------

const lowPassFilter = audioContext.createBiquadFilter();
lowPassFilter.type = "lowpass";
lowPassFilter.frequency.setValueAtTime(lowPassSlider.value, audioContext.currentTime);


// HIGH PASS FILTER
// ---------

const highPassFilter = audioContext.createBiquadFilter();
highPassFilter.type = "highpass";
highPassFilter.frequency.setValueAtTime(highPassSlider.value, audioContext.currentTime);


// AUDIO PLAYER
// --------------

// const audioElement = document.getElementById("audio");
// audioElement.onplay = () => audioContext.resume();
// let source = audioContext.createMediaElementSource(audioElement);

// source.connect(audioContext.destination);


// MIC
// --------------

if (navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({"audio": true}).then((stream) => {

    const microphone = audioContext.createMediaStreamSource(stream);

    microphone.connect(lowPassFilter);
    microphone.connect(rmsAnalyser);
    lowPassFilter.connect(highPassFilter);
    highPassFilter.connect(analyser);
  }).catch((err) => {
    console.err(err);
  });
}


// DRAW SIGNAL
// --------------

let iterations = 1;
let iteration = 0;
let gain = 0.5;

const draw = () => {
  if (iterations > 1) {
    if (iteration == iterations - 1) {
      previousData = [...dataArray];
      analyser.getByteTimeDomainData(dataArray);
      iteration = 0;
    }

    dataToDraw = dataArray.map((el, index) => {
      // return (previousData[index] * (iterations - iteration) + el * iteration) / iterations;
      return (previousData[index] * Math.pow(iterations - iteration, 2) + el * Math.pow(iteration, 2)) / (Math.pow(iterations - iteration, 2) + Math.pow(iteration, 2));
    });
  } else {
    analyser.getByteTimeDomainData(dataToDraw);
  }

  let length = audioContext.sampleRate * timeBase;
  segmentWidth = canvas.width / length;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.beginPath();

  c.moveTo(canvas.width * -2, canvas.height / 2);

  let x = 0;

  for (let i = 1; i < length; i += 1) {
    x = i * segmentWidth;
    let v = ((dataToDraw[i] - 128) * gain + 128) / 128.0;
    let y = (v * canvas.height) / 2;
    c.lineTo(x, y);
  }

  c.lineTo(canvas.width * 2, canvas.height / 2);
  c.stroke();

  iteration += 1;
  requestAnimationFrame(draw);
};

draw();


timeBaseSlider.addEventListener("input", (event) => {
  document.getElementById("timeBaseValue").innerHTML = Number.parseFloat(event.target.value).toFixed(2);

  timeBase = event.target.value / 1000;
});

gainSlider.addEventListener("input", (event) => {
  document.getElementById("gainValue").innerHTML = parseInt(event.target.value * 100);

  gain = event.target.value;
});

lowPassSlider.addEventListener("input", (event) => {

  if (event.target.value >= 1000) {
    document.getElementById("lowPassValue").innerHTML = Number.parseFloat(event.target.value / 1000).toFixed(2) + " k";
  } else {
    document.getElementById("lowPassValue").innerHTML = event.target.value;
  }

  lowPassFilter.frequency.setValueAtTime(event.target.value, audioContext.currentTime);
});

highPassSlider.addEventListener("input", (event) => {

  if (event.target.value >= 1000) {
    document.getElementById("highPassValue").innerHTML = Number.parseFloat(event.target.value / 1000).toFixed(2) + " k";
  } else {
    document.getElementById("highPassValue").innerHTML = event.target.value;
  }

  highPassFilter.frequency.setValueAtTime(event.target.value, audioContext.currentTime);
});

thresholdSlider.addEventListener("input", (event) => {
  threshold = event.target.value;
  console.log(threshold);
});

smoothingSlider.addEventListener("input", (event) => {
  document.getElementById("smoothingValue").innerHTML = event.target.value;

  iteration = 0;
  iterations = event.target.value;
});


audioInputSelect.addEventListener("onchange", (event) => {
  console.log(event.target.value);
});
