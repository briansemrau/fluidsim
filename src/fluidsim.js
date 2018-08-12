// fluidsim.js

// Lots of credit to this code can be given to Dan Schroeder (http://physics.weber.edu/schroeder/fluids/)

function FluidSim(width, height, viscosity, density = 1) {

    this.width = width;
    this.height = height;

    const df = new Float32Array(width * height * 9).fill(density / 9.0);
    const rho = new Float32Array(width * height).fill(0);
    const ux = new Float32Array(width * height).fill(0);
    const uy = new Float32Array(width * height).fill(0);
    const obst = new Int8Array(width * height).fill(0);

    // Give public access to distribution functions
    this.df = df;

    // Fill border with obstacles
    for (let x = 0; x < width; x++) {
        obst[x] = 1;
        obst[x + (height - 1) * width] = 1;
    }
    for (let y = 0; y < height; y++) {
        obst[y * width] = 1;
        obst[width - 1 + y * width] = 1;
    }

    const four9th = 4.0 / 9.0;
    const one9th = 1.0 / 9.0;
    const one36th = 1.0 / 36.0;

    const collide = function () {
        let omega = 1.0 / (3.0 * viscosity + 0.5);
        for (let y = 1; y < height - 1; y++) {
            let yw = y * width;
            for (let x = 1; x < width - 1; x++) {
                let i = x + yw;
                let i9 = i * 9;

                let thisrho = df[i9] + df[i9 + 1] + df[i9 + 2] + df[i9 + 3] + df[i9 + 4] + df[i9 + 5] + df[i9 + 6] + df[i9 + 7] + df[i9 + 8];
                let thisux = df[i9 + 1] + df[i9 + 2] + df[i9 + 8] - df[i9 + 4] - df[i9 + 5] - df[i9 + 6];
                let thisuy = df[i9 + 2] + df[i9 + 3] + df[i9 + 4] - df[i9 + 6] - df[i9 + 7] - df[i9 + 8];
                rho[i] = thisrho;
                ux[i] = thisux;
                uy[i] = thisuy;

                let one9thrho = one9th * thisrho;
                let one36thrho = one36th * thisrho;
                let ux3 = 3 * thisux;
                let uy3 = 3 * thisuy;
                let ux2 = thisux * thisux;
                let uy2 = thisuy * thisuy;
                let uxuy2 = 2 * thisux * thisuy;
                let u2 = ux2 + uy2;
                let u215 = 1.5 * u2;

                df[i9] += omega * (four9th * thisrho * (1 - u215) - df[i9]);
                df[i9 + 1] += omega * (one9thrho * (1 + ux3 + 4.5 * ux2 - u215) - df[i9 + 1]);
                df[i9 + 5] += omega * (one9thrho * (1 - ux3 + 4.5 * ux2 - u215) - df[i9 + 5]);
                df[i9 + 3] += omega * (one9thrho * (1 + uy3 + 4.5 * uy2 - u215) - df[i9 + 3]);
                df[i9 + 7] += omega * (one9thrho * (1 - uy3 + 4.5 * uy2 - u215) - df[i9 + 7]);
                df[i9 + 2] += omega * (one36thrho * (1 + ux3 + uy3 + 4.5 * (u2 + uxuy2)) - df[i9 + 2]);
                df[i9 + 8] += omega * (one36thrho * (1 + ux3 - uy3 + 4.5 * (u2 - uxuy2)) - df[i9 + 8]);
                df[i9 + 4] += omega * (one36thrho * (1 - ux3 + uy3 + 4.5 * (u2 - uxuy2)) - df[i9 + 4]);
                df[i9 + 6] += omega * (one36thrho * (1 - ux3 - uy3 + 4.5 * (u2 + uxuy2)) - df[i9 + 6]);
            }
        }
    };

    const stream = function () {
        let width9 = width * 9;
        for (let y = height - 1; y > 0; y--) {
            let yw = y * width;
            for (let x = 0; x < width - 1; x++) {
                let i9 = (x + yw) * 9;
                df[i9 + 3] = df[i9 - width9 + 3]; // y-1
                df[i9 + 4] = df[i9 + 9 - width9 + 4]; // x+1 y-1
            }
        }
        for (let y = height - 1; y > 0; y--) {
            let yw = y * width;
            for (let x = width - 1; x > 0; x--) {
                let i9 = (x + yw) * 9;
                df[i9 + 1] = df[i9 - 9 + 1]; // x-1
                df[i9 + 2] = df[i9 - 9 - width9 + 2]; // x-1 y-1
            }
        }
        for (let y = 0; y < height - 1; y++) {
            let yw = y * width;
            for (let x = width - 1; x > 0; x--) {
                let i9 = (x + yw) * 9;
                df[i9 + 7] = df[i9 + width9 + 7]; // y+1
                df[i9 + 8] = df[i9 - 9 + width9 + 8]; // x-1 y+1
            }
        }
        for (let y = 0; y < height - 1; y++) {
            let yw = y * width;
            for (let x = 0; x < width - 1; x++) {
                let i9 = (x + yw) * 9;
                df[i9 + 5] = df[i9 + 9 + 5]; // x+1
                df[i9 + 6] = df[i9 + 9 + width9 + 6]; // x+1 y+1
            }
        }
    };

    const bounce = function () {
        let width9 = width * 9;
        for (let y = 1; y < height - 1; y++) {
            let yw = y * width;
            for (let x = 1; x < width - 1; x++) {
                // TODO implement moving obstacles
                if (obst[x + yw] !== 0) {
                    let i9 = (x + yw) * 9;
                    df[i9 + 9 + 1] = df[i9 + 5];
                    df[i9 - 9 + 5] = df[i9 + 1];
                    df[i9 + width9 + 3] = df[i9 + 7];
                    df[i9 - width9 + 7] = df[i9 + 3];
                    df[i9 + 9 + width9 + 2] = df[i9 + 6];
                    df[i9 - 9 + width9 + 4] = df[i9 + 8];
                    df[i9 + 9 - width9 + 8] = df[i9 + 4];
                    df[i9 - 9 - width9 + 6] = df[i9 + 2];
                }
            }
        }
        for (let y = 1; y < height - 1; y++) {
            let yw = y * width;
            let x = 0;
            if (obst[x + yw] !== 0) {
                let i9 = (x + yw) * 9;
                df[i9 + 9 + 1] = df[i9 + 5];
                df[i9 + width9 + 3] = df[i9 + 7];
                df[i9 - width9 + 7] = df[i9 + 3];
                df[i9 + 9 + width9 + 2] = df[i9 + 6];
                df[i9 + 9 - width9 + 8] = df[i9 + 4];
            }
            x = width - 1;
            if (obst[x + yw] !== 0) {
                let i9 = (x + yw) * 9;
                df[i9 - 9 + 5] = df[i9 + 1];
                df[i9 + width9 + 3] = df[i9 + 7];
                df[i9 - width9 + 7] = df[i9 + 3];
                df[i9 - 9 + width9 + 4] = df[i9 + 8];
                df[i9 - 9 - width9 + 6] = df[i9 + 2];
            }
        }
        for (let x = 1; x < width - 1; x++) {
            let yw = 0;
            if (obst[x + yw] !== 0) {
                let i9 = (x + yw) * 9;
                df[i9 + 9 + 1] = df[i9 + 5];
                df[i9 + width9 + 3] = df[i9 + 7];
                df[i9 + 9 + width9 + 2] = df[i9 + 6];
                df[i9 - 9 + width9 + 4] = df[i9 + 8];
                df[i9 + 9 - width9 + 8] = df[i9 + 4];
            }
            yw = (height - 1) * width;
            if (obst[x + yw] !== 0) {
                let i9 = (x + yw) * 9;
                df[i9 + 9 + 1] = df[i9 + 5];
                df[i9 - 9 + 5] = df[i9 + 1];
                df[i9 - width9 + 7] = df[i9 + 3];
                df[i9 + 9 - width9 + 8] = df[i9 + 4];
                df[i9 - 9 - width9 + 6] = df[i9 + 2];
            }
        }
        // corners
        let x = 0;
        let yw = 0;
        if (obst[x + yw] !== 0) {
            let i9 = (x + yw) * 9;
            df[i9 + 9 + 1] = df[i9 + 5];
            df[i9 + width9 + 3] = df[i9 + 7];
            df[i9 + 9 + width9 + 2] = df[i9 + 6];
        }
        x = width - 1;
        yw = 0;
        if (obst[x + yw] !== 0) {
            let i9 = (x + yw) * 9;
            df[i9 - 9 + 5] = df[i9 + 1];
            df[i9 + width9 + 3] = df[i9 + 7];
            df[i9 - 9 + width9 + 4] = df[i9 + 8];
        }
        x = width - 1;
        yw = (height - 1) * width;
        if (obst[x + yw] !== 0) {
            let i9 = (x + yw) * 9;
            df[i9 - 9 + 5] = df[i9 + 1];
            df[i9 - width9 + 7] = df[i9 + 3];
            df[i9 - 9 - width9 + 6] = df[i9 + 2];
        }
        x = 0;
        yw = (height - 1) * width;
        if (obst[x + yw] !== 0) {
            let i9 = (x + yw) * 9;
            df[i9 + 9 + 1] = df[i9 + 5];
            df[i9 - width9 + 7] = df[i9 + 3];
            df[i9 + 9 - width9 + 8] = df[i9 + 4];
        }
    };

    this.simulate = function (steps = 1) {
        for (let step = 0; step < steps; step++) {
            collide();
            stream();
            bounce();
        }
    };

    this.rho = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return rho[x + y * width];
    };

    this.u = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return [ux[x + y * width], uy[x + y * width]];
    };

    this.curl = function (x, y) {
        if (x < 1 || x > width - 2 || y < 1 || y > height - 2) return 0;
        return uy[x + 1 + y * width] - uy[x - 1 + y * width] - ux[x + (y + 1) * width] + ux[x + (y - 1) * width];
    };

    this.obst = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return obst[x + y * width];
    };

    this.setObst = function (x, y, value) {
        if (x < 1 || x > width - 2 || y < 1 || y > height - 2) return;
        return obst[x + y * width] = value;
    };

    this.viscosity = function () {
        return viscosity;
    };

    this.setViscosity = function (value) {
        viscosity = value;
    };

}