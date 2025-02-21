let pixelRatio, sizeOnScreen, segmentWidth, vp, timeBase;

const timeBaseSlider = document.getElementById("frequency"),
  gainSlider = document.getElementById("gain");

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
c.shadowBlur = 16 * vp;
c.shadowOffsetX = 0;
c.shadowOffsetY = 0;

c.strokeStyle = "#33ee55";
c.lineWidth = 12 * vp;
c.beginPath();
c.moveTo(0, canvas.height / 2);
c.lineTo(canvas.width, canvas.height / 2);
c.stroke();

const audioContext = new AudioContext();


// ANALYSER
// ---------

const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 1;

let dataArray = new Uint8Array(analyser.frequencyBinCount);


// FILTER
// ---------

const biquadFilter = audioContext.createBiquadFilter();
biquadFilter.type = "lowpass";
biquadFilter.frequency.setValueAtTime(600, audioContext.currentTime);


// AUDIO PLAYER
// --------------

let audioElement = document.getElementById("audio");
audioElement.onplay = () => audioContext.resume();
let source = audioContext.createMediaElementSource(audioElement);

source.connect(biquadFilter);
source.connect(audioContext.destination);
biquadFilter.connect(analyser);
// analyser.connect(audioContext.destination);


// DRAW SIGNAL
// --------------

const draw = () => {
  let length = audioContext.sampleRate * timeBase;

  analyser.getByteTimeDomainData(dataArray);
  segmentWidth = canvas.width / length;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.beginPath();

  c.moveTo(canvas.width * -2, canvas.height / 2);

  let x = 0;

  for (let i = 1; i < length; i += 1) {
    x = i * segmentWidth;
    let v = dataArray[i] / 128.0;
    let y = (v * canvas.height) / 2;
    c.lineTo(x, y);
  }

  c.lineTo(canvas.width * 2, canvas.height / 2);
  c.stroke();

  requestAnimationFrame(draw);
};

draw();


timeBaseSlider.addEventListener("input", (event) => {
  document.getElementById("timeBaseValue").innerHTML = Number.parseFloat(event.target.value).toFixed(2);

  timeBase = event.target.value / 1000;

  let length = audioContext.sampleRate * timeBase;
  console.log(length);
  console.log(canvas.width / length);
  console.log("----------");
});
