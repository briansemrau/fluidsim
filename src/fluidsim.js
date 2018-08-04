// fluidsim.js

function FluidSim(width, height) {
    this.width = width;
    this.height = height;

    // Cells
    this.f = new Array((width + 2) * (height + 2)).fill(0).map(() => { return new Array(9).fill(1. / 9.) });
    this.f_next = new Array((width + 2) * (height + 2)).fill(0).map(() => { return new Array(9) });
    this.bound = new Array((width + 2) * (height + 2)).fill(false);

    // add walls
    for (let x = -1; x < width + 1; x++) {
        this.bound[this.i(x, -1)] = true;
        this.bound[this.i(x, height)] = true;
    }
    for (let y = -1; y < height + 1; y++) {
        this.bound[this.i(-1, y)] = true;
        this.bound[this.i(width, y)] = true;
    }

    // Lattice velocities
    this.lv = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [0, 0]];
    // Lattice velocity index offsets
    this.lv_offset = this.lv.map((v) => { return v[0] + v[1] * (width + 2) });
    // Lattice weights
    this.lv_w = [1. / 9., 1. / 36., 1. / 9., 1. / 36., 1. / 9., 1. / 36., 1. / 9., 1. / 36., 4. / 9.];

    // Speed of sound (c_s^2)
    this.c_sqr = 1. / 3.;

    // Viscosity  (range: (0, 2))
    this.omega = 1.0;

    // Debug drawing
    this.rho = new Array((width + 2) * (height + 2)).fill(0);
    this.u = new Array((width + 2) * (height + 2)).map(() => { return new Array(2).fill(0) });
}

FluidSim.prototype.i = function (x, y) {
    return (x + 1) + (y + 1) * (this.width + 2);
};

FluidSim.prototype.simulate = function () {
    if (this.paused) return;

    // Local references for improved readability
    let width = this.width;
    let height = this.height;
    let f = this.f;
    let f_next = this.f_next;
    let bound = this.bound;
    let lv = this.lv;
    let lv_offset = this.lv_offset;
    let lv_w = this.lv_w;
    let omega = this.omega;


    // ########################
    // Lattice Boltzmann Method
    // ########################

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let xy = this.i(x, y);

            if (bound[xy])
                continue;

            // Stream distribution functions from adjacent cells
            // Use bounce-back rule for obstacles
            let f_s = lv_offset.map((e_i, i) => {
                if (bound[xy - e_i]) return f[xy][(i + 4) % 8];
                else return f[xy - e_i][i];
            });

            // Calculate density of the cell
            let rho = sum(f_s);

            // Calculate fluid velocity of the cell
            let u = lv.reduce((sum, lv, i) => { return sum.map((value, n) => { return value + lv[n] * f_s[i] }) }, [0, 0]);

            // TODO: gravity

            // Calculate the equilibrium distribution
            let f_eq = lv_w.map((w_i, i) => { return w_i * rho * (1 + dot(u, lv[i]) / this.c_sqr + 0.5 * pow2(dot(u, lv[i])) - dot(u, u) / (2 * this.c_sqr)) });

            // Relax towards equilibrium state based on viscosity
            f_next[xy] = f_s.map((f_s_i, i) => { return f_s_i - omega * (f_s_i - f_eq[i]) });

            // Store values for drawing
            this.rho[xy] = rho;
            this.u[xy] = u;
        }
    }

    // Update current state
    this.f = f_next.map((dfs) => { return dfs.map((v) => {return v}) });

};
