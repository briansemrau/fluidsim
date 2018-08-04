// main.js

PIXI.loader
//.add("images/some_image.png")
    .load(setup());


function setup() {
    // let sprite = new Sprite(resources["images/some_image.png"].texture);
    // app.stage.addChild(sprite);

    this.fluidGrid = new FluidSim(50, 50);

    this.simulationTime = [];

    this.deltaU = 0.000000001;
    this.colorscale = 1 / this.deltaU;
    this.vectorscale = this.colorscale * 5;

    this.fluidGraphics = new PIXI.Graphics();
    this.fluidGraphics.scale.y = -1;


    // Center renderer on resize
    let resize = () => {
        let width = 600;//document.getElementById("renderer").clientWidth;
        let height = 600;//document.getElementById("renderer").clientHeight;
        let lesser = Math.min(width, height);
        app.renderer.resize(lesser, lesser);
        app.renderer.view.style.left = ((width - app.renderer.width) >> 1) + 'px';
        app.renderer.view.style.top = ((width - app.renderer.height) >> 1) + 'px';

        this.gridscale = lesser / Math.max(this.fluidGrid.width + 2, this.fluidGrid.height + 2);
        this.fluidGraphics.x = this.gridscale;
        this.fluidGraphics.y = this.fluidGrid.height * this.gridscale + this.gridscale;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('fullscreen', resize);


    // Slider controls
    document.getElementById("omega-range").oninput = () => {
        let value = document.getElementById("omega-range").value;
        this.fluidGrid.omega = Number(value);
        document.getElementById("omega-label").innerText = "Viscosity (" + parseFloat(value).toFixed(2) + ")";
    };
    document.getElementById("size-range").oninput = () => {
        let value = document.getElementById("size-range").value;
        document.getElementById("size-label").innerText = "Size (" + value + "x" + value + ")";
        this.fluidGrid = new FluidSim(Number(value), Number(value));
        resize();
    };


    app.stage.addChild(this.fluidGraphics);

    this.drawmode = 0;
    this.mPos = new PIXI.Point(0, 0);
    this.mPosPrev = new PIXI.Point(0, 0);

    this.fluidGraphics.interactive = true;
    this.fluidGraphics.on('pointermove', (e) => {
        let pos = e.data.getLocalPosition(this.fluidGraphics);
        let w = 0.9;
        this.mPosPrev = {
            x: this.mPosPrev.x * (1 - w) + this.mPos.x * w,
            y: this.mPosPrev.y * (1 - w) + this.mPos.y * w
        };
        this.mPos = {x: pos.x, y: pos.y};
    });
    this.fluidGraphics.on('pointerdown', (e) => {
        if (e.data.buttons === 1) {
            let mx = Math.floor(this.mPos.x / this.gridscale);
            let my = Math.floor(this.mPos.y / this.gridscale);
            this.drawmode = this.fluidGrid.bound[this.fluidGrid.i(mx, my)] === false ? 1 : 2;
        } else if (e.data.buttons === 2) {
            this.drawmode = 3;
        }
    });
    this.fluidGraphics.on('pointerup', () => {
        this.drawmode = 0;
    });
    this.fluidGraphics.on('pointerupoutside', () => {
        this.drawmode = 0;
    });
}

let frame = 0;

function update() {
    requestAnimationFrame(update);

    // User interaction
    let mx = Math.floor(this.mPos.x / this.gridscale);
    let my = Math.floor(this.mPos.y / this.gridscale);
    if (!(mx < 0 || mx >= this.fluidGrid.width || my < 0 || my >= this.fluidGrid.height)) {
        if (this.drawmode === 1)
            this.fluidGrid.bound[this.fluidGrid.i(mx, my)] = true;
        else if (this.drawmode === 2)
            this.fluidGrid.bound[this.fluidGrid.i(mx, my)] = false;
        else if (this.drawmode === 3) {
            let dr = scale(norm([this.mPos.x - this.mPosPrev.x, this.mPos.y - this.mPosPrev.y]), this.deltaU);
            this.fluidGrid.f[this.fluidGrid.i(mx, my)].forEach((value, i, arr) => { arr[i] += dot(this.fluidGrid.lv[i], dr) });
        }
    }

    // Run simulation
    let startTime = new Date().getTime();
    this.fluidGrid.simulate();
    let simulationTime = new Date().getTime() - startTime;
    this.simulationTime.push(simulationTime);

    if (frame % 60 === 0 || sum(this.simulationTime) > 1000) {
        let ms = avg(this.simulationTime);
        document.getElementById("simulationTime").innerText = "" + ms.toFixed(1) + " ms (" + (1000 / ms).toFixed(0) + " fps)";
        this.simulationTime = [];
    }
    frame = frame + 1;

    this.fluidGraphics.clear();

    // Draw background
    this.fluidGraphics.beginFill(0x111111);
    this.fluidGraphics.drawRect(0, 0, this.fluidGrid.width * this.gridscale, this.fluidGrid.height * this.gridscale);
    this.fluidGraphics.endFill();

    // Draw obstacles and fluid densities
    for (let x = -1; x < this.fluidGrid.width + 1; x++) {
        for (let y = -1; y < this.fluidGrid.height + 1; y++) {
            this.fluidGraphics.lineStyle(0);
            if (this.fluidGrid.bound[this.fluidGrid.i(x, y)]) {
                this.fluidGraphics.beginFill(0xeeeeee);
                this.fluidGraphics.drawRect(x * this.gridscale, y * this.gridscale, this.gridscale, this.gridscale);
                this.fluidGraphics.endFill();
            } else {
                let rho = (this.fluidGrid.rho[this.fluidGrid.i(x, y)] - 1) * this.colorscale;
                this.fluidGraphics.beginFill(rbg2hex([0, rho, -rho]));
                this.fluidGraphics.drawRect(x * this.gridscale, y * this.gridscale, this.gridscale, this.gridscale);
                this.fluidGraphics.endFill();
            }
        }
    }

    // Draw fluid vectors
    for (let x = -1; x < this.fluidGrid.width + 1; x++) {
        for (let y = -1; y < this.fluidGrid.height + 1; y++) {
            if (this.fluidGrid.bound[this.fluidGrid.i(x, y)]) {
                // no vectors in bounds
            } else {
                let u = this.fluidGrid.u[this.fluidGrid.i(x, y)];
                let len = Math.min(Math.sqrt(u.reduce((total, value) => {return total + value * value}, 0)) * this.colorscale, 2);

                if (len > 0.005) {
                    this.fluidGraphics.beginFill(0xff);
                    this.fluidGraphics.lineStyle(1, rbg2hex([len, Math.abs(0.5 - len), 1 - len]));
                    this.fluidGraphics.moveTo(x * this.gridscale + this.gridscale / 2, y * this.gridscale + this.gridscale / 2);
                    this.fluidGraphics.lineTo(x * this.gridscale + this.gridscale / 2 + u[0] * this.gridscale * this.vectorscale, y * this.gridscale + this.gridscale / 2 + u[1] * this.gridscale * this.vectorscale);
                    this.fluidGraphics.endFill();
                }
            }
        }
    }

}

function rbg2hex(rgb) {
    return PIXI.utils.rgb2hex(rgb.map((value) => { return Math.max(Math.min(value, 1), 0) }));
}

console.log("Starting :)");
update();