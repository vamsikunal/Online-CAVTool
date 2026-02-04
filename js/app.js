/**
 * CAVTool Main Application
 * Wires together the UI, simulation engine, and visualization
 */

import { SimulationEngine } from './simulation.js';
import { CanvasVisualization, TimelineVisualization } from './visualization.js';

// Default scripts
const DEFAULT_SCRIPTS = {
    'aimd.cav': `#define_param alpha range 0.1 to 1   default 0.1
#define_param beta  range 0.1 to 0.9 default 0.5
maxrate = 1.0;

if(traffic > 1){
    rate = rate * beta;
}
else{
    rate = rate + alpha;
    rate = min(rate, maxrate);
}`,

    'aiad.cav': `#define_param a range 0.1 to 0.9 default 0.2
#define_param b range 0.1 to 0.9 default 0.3
maxrate = 1.0;
minrate = 0.0;

if(traffic > 1){
    rate = rate - b;
    rate = max(rate, minrate);
}
else{
    rate = rate + a;
    rate = min(rate, maxrate);
}`,

    'mimd.cav': `#define_param a range 0.1 to 2.0 default 1.2
#define_param b range 0.1 to 0.9 default 0.5
maxrate = 1.0;

if(traffic > 1){
    rate = rate * b;
}
else{
    rate = rate * a;
    rate = min(rate, maxrate);
}`,

    'miad.cav': `#define_param a range 0.1 to 2.0 default 1.2
#define_param b range 0.1 to 0.9 default 0.3
maxrate = 1.0;
minrate = 0.0;

if(traffic > 1){
    rate = rate - b;
    rate = max(rate, minrate);
}
else{
    rate = rate * a;
    rate = min(rate, maxrate);
}`,

    'cadpc.cav': `#define_param a range 0.1 to 1 default 0.5
maxrate = 1.0;
minrate = 0.0;

rate = rate * a * (1 - rate - traffic) + rate;
rate = max(minrate, min(maxrate, rate));`
};

