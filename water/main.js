// water/main.js

// PERFORMANCE TEST
// let N = 5000;
// let s = 128*2;
// let testA = new Float32Array(s * s);
//
// let starttest = performance.now();
// for (let n = 0; n < N; n++) {
//     for (let y = 0; y < s; y++) {
//         let yw = y * s;
//         for (let x = 0; x < s; x++) {
//             let i = x + yw;
//             let a = testA[i];
//             a++;
//             a++;
//             a++;
//             a++;
//             a++;
//             testA[i] = a;
//             // testA[i]++;
//             // testA[i]++;
//             // testA[i]++;
//             // testA[i]++;
//             // testA[i]++;
//             // testA[i]++;
//             // testA[i]++;
//             // testA[i]++;
//         }
//     }
// }
// let endtest = performance.now();
// console.log((endtest - starttest) / N + "ms");


function setup() {

    let sizeRange = document.getElementById("size-range");
    let sizeLabel = document.getElementById("size-label");
    let viscRange = document.getElementById("visc-range");
    let viscLabel = document.getElementById("visc-label");
    let desktopControls = document.getElementById("desktopcontrols");
    let mobileControls = document.getElementById("mobilecontrols");
    let renderWrapper = document.getElementById("render-wrapper");

    let mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    this.simulationTime = new Float32Array(60);
    this.renderTime = new Float32Array(60);
    this.frame = 0;
    this.lastFrameTime = performance.now();
    this.stepsToSimulate = 0;
    this.speedSound = 2; // (m/s) Assume simulation width = 1 meter

    this.deltaU = 0.0001;
    this.interactMode = document.querySelector('input[name="interactmode-radio"]:checked').value;
    this.drawing = false;
    this.mPos = new PIXI.Point(0, 0);
    this.mPosPrev = new PIXI.Point(0, 0);

    this.colorscale = 1.0 / this.deltaU / 10;
    this.rendermode = document.querySelector('input[name="rendermode-radio"]:checked').value;


    this.fluidGrid = new WaterSim(Number(sizeRange.value), Number(sizeRange.value), Number(viscRange.value));
    this.fluidGraphics = new PIXI.Graphics();

    {
        let xarr = [];
        let yarr = [];
        for (let x = 22; x <= 42; x++) {
        // for (let x = 1; x <= 63; x++) {
            for (let y = 22; y <= 42; y++) {
            // for (let y = 1; y <= 63; y++) {
                xarr.push(x);
                yarr.push(y);
            }
        }
        this.fluidGrid.fillall(xarr, yarr);
    }

    // Hide certain controls
    if (mobile) {
        desktopControls.style.display = "none";
    } else {
        mobileControls.style.display = "none";
    }

    // Resize renderer on window resize
    let resize = () => {
        let width = renderWrapper.clientWidth;
        let height = renderWrapper.clientHeight;

        let lesser = Math.max(Math.min(width, height), 1);
        app.renderer.resize(lesser, lesser);

        this.gridscale = lesser / Math.max(this.fluidGrid.width, this.fluidGrid.height);
        this.fluidGraphics.x = 0;
        this.fluidGraphics.y = this.fluidGrid.height * this.gridscale;
        this.fluidGraphics.scale.x = this.gridscale;
        this.fluidGraphics.scale.y = -this.gridscale;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('fullscreen', resize);

    // Radio button controls
    document.getElementsByName("interactmode-radio").forEach((element) => {
        element.onclick = element.ontouchstart = () => {
            this.interactMode = element.value;
        }
    });

    document.getElementsByName("rendermode-radio").forEach((element) => {
        element.onclick = element.ontouchstart = () => {
            this.rendermode = element.value;
        }
    });

    // Slider controls
    viscRange.oninput = () => {
        let value = viscRange.value;
        this.fluidGrid.setViscosity(Number(value));
        viscLabel.innerText = "Viscosity (" + parseFloat(value).toFixed(3) + ")";
    };
    sizeRange.oninput = () => {
        let value = sizeRange.value;
        sizeLabel.innerText = "Grid size (" + value + "x" + value + ")";
        this.fluidGrid = new WaterSim(Number(value), Number(value), this.fluidGrid.viscosity());
        resize();
    };

    // Simulation interactivity
    this.fluidGraphics.interactive = true;
    let trackPosition = (e) => {
        let pos = e.data.getLocalPosition(this.fluidGraphics);
        this.mPos = {x: pos.x, y: pos.y};
    };
    let updateInteractMode = (e) => {
        if (e.data.buttons === 2) {
            let mx = Math.floor(this.mPos.x);
            let my = Math.floor(this.mPos.y);
            this.interactMode = !this.fluidGrid.obst(mx, my) ? "draw" : "erase";
            this.drawing = true;
        } else if (e.data.buttons === 1) {
            let mx = Math.floor(this.mPos.x);
            let my = Math.floor(this.mPos.y);
            this.interactMode = this.fluidGrid.isfluid(mx, my) ? "drag" : "fill";
            this.drawing = true;
        }
    };
    this.fluidGraphics.on('pointermove', trackPosition);
    this.fluidGraphics.on('pointerdown', trackPosition);
    this.fluidGraphics.on('pointerdown', () => { this.drawing = true; });
    this.fluidGraphics.on('mousedown', updateInteractMode);
    this.fluidGraphics.on('rightdown', updateInteractMode);
    this.fluidGraphics.on('pointerup', () => { this.drawing = false; });
    this.fluidGraphics.on('pointerupoutside', () => { this.drawing = false; });

    app.stage.addChild(this.fluidGraphics);
}

function update() {
    let now = performance.now();
    let delta = now - this.lastFrameTime;

    // User interaction
    let w = 0.1;
    this.mPosPrev = {
        x: this.mPosPrev.x * (1 - w) + this.mPos.x * w,
        y: this.mPosPrev.y * (1 - w) + this.mPos.y * w
    };

    let mx = Math.floor(this.mPos.x);
    let my = Math.floor(this.mPos.y);
    if (this.drawing && !(mx < 0 || mx >= this.fluidGrid.width || my < 0 || my >= this.fluidGrid.height)) {
        switch (this.interactMode) {
            case "draw":
                this.fluidGrid.setObst(mx, my, true);
                break;
            case "erase":
                if (this.fluidGrid.isfluid(mx, my))
                    this.fluidGrid.empty(mx, my);
                else
                    this.fluidGrid.setObst(mx, my, false);
                break;
            case "fill":
                this.fluidGrid.fill(mx, my);
                break;
            case "drag":
                let dMPos = [(this.mPos.x - this.mPosPrev.x) / this.fluidGrid.width, (this.mPos.y - this.mPosPrev.y) / this.fluidGrid.width];
                let d = this.fluidGrid.rho(mx, my) * this.deltaU * (Math.sqrt(dot(dMPos, dMPos)) + 0.1) * this.speedSound * (this.fluidGrid.width / 50.);
                let dr = scale(norm(dMPos), d);
                this.fluidGrid.drag(mx, my, dr);
                break;
            default:
                break;
        }
    }

    // Run simulation
    let startTime = performance.now();
    this.stepsToSimulate += this.speedSound * this.fluidGrid.width * (delta / 1000.0);
    let steps = Math.min(Math.floor(this.stepsToSimulate), 20);
    if (steps > 0) {
        this.fluidGrid.simulate(steps);
        this.stepsToSimulate -= steps;
        // DEBUG
        // console.log(this.fluidGrid.n(mx, my)[0] + ", " + this.fluidGrid.n(mx, my)[1]);
        // console.log(this.fluidGrid.u(mx, my)[0] + ", " + this.fluidGrid.u(mx, my)[1]);
        // console.log(this.fluidGrid.eps(mx, my));
        console.log(this.fluidGrid.mass(mx, my));
        // console.log(this.fluidGrid.rho(mx, my));
    }
    this.simulationTime[this.frame % 60] = performance.now() - startTime;

    // Draw graphics
    startTime = performance.now();
    // if (steps > 0)
    drawSimulation();
    this.renderTime[this.frame % 60] = performance.now() - startTime;

    // Performance stats
    if (this.frame % 300 === 0) {
        let simMS = avg(this.simulationTime);
        let renMS = avg(this.renderTime);
        document.getElementById("simulationTime").innerText = "" + simMS.toFixed(1) + " ms/" + renMS.toFixed(1) + "ms";
    }
    this.lastFrameTime = now;
    this.frame++;

    // Request next frame
    requestAnimationFrame(update);
}

function drawSimulation() {
    this.fluidGraphics.clear();

    // Draw background
    this.fluidGraphics.beginFill(0x111111);
    this.fluidGraphics.drawRect(0, 0, this.fluidGrid.width, this.fluidGrid.height);
    this.fluidGraphics.endFill();

    let getValue;
    switch (this.rendermode) {
        default:
        case "density":
            getValue = (x, y) => {return (this.fluidGrid.rho(x, y) - 1) * this.colorscale};
            break;
        case "curl":
            getValue = (x, y) => {return this.fluidGrid.curl(x, y) * this.colorscale};
            break;
        case "speed":
            getValue = (x, y) => {
                let u = this.fluidGrid.u(x, y);
                return (Math.sqrt(u[0] * u[0] + u[1] * u[1])) * this.colorscale - 0.5;
            };
            break;
    }

    // Draw obstacles and fluid densities
    for (let x = 0; x < this.fluidGrid.width; x++) {
        for (let y = 0; y < this.fluidGrid.height; y++) {
            this.fluidGraphics.lineStyle(0);
            if (this.fluidGrid.obst(x, y)) {
                this.fluidGraphics.beginFill(0xeeeeee);
                this.fluidGraphics.drawRect(x, y, 1, 1);
                this.fluidGraphics.endFill();
            } else if (this.fluidGrid.isfluid(x, y)) {
                let value = this.fluidGrid.mass(x, y) - 1 + getValue(x, y);
                // if (this.fluidGrid.type(x, y) === 2) value = this.fluidGrid.interftype(x, y) - 1;
                let color = rgb2hex(colormap(sigmoid(value), colors.jet));

                this.fluidGraphics.beginFill(color);
                this.fluidGraphics.drawRect(x, y, 1, 1);
                this.fluidGraphics.endFill();
            }
        }
    }
}

setup();
update();