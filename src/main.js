// main.js

function setup() {

    let sizeRange = document.getElementById("size-range");
    let viscRange = document.getElementById("visc-range");
    this.fluidGrid = new FluidSim(Number(sizeRange.value), Number(sizeRange.value), Number(viscRange.value));

    this.simulationTime = [];

    this.deltaU = 0.0001;
    this.colorscale = 1 / this.deltaU;
    this.vectorscale = this.colorscale * 1;
    this.rendermode = "density";

    this.fluidGraphics = new PIXI.Graphics();
    this.fluidGraphics.scale.y = -1;


    // Resize renderer on window resize
    let resize = () => {
        let width = document.getElementById("render-wrapper").clientWidth;
        let height = document.getElementById("render-wrapper").clientHeight;
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


    let mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Button controls
    document.getElementsByName("drawmode-radio").forEach((element) => {
        element.oninput = () => {
            this.drawmode = Number(element.value);
        }
    });

    document.getElementsByName("rendermode-radio").forEach((element) => {
        element.oninput = () => {
            this.rendermode = element.value;
        }
    });

    // Slider controls
    document.getElementById("visc-range").oninput = () => {
        let value = document.getElementById("visc-range").value;
        this.fluidGrid.setViscosity(Number(value));
        document.getElementById("visc-label").innerText = "Viscosity (" + parseFloat(value).toFixed(3) + ")";
    };
    document.getElementById("size-range").oninput = () => {
        let value = document.getElementById("size-range").value;
        document.getElementById("size-label").innerText = "Grid size (" + value + "x" + value + ")";
        this.fluidGrid = new FluidSim(Number(value), Number(value), this.fluidGrid.viscosity());
        resize();
    };

    // Enable/disable mobile controls
    if (mobile) {
        document.getElementById("desktopcontrols").style.display = "none";
    } else {
        document.getElementById("mobilecontrols").style.display = "none";
    }

    app.stage.addChild(this.fluidGraphics);

    this.drawmode = 3;
    this.drawing = false;
    this.mPos = new PIXI.Point(0, 0);
    this.mPosPrev = new PIXI.Point(0, 0);

    this.fluidGraphics.interactive = true;
    let trackPosition = (e) => {
        let pos = e.data.getLocalPosition(this.fluidGraphics);
        let w = 0.1;
        this.mPosPrev = {
            x: this.mPosPrev.x * (1 - w) + this.mPos.x * w,
            y: this.mPosPrev.y * (1 - w) + this.mPos.y * w
        };
        this.mPos = {x: pos.x, y: pos.y};
    };
    let updateDrawmode = (e) => {
        console.log(e.data.buttons);
        if (e.data.buttons === 2) {
            let mx = Math.floor(this.mPos.x);
            let my = Math.floor(this.mPos.y);
            this.drawmode = this.fluidGrid.obst(mx, my) === 0 ? 1 : 2;
            this.drawing = true;
        } else if (e.data.buttons === 1) {
            this.drawmode = 3;
            this.drawing = true;
        }
    };
    this.fluidGraphics.on('pointermove', trackPosition);
    this.fluidGraphics.on('pointerdown', trackPosition);
    this.fluidGraphics.on('pointerdown', () => { this.drawing = true; });
    this.fluidGraphics.on('mousedown', updateDrawmode);
    this.fluidGraphics.on('rightdown', updateDrawmode);
    this.fluidGraphics.on('pointerup', () => { this.drawing = false; });
    this.fluidGraphics.on('pointerupoutside', () => { this.drawing = false; });
}

let frame = 0;

let lv = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

function update() {
    requestAnimationFrame(update);

    // User interaction
    let mx = Math.floor(this.mPos.x);
    let my = Math.floor(this.mPos.y);
    if (this.drawing && !(mx < 0 || mx >= this.fluidGrid.width || my < 0 || my >= this.fluidGrid.height)) {
        if (this.drawmode === 1) {
            this.fluidGrid.setObst(mx, my, 1);
        }
        else if (this.drawmode === 2) {
            this.fluidGrid.setObst(mx, my, 0);
        }
        else if (this.drawmode === 3) {
            let dr = scale(norm([this.mPos.x - this.mPosPrev.x, this.mPos.y - this.mPosPrev.y]), this.deltaU);
            for (let i = 0; i < 9; i++)
                this.fluidGrid.df[(mx + my * this.fluidGrid.width) * 9 + i] += dot(lv[i], dr);
        }
    }

    // Run simulation
    let startTime = new Date().getTime();
    this.fluidGrid.simulate(1);
    let simulationTime = new Date().getTime() - startTime;
    this.simulationTime.push(simulationTime);

    if (frame % 60 === 0 || sum(this.simulationTime) > 1000) {
        let ms = avg(this.simulationTime);
        document.getElementById("simulationTime").innerText = "" + ms.toFixed(1) + " ms (" + (1000. / ms).toFixed(0) + " ups)";
        this.simulationTime = [];
    }
    frame = frame + 1;

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
            } else {
                let value = getValue(x, y);
                let bright = 0.9;

                this.fluidGraphics.beginFill(rbg2hex([0, value * (1 + bright) + bright, -value * (1 + bright) + bright]));
                this.fluidGraphics.drawRect(x, y, 1, 1);
                this.fluidGraphics.endFill();
            }
        }
    }

}

function rbg2hex(rgb) {
    return PIXI.utils.rgb2hex(rgb.map((value) => { return Math.max(Math.min(value, 1), 0) }));
}

console.log("Starting :)");
setup();
update();