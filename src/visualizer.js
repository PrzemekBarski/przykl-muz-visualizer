export default class Visualizer {
  audioContext = new AudioContext();
  smoothingIteration = 0;
  smoothingLevel = 1;
  gain = 0.5;


  constructor(canvas, rmsSlider) {
    this.canvas = canvas;
    this.rmsSlider = rmsSlider;
    this.c = this.canvas.getContext("2d");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.vp = this.canvas.height / 768;
    this.rmsSlider = rmsSlider;

    let pixelRatio = this.canvas.width / this.canvas.height;

    let sizeOnScreen = this.canvas.getBoundingClientRect();
    this.canvas.width = sizeOnScreen.width * pixelRatio;
    this.canvas.height = sizeOnScreen.height * pixelRatio;
    this.canvas.style.width = this.canvas.width / pixelRatio + "px";
    this.canvas.style.height = this.canvas.height / pixelRatio + "px";

    this.initAudioNodes();

    console.log(this.audioContext.baseLatency);
    console.log(this.audioContext);
  }

  start() {
    this.initCanvas();
    this.initRmsTracking();
    this.routeAudio();
    this.draw();
  }

  setTimeBase(timeBaseMs) {
    this.timeBase = timeBaseMs / 1000;
  }

  setSmoothingLevel(smoothingLevel) {
    this.smoothingIteration = 0;
    this.smoothingLevel = smoothingLevel;
  }

  setGain(gain) {
    this.gain = gain;
    this.gainNode.gain.setValueAtTime(this.gain, this.audioContext.currentTime);
    console.log(parseFloat(this.gain));
  }

  setLowPassCutoff(lowPassCutoff) {
    this.lowPassFilter.frequency.setValueAtTime(lowPassCutoff, this.audioContext.currentTime);
  }

  setHighPassCutoff(highPassCutoff) {
    this.highPassFilter.frequency.setValueAtTime(highPassCutoff, this.audioContext.currentTime);
  }

  setThreshld(threshold) {
    this.threshold = threshold;
  }

  initCanvas() {
    this.c.fillStyle = "#000";
    this.c.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.c.shadowColor = "#33ee55";
    this.c.shadowBlur = 20 * this.vp;
    this.c.shadowOffsetX = 0;
    this.c.shadowOffsetY = 0;

    this.c.strokeStyle = "#33ee55";
    this.c.lineWidth = 12 * this.vp;
    this.c.beginPath();
    this.c.moveTo(0, this.canvas.height / 2);
    this.c.lineTo(this.canvas.width, this.canvas.height / 2);
    this.c.stroke();
  }

  flicker(opacity, counter = 0) {
    if (counter < 5) {
      setTimeout(() => {
        this.canvas.style.opacity = opacity;
        this.flicker(opacity ? 0 : 1, counter + 1);
      }, 50 + Math.random() * 50);
    }
  }

  initRmsTracking() {
    this.rmsAnalyser = this.audioContext.createAnalyser();
    let rmsDataArray = new Uint8Array(this.rmsAnalyser.frequencyBinCount);

    let logoTimeout,
      scopeTimeout,
      scopeOn = true,
      logoWait = false,
      scopeWait = false;

    setInterval(() => {
      // Time domain values
      this.rmsAnalyser.getByteTimeDomainData(rmsDataArray);
      // Get the RMS value as a value of intensity (envelope)
      let rms = Math.sqrt(
        rmsDataArray.reduce(function (acc, val) {
          return acc + Math.pow((val - 128) / 128, 2);
        }, 0) / rmsDataArray.length
      );

      this.rmsSlider.value = rms;

      if (rms < this.threshold) {
        clearTimeout(scopeTimeout);
        scopeWait = false;

        if (scopeOn && !logoWait) {
          logoWait = true;
          logoTimeout = setTimeout(() => {
            this.flicker(0);
            scopeOn = false;
            logoWait = false;
          }, 800);
        }
      } else {
        clearTimeout(logoTimeout);
        logoWait = false;

        if (!scopeOn && !scopeWait) {
          scopeWait = true;
          scopeTimeout = setTimeout(() => {
            this.flicker(1);
            scopeOn = true;
            scopeWait = false;
          }, 50);
        }
      }
    }, 50);
  }

  initAudioNodes() {
    // ANALYSER
    // ---------

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 1;

    this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
    this.previousData = new Float32Array(this.analyser.frequencyBinCount);
    this.dataToDraw = new Float32Array(this.analyser.frequencyBinCount);


    // GAIN
    // 

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(this.gain, this.audioContext.currentTime);

    // LOW PASS FILTER
    // ---------

    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = "lowpass";


    // HIGH PASS FILTER
    // ---------

    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = "highpass";


    // AUDIO PLAYER
    // --------------

    // const audioElement = document.getElementById("audio");
    // audioElement.onplay = () => this.audioContext.resume();
    // this.audioPlayer = this.audioContext.createMediaElementSource(audioElement);

  }

  routeAudio() {
    // this.audioPlayer.connect(this.audioContext.destination);
    // this.audioPlayer.connect(this.gainNode);
    // this.audioPlayer.connect(this.rmsAnalyser);
    // this.gainNode.connect(this.lowPassFilter);
    // this.lowPassFilter.connect(this.highPassFilter);
    // this.highPassFilter.connect(this.analyser);

    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({"audio": true}).then((stream) => {

        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(this.rmsAnalyser);
        this.microphone.connect(this.gainNode);
        this.gainNode.connect(this.lowPassFilter);
        this.lowPassFilter.connect(this.highPassFilter);
        this.highPassFilter.connect(this.analyser);
      }).catch((err) => {
        console.error(err, err.stack);
      });
    }
  }

  draw() {
    let segmentWidth;

    if (this.smoothingLevel > 1) {
      if (this.smoothingIteration == this.smoothingLevel - 1) {
        this.previousData = [...this.dataArray];
        this.analyser.getFloatTimeDomainData(this.dataArray);
        this.smoothingIteration = 0;
      }

      this.dataToDraw = this.dataArray.map((el, index) => {
        // return (this.previousData[index] * (this.smoothingLevel - this.smoothingIteration) + el * this.smoothingIteration) / this.smoothingLevel;
        return (this.previousData[index] * Math.pow(this.smoothingLevel - this.smoothingIteration, 2) + el * Math.pow(this.smoothingIteration, 2)) / (Math.pow(this.smoothingLevel - this.smoothingIteration, 2) + Math.pow(this.smoothingIteration, 2));
      });
    } else {
      this.analyser.getFloatTimeDomainData(this.dataToDraw);
    }

    let length = this.audioContext.sampleRate * this.timeBase;
    segmentWidth = this.canvas.width / length;
    this.c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.c.beginPath();

    this.c.moveTo(this.canvas.width * -2, this.canvas.height / 2);

    let x = 0;

    for (let i = 1; i < length; i += 1) {
      x = i * segmentWidth;
      let v = this.dataToDraw[i] + 0.5;
      let y = v * this.canvas.height;
      this.c.lineTo(x, y);
    }

    this.c.lineTo(this.canvas.width * 2, this.canvas.height / 2);
    this.c.stroke();

    this.smoothingIteration += 1;
    requestAnimationFrame(this.draw.bind(this));
  }
}
