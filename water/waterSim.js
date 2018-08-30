// gasSim.js

// Lots of credit to this code can be given to Dan Schroeder (http://physics.weber.edu/schroeder/fluids/)

function WaterSim(width, height, viscosity) {

    this.width = width;
    this.height = height;
    let omega = 1.0 / (3.0 * viscosity + 0.5);
    let gx = 0;
    let gy = -0.000001;
    let maxU = 0.001;
    let massFlowMult = 500;

    const df1 = new Float32Array(width * height * 9).fill(0);
    const df2 = new Float32Array(width * height * 9).fill(0);
    let df = df2;
    const m = new Float32Array(width * height).fill(0);
    const eps2 = new Float32Array(width * height).fill(0);
    const nx = new Float32Array(width * height).fill(0);
    const ny = new Float32Array(width * height).fill(0);
    const rho = new Float32Array(width * height).fill(1);
    const ux = new Float32Array(width * height).fill(0);
    const uy = new Float32Array(width * height).fill(0);
    const type = new Int8Array(width * height).fill(0);
    const interftype = new Int8Array(width * height).fill(0);

    // Cell types
    const OBST = -1;
    const EMPTY = 0;
    const FLUID = 1;
    const INTERF = 2;
    const NEWINTERF = 3;

    // Interface "types"
    const NO_F_NB = 1;
    const NO_E_NB = 2;
    const NO_IF_NB = 3;

    // Fill border with obstacles
    for (let x = 0; x < width; x++) {
        type[x] = OBST;
        type[x + (height - 1) * width] = OBST;
    }
    for (let y = 0; y < height; y++) {
        type[y * width] = OBST;
        type[width - 1 + y * width] = OBST;
    }

    const four9th = 4.0 / 9.0;
    const one9th = 1.0 / 9.0;
    const one36th = 1.0 / 36.0;

    let eq0 = 0;
    let eq1 = 0;
    let eq2 = 0;
    let eq3 = 0;
    let eq4 = 0;
    let eq5 = 0;
    let eq6 = 0;
    let eq7 = 0;
    let eq8 = 0;

    const calcEquil = function (rho, ux, uy) {
        ux += gx;
        uy += gy;
        let one9thrho = one9th * rho;
        let one36thrho = one36th * rho;
        let ux3 = 3 * ux;
        let uy3 = 3 * uy;
        let ux2 = ux * ux;
        let uy2 = uy * uy;
        let uxuy2 = 2 * ux * uy;
        let u2 = ux2 + uy2;
        let u215 = 1.5 * u2;

        eq0 = four9th * rho * (1 - u215);
        eq1 = one9thrho * (1 + ux3 + 4.5 * ux2 - u215);
        eq5 = one9thrho * (1 - ux3 + 4.5 * ux2 - u215);
        eq3 = one9thrho * (1 + uy3 + 4.5 * uy2 - u215);
        eq7 = one9thrho * (1 - uy3 + 4.5 * uy2 - u215);
        eq2 = one36thrho * (1 + ux3 + uy3 + 4.5 * (u2 + uxuy2));
        eq8 = one36thrho * (1 + ux3 - uy3 + 4.5 * (u2 - uxuy2));
        eq4 = one36thrho * (1 - ux3 + uy3 + 4.5 * (u2 - uxuy2));
        eq6 = one36thrho * (1 - ux3 - uy3 + 4.5 * (u2 + uxuy2));
    };

    const collide = function () {
        for (let y = 0; y < height; y++) {
            let yw = y * width;
            for (let x = 0; x < width; x++) {
                let i = x + yw;

                if (type[i] === EMPTY) continue;

                let i9 = i * 9;

                let thisrho = df[i9] + df[i9 + 1] + df[i9 + 2] + df[i9 + 3] + df[i9 + 4] + df[i9 + 5] + df[i9 + 6] + df[i9 + 7] + df[i9 + 8];
                let thisux = clamp(df[i9 + 1] + df[i9 + 2] + df[i9 + 8] - df[i9 + 4] - df[i9 + 5] - df[i9 + 6], -maxU, maxU);
                let thisuy = clamp(df[i9 + 2] + df[i9 + 3] + df[i9 + 4] - df[i9 + 6] - df[i9 + 7] - df[i9 + 8], -maxU, maxU);
                rho[i] = thisrho;
                ux[i] = thisux;
                uy[i] = thisuy;

                calcEquil(thisrho, thisux, thisuy);
                df[i9] += omega * (eq0 - df[i9]);
                df[i9 + 1] += omega * (eq1 - df[i9 + 1]);
                df[i9 + 5] += omega * (eq5 - df[i9 + 5]);
                df[i9 + 3] += omega * (eq3 - df[i9 + 3]);
                df[i9 + 7] += omega * (eq7 - df[i9 + 7]);
                df[i9 + 2] += omega * (eq2 - df[i9 + 2]);
                df[i9 + 8] += omega * (eq8 - df[i9 + 8]);
                df[i9 + 4] += omega * (eq4 - df[i9 + 4]);
                df[i9 + 6] += omega * (eq6 - df[i9 + 6]);
            }
        }
    };

    const stream = function () {
        let width9 = width * 9;

        // Alternate between DF buffer
        let last = df;
        let next = df === df1 ? df2 : df1;

        for (let y = 0; y < height; y++) {
            let yw = y * width;
            for (let x = 0; x < width; x++) {
                let i = x + yw;
                let i9 = i * 9;

                let thistype = type[i];

                if (thistype === EMPTY) continue; // empty stream step :)

                if (thistype === NEWINTERF) type[i] = thistype = INTERF;

                if (thistype === INTERF) { // Interface stream step
                    // Calculate equilibrium DFs for surrounding air
                    let thisux = ux[i];
                    let thisuy = uy[i];

                    calcEquil(1, thisux, thisuy);

                    let thisnx = nx[i];
                    let thisny = ny[i];

                    // Stream
                    next[i9] = last[i9];

                    if (x > 0) {
                        if (type[i - 1] === EMPTY || -thisnx > 0) // TODO: determine `=== EMPTY` or `<= 0`
                            next[i9 + 1] = eq1 + eq5 - last[i9 + 5];
                        else next[i9 + 1] = last[i9 - 9 + 1];
                    } else next[i9 + 1] = last[i9 + 5];

                    if (x > 0 && y > 0) {
                        if (type[i - 1 - width] === EMPTY || -thisnx - thisny > 0)
                            next[i9 + 2] = eq2 + eq6 - last[i9 + 6];
                        else next[i9 + 2] = last[i9 - 9 - width9 + 2];
                    } else next[i9 + 2] = last[i9 + 6];

                    if (y > 0) {
                        if (type[i - width] === EMPTY || -thisny > 0)
                            next[i9 + 3] = eq3 + eq7 - last[i9 + 7];
                        else next[i9 + 3] = last[i9 - width9 + 3];
                    } else next[i9 + 3] = last[i9 + 7];

                    if (x < width - 1 && y > 0) {
                        if (type[i + 1 - width] === EMPTY || thisnx - thisny > 0)
                            next[i9 + 4] = eq4 + eq8 - last[i9 + 8];
                        else next[i9 + 4] = last[i9 + 9 - width9 + 4];
                    } else next[i9 + 4] = last[i9 + 8];

                    if (x < width - 1) {
                        if (type[i + 1] === EMPTY || thisnx > 0)
                            next[i9 + 5] = eq5 + eq1 - last[i9 + 1];
                        else next[i9 + 5] = last[i9 + 9 + 5];
                    } else next[i9 + 5] = last[i9 + 1];

                    if (x < width - 1 && y < height - 1) {
                        if (type[i + 1 + width] === EMPTY || thisnx + thisny > 0)
                            next[i9 + 6] = eq6 + eq2 - last[i9 + 2];
                        else next[i9 + 6] = last[i9 + 9 + width9 + 6];
                    } else next[i9 + 6] = last[i9 + 2];

                    if (y < height - 1) {
                        if (type[i + width] === EMPTY || thisny > 0)
                            next[i9 + 7] = eq7 + eq3 - last[i9 + 3];
                        else next[i9 + 7] = last[i9 + width9 + 7];
                    } else next[i9 + 7] = last[i9 + 3];

                    if (x > 0 && y < height - 1) {
                        if (type[i - 1 + width] === EMPTY || -thisnx + thisny > 0)
                            next[i9 + 8] = eq8 + eq4 - last[i9 + 4];
                        else next[i9 + 8] = last[i9 - 9 + width9 + 8];
                    } else next[i9 + 8] = last[i9 + 4];

                } else { // Normal fluid stream step
                    next[i9] = last[i9];

                    if (x > 0) next[i9 + 1] = last[i9 - 9 + 1];
                    else next[i9 + 1] = last[i9 + 5];

                    if (x > 0 && y > 0) next[i9 + 2] = last[i9 - 9 - width9 + 2];
                    else next[i9 + 2] = last[i9 + 6];

                    if (y > 0) next[i9 + 3] = last[i9 - width9 + 3];
                    else next[i9 + 3] = last[i9 + 7];

                    if (x < width - 1 && y > 0) next[i9 + 4] = last[i9 + 9 - width9 + 4];
                    else next[i9 + 4] = last[i9 + 8];

                    if (x < width - 1) next[i9 + 5] = last[i9 + 9 + 5];
                    else next[i9 + 5] = last[i9 + 1];

                    if (x < width - 1 && y < height - 1) next[i9 + 6] = last[i9 + 9 + width9 + 6];
                    else next[i9 + 6] = last[i9 + 2];

                    if (y < height - 1) next[i9 + 7] = last[i9 + width9 + 7];
                    else next[i9 + 7] = last[i9 + 3];

                    if (x > 0 && y < height - 1) next[i9 + 8] = last[i9 - 9 + width9 + 8];
                    else next[i9 + 8] = last[i9 + 4];
                }

            }
        }

        df = next;
    };

    const bounce = function () {
        let width9 = width * 9;
        for (let y = 1; y < height - 1; y++) {
            let yw = y * width;
            for (let x = 1; x < width - 1; x++) {
                // TODO implement moving obstacles
                if (type[x + yw] === OBST) {
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
            if (type[x + yw] === OBST) {
                let i9 = (x + yw) * 9;
                df[i9 + 9 + 1] = df[i9 + 5];
                df[i9 + width9 + 3] = df[i9 + 7];
                df[i9 - width9 + 7] = df[i9 + 3];
                df[i9 + 9 + width9 + 2] = df[i9 + 6];
                df[i9 + 9 - width9 + 8] = df[i9 + 4];
            }
            x = width - 1;
            if (type[x + yw] === OBST) {
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
            if (type[x + yw] === OBST) {
                let i9 = (x + yw) * 9;
                df[i9 + 9 + 1] = df[i9 + 5];
                df[i9 + width9 + 3] = df[i9 + 7];
                df[i9 + 9 + width9 + 2] = df[i9 + 6];
                df[i9 - 9 + width9 + 4] = df[i9 + 8];
                df[i9 + 9 - width9 + 8] = df[i9 + 4];
            }
            yw = (height - 1) * width;
            if (type[x + yw] === OBST) {
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
        if (type[x + yw] === OBST) {
            let i9 = (x + yw) * 9;
            df[i9 + 9 + 1] = df[i9 + 5];
            df[i9 + width9 + 3] = df[i9 + 7];
            df[i9 + 9 + width9 + 2] = df[i9 + 6];
        }
        x = width - 1;
        yw = 0;
        if (type[x + yw] === OBST) {
            let i9 = (x + yw) * 9;
            df[i9 - 9 + 5] = df[i9 + 1];
            df[i9 + width9 + 3] = df[i9 + 7];
            df[i9 - 9 + width9 + 4] = df[i9 + 8];
        }
        x = width - 1;
        yw = (height - 1) * width;
        if (type[x + yw] === OBST) {
            let i9 = (x + yw) * 9;
            df[i9 - 9 + 5] = df[i9 + 1];
            df[i9 - width9 + 7] = df[i9 + 3];
            df[i9 - 9 - width9 + 6] = df[i9 + 2];
        }
        x = 0;
        yw = (height - 1) * width;
        if (type[x + yw] === OBST) {
            let i9 = (x + yw) * 9;
            df[i9 + 9 + 1] = df[i9 + 5];
            df[i9 - width9 + 7] = df[i9 + 3];
            df[i9 + 9 - width9 + 8] = df[i9 + 4];
        }
    };

    const fluidfraction = function () {
        // Calculate fluid fraction
        for (let i = 0; i < width * height; i++) {
            if (type[i] === FLUID) {
                eps2[i] = 0.5;
                m[i] = rho[i];
            } else if (type[i] >= INTERF) {
                eps2[i] = m[i] / (rho[i] * 2);
            }
            else eps2[i] = m[i] = 0; // TODO is this needed?
        }
        // Calculate normal
        for (let y = 0; y < height; y++) {
            let yw = y * width;
            for (let x = 0; x < width; x++) {
                let i = x + yw;
                if (type[i] >= INTERF) {
                    nx[i] = eps2[i - 1] - eps2[i + 1];
                    ny[i] = eps2[i - width] - eps2[i + width];
                }
                else {
                    nx[i] = ny[i] = 0;
                } // TODO is this needed?
            }
        }
    };

    const FlaggedList = function () {
        this.head = null;
        this.tail = null;

        const Node = function (x, y, next = null) {
            this.x = x;
            this.y = y;
            this.next = next;
        };

        this.addCoord = (x, y) => {
            if (this.tail === null) {
                this.tail = new Node(x, y);
                this.head = this.tail;
                return;
            }
            this.tail.next = new Node(x, y);
            this.tail = this.tail.next;
        };
    };

    const massflow = function () {
        let width9 = width * 9;

        let filled = new FlaggedList();
        let emptied = new FlaggedList();

        // Flag interface types
        for (let y = 1; y < height - 1; y++) {
            let yw = y * width;
            for (let x = 1; x < width - 1; x++) {
                let i = x + yw;
                if (type[i] === INTERF) {
                    let t1 = type[i + 1];
                    let t2 = type[i + 1 + width];
                    let t3 = type[i + width];
                    let t4 = type[i - 1 + width];
                    let t5 = type[i - 1];
                    let t6 = type[i - 1 - width];
                    let t7 = type[i - width];
                    let t8 = type[i + 1 - width];

                    let noFnb = !(t1 === FLUID || t2 === FLUID || t3 === FLUID || t4 === FLUID || t5 === FLUID || t6 === FLUID || t7 === FLUID || t8 === FLUID);
                    if (noFnb) {
                        let noIFnb = !(t1 === INTERF || t2 === INTERF || t3 === INTERF || t4 === INTERF || t5 === INTERF || t6 === INTERF || t7 === INTERF || t8 === INTERF);
                        if (noIFnb) {
                            interftype[i] = NO_IF_NB;
                        } else
                            interftype[i] = NO_F_NB;
                        continue;
                    }
                    let noEnb = t1 > 0 && t2 > 0 && t3 > 0 && t4 > 0 && t5 > 0 && t6 > 0 && t7 > 0 && t8 > 0;
                    if (noEnb) {
                        interftype[i] = NO_E_NB;
                        continue;
                    }
                    interftype[i] = 0;
                } else {
                    interftype[i] = 0;
                }
            }
        }

        // Calculate mass flow
        for (let y = 1; y < height - 1; y++) {
            let yw = y * width;
            for (let x = 1; x < width - 1; x++) {
                let i = x + yw;
                let i9 = i * 9;
                if (type[x + yw] === INTERF) {
                    let thiseps = eps2[i];
                    let thisrho = rho[i];
                    let dm = 0;

                    let speed = massFlowMult;

                    let t1 = type[i + 1];
                    let t2 = type[i + 1 + width];
                    let t3 = type[i + width];
                    let t4 = type[i - 1 + width];
                    let t5 = type[i - 1];
                    let t6 = type[i - 1 - width];
                    let t7 = type[i - width];
                    let t8 = type[i + 1 - width];

                    let interft = interftype[i];

                    if (interft === NO_F_NB) { // No fluid neighbors
                        if (t1 === FLUID) dm += (df[i9 + 9 + 5] - df[i9 + 1]) * speed;
                        else if (t1 === INTERF) {
                            if (interftype[i + 1] === NO_F_NB)
                                dm += (df[i9 + 9 + 5] - df[i9 + 1]) * (thiseps + eps2[i + 1]) * speed;
                            else
                                dm += (-df[i9 + 1]) * (thiseps + eps2[i + 1]);
                        }

                        if (t5 === FLUID) dm += (df[i9 - 9 + 1] - df[i9 + 5]) * speed;
                        else if (t5 === INTERF) {
                            if (interftype[i - 1] === NO_F_NB)
                                dm += (df[i9 - 9 + 1] - df[i9 + 5]) * (thiseps + eps2[i - 1]) * speed;
                            else
                                dm += (-df[i9 + 5]) * (thiseps + eps2[i - 1]);
                        }

                        if (t3 === FLUID) dm += (df[i9 + width9 + 7] - df[i9 + 3]) * speed;
                        else if (t3 === INTERF) {
                            if (interftype[i + width] === NO_F_NB)
                                dm += (df[i9 + width9 + 7] - df[i9 + 3]) * (thiseps + eps2[i + width]) * speed;
                            else
                                dm += (-df[i9 + 3]) * (thiseps + eps2[i + width]);
                        }

                        if (t7 === FLUID) dm += (df[i9 - width9 + 3] - df[i9 + 7]) * speed;
                        else if (t7 === INTERF) {
                            if (interftype[i - width] === NO_F_NB)
                                dm += (df[i9 - width9 + 3] - df[i9 + 7]) * (thiseps + eps2[i - width]) * speed;
                            else
                                dm += (-df[i9 + 7]) * (thiseps + eps2[i - width]);
                        }

                        if (t2 === FLUID) dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]) * speed;
                        else if (t2 === INTERF) {
                            if (interftype[i + 1 + width] === NO_F_NB)
                                dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]) * (thiseps + eps2[i + 1 + width]) * speed;
                            else
                                dm += (-df[i9 + 2]) * (thiseps + eps2[i + 1 + width]);
                        }

                        if (t4 === FLUID) dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]) * speed;
                        else if (t4 === INTERF) {
                            if (interftype[i - 1 + width] === NO_F_NB)
                                dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]) * (thiseps + eps2[i - 1 + width]) * speed;
                            else
                                dm += (-df[i9 + 4]) * (thiseps + eps2[i - 1 + width]);
                        }

                        if (t8 === FLUID) dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]) * speed;
                        else if (t8 === INTERF) {
                            if (interftype[i + 1 - width] === NO_F_NB)
                                dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]) * (thiseps + eps2[i + 1 - width]) * speed;
                            else
                                dm += (-df[i9 + 8]) * (thiseps + eps2[i + 1 - width]);
                        }

                        if (t6 === FLUID) dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]) * speed;
                        else if (t6 === INTERF) {
                            if (interftype[i - 1 - width] === NO_F_NB)
                                dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]) * (thiseps + eps2[i - 1 - width]) * speed;
                            else
                                dm += (-df[i9 + 6]) * (thiseps + eps2[i - 1 - width]);
                        }
                    } else if (interft === NO_E_NB) { // No empty neighbors
                        if (t1 === FLUID) dm += (df[i9 + 9 + 5] - df[i9 + 1]) * speed;
                        else if (t1 === INTERF) {
                            if (interftype[i + 1] === NO_E_NB)
                                dm += (df[i9 + 9 + 5] - df[i9 + 1]) * (thiseps + eps2[i + 1]) * speed;
                            else
                                dm += (df[i9 + 9 + 5]) * (thiseps + eps2[i + 1]);
                        }

                        if (t5 === FLUID) dm += (df[i9 - 9 + 1] - df[i9 + 5]) * speed;
                        else if (t5 === INTERF) {
                            if (interftype[i - 1] === NO_E_NB)
                                dm += (df[i9 - 9 + 1] - df[i9 + 5]) * (thiseps + eps2[i - 1]) * speed;
                            else
                                dm += (df[i9 - 9 + 1]) * (thiseps + eps2[i - 1]);
                        }

                        if (t3 === FLUID) dm += (df[i9 + width9 + 7] - df[i9 + 3]) * speed;
                        else if (t3 === INTERF) {
                            if (interftype[i + width] === NO_E_NB)
                                dm += (df[i9 + width9 + 7] - df[i9 + 3]) * (thiseps + eps2[i + width]) * speed;
                            else
                                dm += (df[i9 + width9 + 7]) * (thiseps + eps2[i + width]);
                        }

                        if (t7 === FLUID) dm += (df[i9 - width9 + 3] - df[i9 + 7]) * speed;
                        else if (t7 === INTERF) {
                            if (interftype[i - width] === NO_E_NB)
                                dm += (df[i9 - width9 + 3] - df[i9 + 7]) * (thiseps + eps2[i - width]) * speed;
                            else
                                dm += (df[i9 - width9 + 3]) * (thiseps + eps2[i - width]);
                        }

                        if (t2 === FLUID) dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]) * speed;
                        else if (t2 === INTERF) {
                            if (interftype[i + 1 + width] === NO_E_NB)
                                dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]) * (thiseps + eps2[i + 1 + width]) * speed;
                            else
                                dm += (df[i9 + 9 + width9 + 6]) * (thiseps + eps2[i + 1 + width]);
                        }

                        if (t4 === FLUID) dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]) * speed;
                        else if (t4 === INTERF) {
                            if (interftype[i - 1 + width] === NO_E_NB)
                                dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]) * (thiseps + eps2[i - 1 + width]) * speed;
                            else
                                dm += (df[i9 - 9 + width9 + 8]) * (thiseps + eps2[i - 1 + width]);
                        }

                        if (t8 === FLUID) dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]) * speed;
                        else if (t8 === INTERF) {
                            if (interftype[i + 1 - width] === NO_E_NB)
                                dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]) * (thiseps + eps2[i + 1 - width]) * speed;
                            else
                                dm += (df[i9 + 9 - width9 + 4]) * (thiseps + eps2[i + 1 - width]);
                        }

                        if (t6 === FLUID) dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]) * speed;
                        else if (t6 === INTERF) {
                            if (interftype[i - 1 - width] === NO_E_NB)
                                dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]) * (thiseps + eps2[i - 1 - width]) * speed;
                            else
                                dm += (df[i9 - 9 - width9 + 2]) * (thiseps + eps2[i - 1 - width]);
                        }
                    } else { // Standard cell
                        if (t1 === FLUID) dm += (df[i9 + 9 + 5] - df[i9 + 1]) * speed;
                        else if (t1 === INTERF) {
                            if (interftype[i + 1] === NO_E_NB)
                                dm += (-df[i9 + 1]) * (thiseps + eps2[i + 1]);
                            else if (interftype[i + 1] === NO_F_NB)
                                dm += (df[i9 + 9 + 5]) * (thiseps + eps2[i + 1]);
                            else
                                dm += (df[i9 + 9 + 5] - df[i9 + 1]) * (thiseps + eps2[i + 1]) * speed;
                        }

                        if (t5 === FLUID) dm += (df[i9 - 9 + 1] - df[i9 + 5]) * speed;
                        else if (t5 === INTERF) {
                            if (interftype[i - 1] === NO_E_NB)
                                dm += (-df[i9 + 5]) * (thiseps + eps2[i - 1]);
                            else if (interftype[i - 1] === NO_F_NB)
                                dm += (df[i9 - 9 + 1]) * (thiseps + eps2[i - 1]);
                            else
                                dm += (df[i9 - 9 + 1] - df[i9 + 5]) * (thiseps + eps2[i - 1]) * speed;
                        }

                        if (t3 === FLUID) dm += (df[i9 + width9 + 7] - df[i9 + 3]) * speed;
                        else if (t3 === INTERF) {
                            if (interftype[i + width] === NO_E_NB)
                                dm += (-df[i9 + 3]) * (thiseps + eps2[i + width]);
                            else if (interftype[i + width] === NO_F_NB)
                                dm += (df[i9 + width9 + 7]) * (thiseps + eps2[i + width]);
                            else
                                dm += (df[i9 + width9 + 7] - df[i9 + 3]) * (thiseps + eps2[i + width]) * speed;
                        }

                        if (t7 === FLUID) dm += (df[i9 - width9 + 3] - df[i9 + 7]) * speed;
                        else if (t7 === INTERF) {
                            if (interftype[i - width] === NO_E_NB)
                                dm += (-df[i9 + 7]) * (thiseps + eps2[i - width]);
                            else if (interftype[i - width] === NO_F_NB)
                                dm += (df[i9 - width9 + 3]) * (thiseps + eps2[i - width]);
                            else
                                dm += (df[i9 - width9 + 3] - df[i9 + 7]) * (thiseps + eps2[i - width]) * speed;
                        }

                        if (t2 === FLUID) dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]) * speed;
                        else if (t2 === INTERF) {
                            if (interftype[i + 1 + width] === NO_E_NB)
                                dm += (-df[i9 + 2]) * (thiseps + eps2[i + 1 + width]);
                            else if (interftype[i + 1 + width] === NO_F_NB)
                                dm += (df[i9 + 9 + width9 + 6]) * (thiseps + eps2[i + 1 + width]);
                            else
                                dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]) * (thiseps + eps2[i + 1 + width]) * speed;
                        }

                        if (t4 === FLUID) dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]) * speed;
                        else if (t4 === INTERF) {
                            if (interftype[i - 1 + width] === NO_E_NB)
                                dm += (-df[i9 + 4]) * (thiseps + eps2[i - 1 + width]);
                            else if (interftype[i - 1 + width] === NO_F_NB)
                                dm += (df[i9 - 9 + width9 + 8]) * (thiseps + eps2[i - 1 + width]);
                            else
                                dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]) * (thiseps + eps2[i - 1 + width]) * speed;
                        }

                        if (t8 === FLUID) dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]) * speed;
                        else if (t8 === INTERF) {
                            if (interftype[i + 1 - width] === NO_E_NB)
                                dm += (-df[i9 + 8]) * (thiseps + eps2[i + 1 - width]);
                            else if (interftype[i + 1 - width] === NO_F_NB)
                                dm += (df[i9 + 9 - width9 + 4]) * (thiseps + eps2[i + 1 - width]);
                            else
                                dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]) * (thiseps + eps2[i + 1 - width]) * speed;
                        }

                        if (t6 === FLUID) dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]) * speed;
                        else if (t6 === INTERF) {
                            if (interftype[i - 1 - width] === NO_E_NB)
                                dm += (-df[i9 + 6]) * (thiseps + eps2[i - 1 - width]);
                            else if (interftype[i - 1 - width] === NO_F_NB)
                                dm += (df[i9 - 9 - width9 + 2]) * (thiseps + eps2[i - 1 - width]);
                            else
                                dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]) * (thiseps + eps2[i - 1 - width]) * speed;
                        }
                        // Mass transfer without using table 4.1
                        // if (t1 === FLUID) dm += (df[i9 + 9 + 5] - df[i9 + 1]);
                        // else if (t1 === INTERF) dm += (df[i9 + 9 + 5] - df[i9 + 1]) * (thiseps + eps2[i + 1]);
                        //
                        // if (t5 === FLUID) dm += (df[i9 - 9 + 1] - df[i9 + 5]);
                        // else if (t5 === INTERF) dm += (df[i9 - 9 + 1] - df[i9 + 5]) * (thiseps + eps2[i - 1]);
                        //
                        // if (t3 === FLUID) dm += (df[i9 + width9 + 7] - df[i9 + 3]);
                        // else if (t3 === INTERF) dm += (df[i9 + width9 + 7] - df[i9 + 3]) * (thiseps + eps2[i + width]);
                        //
                        // if (t7 === FLUID) dm += (df[i9 - width9 + 3] - df[i9 + 7]);
                        // else if (t7 === INTERF) dm += (df[i9 - width9 + 3] - df[i9 + 7]) * (thiseps + eps2[i - width]);
                        //
                        // if (t2 === FLUID) dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]);
                        // else if (t2 === INTERF) dm += (df[i9 + 9 + width9 + 6] - df[i9 + 2]) * (thiseps + eps2[i + 1 + width]);
                        //
                        // if (t4 === FLUID) dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]);
                        // else if (t4 === INTERF) dm += (df[i9 - 9 + width9 + 8] - df[i9 + 4]) * (thiseps + eps2[i - 1 + width]);
                        //
                        // if (t8 === FLUID) dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]);
                        // else if (t8 === INTERF) dm += (df[i9 + 9 - width9 + 4] - df[i9 + 8]) * (thiseps + eps2[i + 1 - width]);
                        //
                        // if (t6 === FLUID) dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]);
                        // else if (t6 === INTERF) dm += (df[i9 - 9 - width9 + 2] - df[i9 + 6]) * (thiseps + eps2[i - 1 - width]);
                    }

                    // DEBUG prevent excess mass
                    // if (dm < -m[i]) dm = -m[i];
                    // else if (dm > (thisrho - m[i])) dm = thisrho - m[i];

                    m[i] += dm;
                    if (interft === NO_IF_NB) {
                        filled.addCoord(x, y);
                    } else if (interft === NO_F_NB) {
                        if (m[i] < 0.1 * thisrho) emptied.addCoord(x, y);
                        else if (m[i] > 0.9 * thisrho) filled.addCoord(x, y);
                    } else {
                        if (m[i] < -0.0001 * thisrho) emptied.addCoord(x, y);
                        else if (m[i] > 1.0001 * thisrho) filled.addCoord(x, y);
                    }
                }
            }
        }

        // Flag re-initialization
        flagreinit(filled, emptied);
    };

    const flagreinit = function (filled, emptied) {
        // Fill cells
        let node = filled.head;
        while (node !== null) {
            // Prepare neighborhood of filled cell
            for (let y = node.y - 1; y <= node.y + 1; y++) {
                for (let x = node.x - 1; x <= node.x + 1; x++) {
                    let i = x + y * width;

                    // Switch flagged cell to fluid
                    if (x === node.x && y === node.y) {
                        type[x + y * width] = FLUID;
                        continue;
                    }

                    // Prevent interface from emptying (remove from emptied list)
                    if (type[i] === INTERF) {
                        let prevnode = null;
                        let currnode = emptied.head;
                        let nodei = 0;
                        while (currnode !== null) {
                            nodei = currnode.x + currnode.y * width;
                            if (nodei === i) {
                                if (prevnode === null)
                                    emptied.head = currnode.next;
                                else
                                    prevnode.next = currnode.next;
                                break;
                            }
                            prevnode = currnode;
                            currnode = currnode.next;
                        }
                    }

                    // Only initialize empty cells
                    else if (type[i] === EMPTY) {
                        // Calculate avg rho and u
                        let rhoavg = 0;
                        let uxavg = 0;
                        let uyavg = 0;
                        let n = 0;
                        type[i] = NEWINTERF;
                        for (let yn = -1; yn <= 1; yn++) {
                            let yoff = yn * width;
                            for (let xn = -1; xn <= 1; xn++) {
                                // if (yn === 0 && xn === 0) continue;
                                let inb = i + xn + yoff;
                                if (type[inb] === FLUID || type[inb] === INTERF) {
                                    rhoavg += rho[inb];
                                    uxavg += ux[inb];
                                    uyavg += uy[inb];
                                    n++;
                                }
                            }
                        }
                        if (n > 0) {
                            let ni = 1 / n;
                            rhoavg *= ni;
                            uxavg *= ni;
                            uyavg *= ni;
                        } else {
                            console.log("created newinterf with no neighbor fluid/interf");
                            rhoavg = 1;
                        }

                        // Initialize with equilibrium DFs
                        let i9 = i * 9;
                        calcEquil(rhoavg, uxavg, uyavg);
                        df[i9] = eq0;
                        df[i9 + 1] = eq1;
                        df[i9 + 5] = eq5;
                        df[i9 + 3] = eq3;
                        df[i9 + 7] = eq7;
                        df[i9 + 2] = eq2;
                        df[i9 + 8] = eq8;
                        df[i9 + 4] = eq4;
                        df[i9 + 6] = eq6;
                    }
                }
            }
            node = node.next;
        }

        // Empty cells
        let prev = null;
        node = emptied.head;
        while (node !== null) {
            for (let y = node.y - 1; y <= node.y + 1; y++) {
                for (let x = node.x - 1; x <= node.x + 1; x++) {
                    let i = x + y * width;
                    if (x === node.x && y === node.y) {
                        type[i] = EMPTY;
                        continue;
                    }
                    if (type[i] === FLUID) type[i] = INTERF;
                }
            }
            prev = node;
            node = node.next;
        }

        // Handle excess mass
        node = filled.head;
        while (node != null) {
            let x = node.x;
            let y = node.y;
            let i = x + y * width;

            let mex = m[i] - rho[i];
            if (mex < 0) {
                node = node.next;
                continue;
            }

            m[i] = rho[i];

            let thisnx = nx[i];
            let thisny = ny[i];

            let eta1 = Math.max(thisnx, 0);
            let eta2 = Math.max(thisnx + thisny, 0);
            let eta3 = Math.max(thisny, 0);
            let eta4 = Math.max(-thisnx + thisny, 0);
            let eta5 = Math.max(-thisnx, 0);
            let eta6 = Math.max(-thisnx - thisny, 0);
            let eta7 = Math.max(-thisny, 0);
            let eta8 = Math.max(thisnx - thisny, 0);
            let etatotal = eta1 + eta2 + eta3 + eta4 + eta5 + eta6 + eta7 + eta8;
            if (etatotal > 0) {
                let etatotalinv = 1 / etatotal;
                m[i + 1] += mex * eta1 * etatotalinv;
                m[i + 1 + width] += mex * eta2 * etatotalinv;
                m[i + width] += mex * eta3 * etatotalinv;
                m[i - 1 + width] += mex * eta4 * etatotalinv;
                m[i - 1] += mex * eta5 * etatotalinv;
                m[i - 1 - width] += mex * eta6 * etatotalinv;
                m[i - width] += mex * eta7 * etatotalinv;
                m[i + 1 - width] += mex * eta8 * etatotalinv;
            }

            node = node.next;
        }

        node = emptied.head;
        while (node != null) {
            let i = node.x + node.y * width;

            let mex = m[i];
            if (mex > 0) {
                node = node.next;
                continue;
            }

            m[i] = 0;

            let thisnx = nx[i];
            let thisny = ny[i];
            let eta1 = -Math.min(-thisnx, 0);
            let eta2 = -Math.min(-thisnx - thisny, 0);
            let eta3 = -Math.min(-thisny, 0);
            let eta4 = -Math.min(thisnx - thisny, 0);
            let eta5 = -Math.min(thisnx, 0);
            let eta6 = -Math.min(thisnx + thisny, 0);
            let eta7 = -Math.min(thisny, 0);
            let eta8 = -Math.min(-thisnx + thisny, 0);
            let etatotal = eta1 + eta2 + eta3 + eta4 + eta5 + eta6 + eta7 + eta8;
            if (etatotal > 0) {
                let etatotalinv = 1 / etatotal;
                m[i + 1] += mex * eta1 * etatotalinv;
                m[i + 1 + width] += mex * eta2 * etatotalinv;
                m[i + width] += mex * eta3 * etatotalinv;
                m[i - 1 + width] += mex * eta4 * etatotalinv;
                m[i - 1] += mex * eta5 * etatotalinv;
                m[i - 1 - width] += mex * eta6 * etatotalinv;
                m[i - width] += mex * eta7 * etatotalinv;
                m[i + 1 - width] += mex * eta8 * etatotalinv;
            }

            node = node.next;
        }
    };

    this.simulate = function (steps = 1) {
        for (let step = 0; step < steps; step++) {
            collide();
            fluidfraction();
            stream();
            bounce();
            massflow();
        }
    };

    this.rho = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return rho[x + y * width];
    };

    this.u = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return [0, 0];
        return [ux[x + y * width], uy[x + y * width]];
    };

    this.curl = function (x, y) {
        if (x < 1 || x > width - 2 || y < 1 || y > height - 2) return 0;
        return uy[x + 1 + y * width] - uy[x - 1 + y * width] - ux[x + (y + 1) * width] + ux[x + (y - 1) * width];
    };

    this.obst = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return true;
        return type[x + y * width] === OBST;
    };

    this.mass = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return m[x + y * width];
    };

    this.isfluid = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return true;
        return type[x + y * width] > 0;
    };

    this.type = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return type[x + y * width];
    };

    this.interftype = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return interftype[x + y * width];
    };

    this.n = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return [0, 0];
        return [nx[x + y * width], ny[x + y * width]];
    };

    this.eps = function (x, y) {
        if (x < 0 || x > width - 1 || y < 0 || y > height - 1) return 0;
        return eps2[x + y * width] * 2;
    };

    this.setObst = function (x, y, bool) {
        if (x < 1 || x > width - 2 || y < 1 || y > height - 2) return;
        type[x + y * width] = (bool ? OBST : EMPTY);
    };

    this.fill = function (x, y) {
        if (x < 1 || x > width - 2 || y < 1 || y > height - 2) return;
        let i = x + y * width;
        if (type[i] === EMPTY) {
            let i9 = i * 9;
            calcEquil(1, 0, 0);
            df[i9] = eq0;
            df[i9 + 1] = eq1;
            df[i9 + 5] = eq5;
            df[i9 + 3] = eq3;
            df[i9 + 7] = eq7;
            df[i9 + 2] = eq2;
            df[i9 + 8] = eq8;
            df[i9 + 4] = eq4;
            df[i9 + 6] = eq6;

            let filled = new FlaggedList();
            let emptied = new FlaggedList();
            filled.addCoord(x, y);
            m[i] = 1;
            type[i] = FLUID;
            flagreinit(filled, emptied);
            fluidfraction();
        }
    };

    this.empty = function (x, y) {
        if (x < 1 || x > width - 2 || y < 1 || y > height - 2) return;
        let i = x + y * width;
        if (type[i] >= FLUID) {
            let filled = new FlaggedList();
            let emptied = new FlaggedList();
            emptied.addCoord(x, y);
            m[i] = 0;
            type[i] = EMPTY;
            flagreinit(filled, emptied);
            fluidfraction();
        }
    };

    this.fillall = function (xarr, yarr) {
        let filled = new FlaggedList();
        let emptied = new FlaggedList();
        for (let n = 0; n < xarr.length; n++) {
            let x = xarr[n];
            let y = yarr[n];
            if (x < 1 || x > width - 2 || y < 1 || y > height - 2) continue;
            let i = x + y * width;
            if (type[i] === EMPTY) {
                let i9 = i * 9;
                calcEquil(1, 0, 0);
                df[i9] = eq0;
                df[i9 + 1] = eq1;
                df[i9 + 5] = eq5;
                df[i9 + 3] = eq3;
                df[i9 + 7] = eq7;
                df[i9 + 2] = eq2;
                df[i9 + 8] = eq8;
                df[i9 + 4] = eq4;
                df[i9 + 6] = eq6;

                filled.addCoord(x, y);
                m[i] = 1;
                type[i] = FLUID;
            }
        }
        flagreinit(filled, emptied);
        fluidfraction();
    };

    this.drag = function (x, y, drag) {
        let lv = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

        let flow = 0;
        for (let i = 1; i < 9; i++) {
            let val;
            if (dot(drag, drag) > 0.0005)
                val = Math.max(dot(drag, lv[i]) / dot(lv[i], lv[i]), 0);
            else val = len(drag);
            df[(x + y * width) * 9 + i] += val;
            flow += val;
        }
        df[(x + y * width) * 9] -= flow;
    };

    this.viscosity = function () {
        return viscosity;
    };

    this.setViscosity = function (value) {
        viscosity = value;
        omega = 1.0 / (3.0 * viscosity + 0.5);
    };

}
