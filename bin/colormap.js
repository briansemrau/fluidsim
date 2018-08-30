// colormap.js
// Color values grabbed from https://github.com/bhaskarvk/colormap/blob/master/inst/js/colormap.js

const colors = {
    "jet": [[0, 0, 0, 0.51], [0.125, 0, 0.24, 0.66], [0.375, 0.02, 1, 1], [0.625, 1, 1, 0], [0.875, 0.98, 0, 0], [1, 0.5, 0, 0]],
    "hsv": [[0, 1, 0, 0], [0.169, 1, 1, 0], [0.337, 0, 1, 0], [0.5, 0, 1, 1], [0.671, 0, 0, 1], [0.839, 1, 0, 1], [1, 1, 0, 0]],
    "hot": [[0, 0, 0, 0], [0.3, 0.9, 0, 0], [0.6, 1, 0.8, 0], [1, 1, 1, 1]],
    "cool": [[0, 0, 1, 1], [1, 1, 0, 1]],
    "spring": [[0, 1, 0, 1], [1, 1, 1, 0]],
    "summer": [[0, 0, 0.5, 0.4], [1, 1, 1, 0.4]],
    "autumn": [[0, 1, 0, 0], [1, 1, 1, 0]],
    "winter": [[0, 0, 0, 1], [1, 0, 1, 0.5]],
    // "bone": [],
    // "copper": [],
    // "greys": [],
    // "ylgnbu": [],
    // "greens": [],
    // "ylorrd": [],
    // "bluered": [],
    // "rdbu": [],
    // "picnic": [],
    // "rainbow": [],
    // "portland": [],
    // "blackbody": [],
    // "earth": [],
    // "electric": [],
    // "alpha": [],
    // "viridis": [],
    // "inferno": [],
    // "magma": [],
    // "plasma": [],
    // "warm": [],
    // "cool": [],
    // "rainbow-soft": [],
    // "bathymetry": [],
    // "cdom": [],
    // "chlorophyll": [],
    // "density": [],
    // "freesurface-blue": [],
    // "freesurface-red": [],
    // "oxygen": [],
    // "par": [{"index":0,"rgb":[51,20,24]},{"index":0.13,"rgb":[90,32,35]},{"index":0.25,"rgb":[129,44,34]},{"index":0.38,"rgb":[159,68,25]},{"index":0.5,"rgb":[182,99,19]},{"index":0.63,"rgb":[199,134,22]},{"index":0.75,"rgb":[212,171,35]},{"index":0.88,"rgb":[221,210,54]},{"index":1,"rgb":[225,253,75]}],
    //
    // "phase": [{"index":0,"rgb":[145,105,18]},{"index":0.13,"rgb":[184,71,38]},{"index":0.25,"rgb":[186,58,115]},{"index":0.38,"rgb":[160,71,185]},{"index":0.5,"rgb":[110,97,218]},{"index":0.63,"rgb":[50,123,164]},{"index":0.75,"rgb":[31,131,110]},{"index":0.88,"rgb":[77,129,34]},{"index":1,"rgb":[145,105,18]}],
    //
    // "salinity": [{"index":0,"rgb":[42,24,108]},{"index":0.13,"rgb":[33,50,162]},{"index":0.25,"rgb":[15,90,145]},{"index":0.38,"rgb":[40,118,137]},{"index":0.5,"rgb":[59,146,135]},{"index":0.63,"rgb":[79,175,126]},{"index":0.75,"rgb":[120,203,104]},{"index":0.88,"rgb":[193,221,100]},{"index":1,"rgb":[253,239,154]}],
    //
    // "temperature": [{"index":0,"rgb":[4,35,51]},{"index":0.13,"rgb":[23,51,122]},{"index":0.25,"rgb":[85,59,157]},{"index":0.38,"rgb":[129,79,143]},{"index":0.5,"rgb":[175,95,130]},{"index":0.63,"rgb":[222,112,101]},{"index":0.75,"rgb":[249,146,66]},{"index":0.88,"rgb":[249,196,65]},{"index":1,"rgb":[232,250,91]}],
    //
    // "turbidity": [{"index":0,"rgb":[34,31,27]},{"index":0.13,"rgb":[65,50,41]},{"index":0.25,"rgb":[98,69,52]},{"index":0.38,"rgb":[131,89,57]},{"index":0.5,"rgb":[161,112,59]},{"index":0.63,"rgb":[185,140,66]},{"index":0.75,"rgb":[202,174,88]},{"index":0.88,"rgb":[216,209,126]},{"index":1,"rgb":[233,246,171]}],
    //
    // "velocity-blue": [{"index":0,"rgb":[17,32,64]},{"index":0.13,"rgb":[35,52,116]},{"index":0.25,"rgb":[29,81,156]},{"index":0.38,"rgb":[31,113,162]},{"index":0.5,"rgb":[50,144,169]},{"index":0.63,"rgb":[87,173,176]},{"index":0.75,"rgb":[149,196,189]},{"index":0.88,"rgb":[203,221,211]},{"index":1,"rgb":[254,251,230]}],
    //
    // "velocity-green": [{"index":0,"rgb":[23,35,19]},{"index":0.13,"rgb":[24,64,38]},{"index":0.25,"rgb":[11,95,45]},{"index":0.38,"rgb":[39,123,35]},{"index":0.5,"rgb":[95,146,12]},{"index":0.63,"rgb":[152,165,18]},{"index":0.75,"rgb":[201,186,69]},{"index":0.88,"rgb":[233,216,137]},{"index":1,"rgb":[255,253,205]}],
    //
    // "cubehelix": [{"index":0,"rgb":[0,0,0]},{"index":0.07,"rgb":[22,5,59]},{"index":0.13,"rgb":[60,4,105]},{"index":0.2,"rgb":[109,1,135]},{"index":0.27,"rgb":[161,0,147]},{"index":0.33,"rgb":[210,2,142]},{"index":0.4,"rgb":[251,11,123]},{"index":0.47,"rgb":[255,29,97]},{"index":0.53,"rgb":[255,54,69]},{"index":0.6,"rgb":[255,85,46]},{"index":0.67,"rgb":[255,120,34]},{"index":0.73,"rgb":[255,157,37]},{"index":0.8,"rgb":[241,191,57]},{"index":0.87,"rgb":[224,220,93]},{"index":0.93,"rgb":[218,241,142]},{"index":1,"rgb":[227,253,198]}]

};

function colormap(value, color) {
    if (value < 0) value = 0;
    else if (value > 1) value = 1;

    for (let i = 1; i < color.length; i++) {
        if (value <= color[i][0]) {
            let a = color[i - 1];
            let b = color[i];

            let wa = (value - b[0]) / (a[0] - b[0]);
            if (wa > 1) wa = 1;
            let wb = 1 - wa;

            return [a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb];
        }
    }
    return [0, 0, 0];
}