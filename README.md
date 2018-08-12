# Lattice Boltzmann Fluid Simulator

An interactive simulation using the Lattice Boltzmann method in Javascript.
[Play with the simulation!](https://briansemrau.github.io/fluidsim/bin)

### Future Plans

- [x] Basic LBM simulation with boundaries
- [x] Improve performance ~~using GPU acceleration~~ (GPU might conflict with adaptive topologies)
- ~~[ ] Implement Smagorinsky sub-grid model for turbulent flows (Thürey, Section 3.3)~~ (Deemed not important)
- [ ] Add gravity with user interactivity
- [ ] Implement free surface for water simulation (Thürey, Chapter 4)
- [ ] Implement moving obstacle boundary conditions (Thürey, Chapter 5)
- [ ] Explore adaptive topology for large scale simulations (Maybe Thürey, Chapter 7)

### References

  * [Nils Thürey (2007). Physically based Animation of Free Surface Flows with the Lattice Boltzmann Method. _University of Erlangen-Nürnberg_.](http://www.thuerey.de/ntoken/download/nthuerey_070313_phdthesis.pdf)
  * [Sauro Succi et al. (2010). Lattice Boltzmann Method. _Scholarpedia_, 5(5):9507.](http://www.scholarpedia.org/article/Lattice_Boltzmann_Method)
  * [Wikipedia contributors. Lattice Boltzmann methods. _Wikipedia_. Retrieved August 4, 2018.](https://en.wikipedia.org/w/index.php?title=Lattice_Boltzmann_methods&oldid=845945453)
  * [Dan Schroeder. Fluid Dynamics Simulation. _Weber State University Physics Department_. Retrieved August 11, 2018.](http://physics.weber.edu/schroeder/fluids/)