class CAVToolApp {
    constructor() {
        this.engine = new SimulationEngine();
        this.canvas = null;
        this.timeline = null;
        this.terminalOutput = [];
        this.syncEnabled = true;

        // UI state
        this.params = {
            sender0: {},
            sender1: {}
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupUI();
        this.loadDefaultScripts();
        this.log('[SYS] CAVTool Web initialized');
        this.log('[OK] Ready for congestion simulation.');
    }

    setupCanvas() {
        // Get the main canvas (already exists in HTML)
        const mainCanvas = document.getElementById('main-canvas');
        if (mainCanvas) {
            this.canvas = new CanvasVisualization(mainCanvas);
            this.canvas.init();

            // Click handler for starting simulation
            mainCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        } else {
            console.error('Main canvas not found');
        }

        // Setup timeline canvas if timeline checkbox is checked
        const timelineCheckbox = document.getElementById('plot-timeline');
        if (timelineCheckbox) {
            timelineCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.createTimeline();
                } else {
                    this.removeTimeline();
                }
            });
        }
    }

    createTimeline() {
        const container = document.getElementById('timeline-container');
        if (container && !this.timeline) {
            container.classList.remove('hidden');
            const timelineCanvas = document.getElementById('timeline-canvas');
            if (timelineCanvas) {
                this.timeline = new TimelineVisualization(timelineCanvas);
            }
        }
    }

    removeTimeline() {
        const container = document.getElementById('timeline-container');
        if (container) {
            container.classList.add('hidden');
        }
        this.timeline = null;
    }

    setupUI() {
        // Duration input
        const durationInput = document.getElementById('duration');
        if (durationInput) {
            durationInput.addEventListener('change', (e) => {
                this.engine.setDuration(parseInt(e.target.value));
            });
        }

        // RTT inputs (using IDs)
        const rtt1Input = document.getElementById('rtt1');
        if (rtt1Input) {
            rtt1Input.addEventListener('change', (e) => {
                this.engine.setRTT(1, parseInt(e.target.value));
            });
        }

        const rtt2Input = document.getElementById('rtt2');
        if (rtt2Input) {
            rtt2Input.addEventListener('change', (e) => {
                this.engine.setRTT(0, parseInt(e.target.value));
            });
        }

        // Animation delay
        const delayInput = document.getElementById('animation-delay');
        if (delayInput) {
            delayInput.addEventListener('change', (e) => {
                this.engine.setAnimationDelay(parseInt(e.target.value));
            });
        }

        // Script selectors
        this.setupScriptSelectors();

        // Action buttons
        this.setupButtons();

        // Sync input checkbox
        this.setupSyncInput();
    }

    setupScriptSelectors() {
        // User 1 script selector (Y-axis)
        const scriptUser1 = document.getElementById('script-user1');
        if (scriptUser1) {
            scriptUser1.innerHTML = '';
            Object.keys(DEFAULT_SCRIPTS).forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                scriptUser1.appendChild(option);
            });
            scriptUser1.addEventListener('change', (e) => {
                this.loadScriptForUser(1, e.target.value);
            });
        }

        // User 2 script selector (X-axis)
        const scriptUser2 = document.getElementById('script-user2');
        if (scriptUser2) {
            scriptUser2.innerHTML = '';
            Object.keys(DEFAULT_SCRIPTS).forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                scriptUser2.appendChild(option);
            });
            scriptUser2.addEventListener('change', (e) => {
                this.loadScriptForUser(0, e.target.value);
            });
        }
    }

    setupButtons() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            const text = button.textContent.toLowerCase().trim();

            if (text.includes('repaint')) {
                button.addEventListener('click', () => this.runSimulation());
            } else if (text.includes('clear')) {
                button.addEventListener('click', () => this.clearCanvas());
            } else if (text.includes('exit')) {
                button.addEventListener('click', () => this.handleExit());
            } else if (text.includes('reset')) {
                button.addEventListener('click', (e) => {
                    const panel = e.target.closest('section');
                    this.resetParamsForPanel(panel);
                });
            }
        });
    }

    setupSyncInput() {
        const checkbox = document.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.closest('label')?.textContent.includes('Synchronize')) {
            checkbox.addEventListener('change', (e) => {
                this.syncEnabled = e.target.checked;
                this.log(`[SYS] Input synchronization ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }
    }

    loadDefaultScripts() {
        // Load AIMD for both users by default
        this.loadScriptForUser(0, 'aimd.cav');
        this.loadScriptForUser(1, 'aimd.cav');
    }

    loadScriptForUser(senderIndex, scriptName) {
        const script = DEFAULT_SCRIPTS[scriptName];
        if (!script) {
            this.log(`[ERR] Script not found: ${scriptName}`);
            return;
        }

        this.engine.setScript(senderIndex, script);
        this.log(`[SYS] Loading ${scriptName} for User ${senderIndex + 1}...`);

        // Update parameter sliders
        this.updateParamSliders(senderIndex);
    }

    updateParamSliders(senderIndex) {
        const params = this.engine.getParams(senderIndex);
        const panelId = senderIndex === 1 ? 'user1-panel' : 'user2-panel';
        const panel = document.getElementById(panelId);

        if (!panel) return;

        // Find parameter containers in the panel
        const paramContainers = panel.querySelectorAll('.mb-6');

        params.filter(p => !p.isStatic).forEach((param, i) => {
            if (i < paramContainers.length) {
                const container = paramContainers[i];
                const label = container.querySelector('label');
                const numberInput = container.querySelector('input[type="number"]');
                const rangeInput = container.querySelector('input[type="range"]');
                const minSpan = container.querySelectorAll('.text-xs span')[0];
                const maxSpan = container.querySelectorAll('.text-xs span')[1];

                if (label) label.textContent = param.name.charAt(0).toUpperCase() + param.name.slice(1);
                if (numberInput) {
                    numberInput.value = param.default;
                    numberInput.min = param.min;
                    numberInput.max = param.max;
                    numberInput.step = 0.1;
                    numberInput.dataset.param = param.name;
                    numberInput.dataset.sender = senderIndex;
                    numberInput.dataset.default = param.default;

                    // Remove old listeners and add new one
                    const newInput = numberInput.cloneNode(true);
                    numberInput.parentNode.replaceChild(newInput, numberInput);
                    newInput.addEventListener('input', (e) => {
                        const val = parseFloat(e.target.value);
                        this.params[`sender${senderIndex}`][param.name] = val;
                        const rangeEl = container.querySelector('input[type="range"]');
                        if (rangeEl) rangeEl.value = val;
                    });
                }
                if (rangeInput) {
                    rangeInput.value = param.default;
                    rangeInput.min = param.min;
                    rangeInput.max = param.max;
                    rangeInput.step = 0.1;
                    rangeInput.dataset.param = param.name;

                    // Remove old listeners and add new one
                    const newRange = rangeInput.cloneNode(true);
                    rangeInput.parentNode.replaceChild(newRange, rangeInput);
                    newRange.addEventListener('input', (e) => {
                        const val = parseFloat(e.target.value);
                        this.params[`sender${senderIndex}`][param.name] = val;
                        const numEl = container.querySelector('input[type="number"]');
                        if (numEl) numEl.value = val;
                    });
                }
                if (minSpan) minSpan.textContent = param.min;
                if (maxSpan) maxSpan.textContent = param.max;

                // Initialize param value
                this.params[`sender${senderIndex}`][param.name] = param.default;
            }
        });
    }

    handleCanvasClick(event) {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Scale to canvas coordinates
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const rates = this.canvas.pixelToRate(x * scaleX, y * scaleY);

        // Update input fields
        const xInput = document.getElementById('start-x');
        const yInput = document.getElementById('start-y');
        if (xInput) xInput.value = rates.x.toFixed(3);
        if (yInput) yInput.value = rates.y.toFixed(3);

        // Run simulation from this point
        this.runSimulation(rates.x, rates.y);
    }

    async runSimulation(startX = null, startY = null) {
        if (this.engine.isRunning) {
            this.engine.stop();
            return;
        }

        // Get start position
        const xInput = document.getElementById('start-x');
        const yInput = document.getElementById('start-y');
        const x = startX !== null ? startX : parseFloat(xInput?.value || 0);
        const y = startY !== null ? startY : parseFloat(yInput?.value || 0);

        this.engine.setStartPosition(x, y);
        this.log(`[SYS] Starting simulation at (${x.toFixed(3)}, ${y.toFixed(3)})`);

        // Clear and initialize canvas
        this.canvas.init();
        this.canvas.drawStartPoint(x, y);

        // Reset timeline if enabled
        if (this.timeline) {
            this.timeline.clear();
        }

        // Setup callbacks
        this.engine.onStep = (stepData) => {
            this.canvas.drawSegment(
                { x: stepData.oldX, y: stepData.oldY },
                { x: stepData.x, y: stepData.y },
                stepData.progress
            );
            this.canvas.drawCurrentPoint(stepData.x, stepData.y);

            if (this.timeline) {
                this.timeline.addDataPoint(
                    stepData.step,
                    stepData.y, // User 1 (Y-axis)
                    stepData.x, // User 2 (X-axis)
                    stepData.distance
                );
                this.timeline.render(this.engine.duration);
                this.timeline.drawLegend();
            }
        };

        this.engine.onComplete = (trajectory) => {
            const last = trajectory[trajectory.length - 1];
            this.log(`[OK] Simulation complete. Final: (${last.x.toFixed(3)}, ${last.y.toFixed(3)})`);
            this.log(`[OK] Distance from optimum: ${last.distance.toFixed(4)}`);
        };

        this.engine.onError = (errors) => {
            errors.forEach(err => this.log(`[ERR] ${err}`));
        };

        await this.engine.run(this.params);
    }

    clearCanvas() {
        this.engine.stop();
        this.engine.reset();
        if (this.canvas) {
            this.canvas.init();
        }
        if (this.timeline) {
            this.timeline.clear();
        }
        this.log('[SYS] Canvas cleared');
    }

    resetParamsForPanel(panel) {
        const inputs = panel?.querySelectorAll('input[type="number"]');
        inputs?.forEach(input => {
            if (input.dataset.param) {
                const defaultVal = parseFloat(input.dataset.default || input.min);
                input.value = defaultVal;
                const senderIndex = parseInt(input.dataset.sender);
                if (!isNaN(senderIndex)) {
                    this.params[`sender${senderIndex}`][input.dataset.param] = defaultVal;
                }
                // Update corresponding range input
                const container = input.closest('.mb-6');
                const rangeInput = container?.querySelector('input[type="range"]');
                if (rangeInput) rangeInput.value = defaultVal;
            }
        });
        this.log('[SYS] Parameters reset to defaults');
    }

    handleExit() {
        this.log('[SYS] Goodbye!');
        // In a web app, we can't really "exit", but we can reset
        this.clearCanvas();
    }

    log(message) {
        this.terminalOutput.push(message);

        // Keep only last 50 messages
        if (this.terminalOutput.length > 50) {
            this.terminalOutput.shift();
        }

        // Update terminal textarea
        const terminal = document.querySelector('textarea[readonly]');
        if (terminal) {
            terminal.value = this.terminalOutput.join('\n') + '\n_';
            terminal.scrollTop = terminal.scrollHeight;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cavtool = new CAVToolApp();
});

// Export for use in other modules
export { CAVToolApp, DEFAULT_SCRIPTS };
