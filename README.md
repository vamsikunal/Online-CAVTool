# CAVTool - Congestion Avoidance Visualization Tool

A modern web-based visualization tool for understanding and testing congestion avoidance mechanisms in computer networks.

## Overview

CAVTool visualizes how two network senders share a single resource fairly using vector diagrams. It helps understand congestion avoidance algorithms like **AIMD** (Additive Increase Multiplicative Decrease), **AIAD**, **MIMD**, **MIAD** and **CADPC**.

### Key Features

- **Interactive Canvas**: Click anywhere to start a simulation from that point
- **Real-time Trajectory Animation**: Watch how sender rates converge to the optimal fair share
- **Custom Scripting Language**: Define your own congestion avoidance mechanisms
- **Parameter Sliders**: Dynamically adjust algorithm parameters
- **Asynchronous Mode**: Test with different Round Trip Times (RTT) for each sender
- **Dark Mode UI**: Modern, clean interface

## Usage

1. **Select Scripts**: Choose congestion avoidance scripts for User 1 (Y-axis) and User 2 (X-axis)
2. **Adjust Parameters**: Use sliders to modify algorithm parameters (e.g., alpha, beta)
3. **Set RTT**: Configure Round Trip Times for asynchronous behavior
4. **Click Canvas**: Click on the coordinate system to set starting rates and run simulation
5. **Observe**: Watch the trajectory converge toward the optimal point (0.5, 0.5)

### Understanding the Visualization

| Element | Meaning |
|---------|---------|
| **Red dashed line** | Fairness line (x = y) - Equal sharing |
| **Green dashed line** | Efficiency line (x + y = 1) - Full utilization |
| **Blue center point** | Optimal operating point (0.5, 0.5) |
| **Trajectory** | Path of sender rates over time |

## Scripting Language

CAVTool uses a simple scripting language to define congestion avoidance mechanisms.

### Predefined Variables
- `rate` - Current sender rate (0-1)
- `traffic` - Sum of all sender rates

### Example: AIMD
```
#define_param alpha range 0.1 to 1 default 0.1
#define_param beta range 0.1 to 0.9 default 0.5

if(traffic > 1){
    rate = rate * beta;    # Multiplicative Decrease
}
else{
    rate = rate + alpha;   # Additive Increase
    rate = min(rate, 1.0);
}
```


## Project Structure

```
CAVTool/
├── index.html          # Main application
├── js/
│   ├── app.js          # Main application logic
│   ├── parser.js       # Script parser
│   ├── tokenizer.js    # Lexical analyzer
│   ├── simulation.js   # Simulation engine
│   └── visualization.js # Canvas rendering
├── scripts/            # Example .cav scripts

## Credits

This tool visualizes directly from the concepts from:

> **[1] D. Chiu and R. Jain**, "Analysis of the Increase/Decrease Algorithms for Congestion Avoidance in Computer Networks", *Journal of Computer Networks and ISDN*, 17(1), 1989, pp. 1-14.

The vector diagram approach helps analyze how different increase/decrease policies affect convergence to fair and efficient resource allocation.

### Original Implementation
- **Author**: Christian Sternagel (csac3692@uibk.ac.at)
- **Supervisor**: Michael Welzl
- **Original Version**: Java Swing application (2003)
- **Original Tool**: [https://folk.universitetetioslo.no/michawe/research/tools/cavt/](https://folk.universitetetioslo.no/michawe/research/tools/cavt/index.html)

### Web Implementation
This web-based reimplementation provides the same functionality in a modern browser environment, making it accessible without requiring Java installation.


---

*CAVTool helps visualize how networks achieve fair sharing of resources through congestion avoidance mechanisms.*
