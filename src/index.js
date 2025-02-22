import Visualizer from "./visualizer.js";

const visualizer = new Visualizer(document.getElementById("canvas"), document.getElementById("rms"));


const timeBaseSlider = document.getElementById("timebase");
const gainSlider = document.getElementById("gain");
const lowPassSlider = document.getElementById("lowpass");
const highPassSlider = document.getElementById("highpass");
const thresholdSlider = document.getElementById("threshold");
const smoothingSlider = document.getElementById("smoothing");

visualizer.setLowPassCutoff(lowPassSlider.value);
visualizer.setHighPassCutoff(highPassSlider.value);
visualizer.setSmoothingLevel(smoothingSlider.value);
visualizer.setTimeBase(timeBaseSlider.value);
visualizer.setGain(gainSlider.value);
visualizer.setThreshld(thresholdSlider.value);

visualizer.start();

timeBaseSlider.addEventListener("input", (event) => {
  document.getElementById("timeBaseValue").innerHTML = Number.parseFloat(event.target.value).toFixed(1);

  visualizer.setTimeBase(event.target.value);
});

gainSlider.addEventListener("input", (event) => {
  document.getElementById("gainValue").innerHTML = parseInt(event.target.value * 100);

  visualizer.setGain(event.target.value);
});

const lowPassOnInput = () => {
  if (lowPassSlider.value >= 1000) {
    document.getElementById("lowPassValue").innerHTML = Number.parseFloat(lowPassSlider.value / 1000).toFixed(2) + " k";
  } else {
    document.getElementById("lowPassValue").innerHTML = lowPassSlider.value;
  }

  if (+lowPassSlider.value < +highPassSlider.value) {
    highPassSlider.value = lowPassSlider.value;
    highPassOnInput();
  }

  visualizer.setLowPassCutoff(event.target.value);
};

lowPassSlider.addEventListener("input", lowPassOnInput);

const highPassOnInput = () => {
  if (highPassSlider.value >= 1000) {
    document.getElementById("highPassValue").innerHTML = Number.parseFloat(highPassSlider.value / 1000).toFixed(2) + " k";
  } else {
    document.getElementById("highPassValue").innerHTML = highPassSlider.value;
  }

  if (+event.target.value > +lowPassSlider.value) {
    lowPassSlider.value = event.target.value;
    lowPassOnInput();
  }

  visualizer.setHighPassCutoff(event.target.value);
};

highPassSlider.addEventListener("input", highPassOnInput);

thresholdSlider.addEventListener("input", (event) => {
  visualizer.setThreshld(event.target.value);
});

smoothingSlider.addEventListener("input", (event) => {
  document.getElementById("smoothingValue").innerHTML = event.target.value;

  visualizer.setSmoothingLevel(event.target.value);
});


// audioInputSelect.addEventListener("onchange", (event) => {
//   console.log(event.target.value);
// });
