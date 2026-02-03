/**
 * Simulation Engine
 * Handles the congestion avoidance simulation logic
 */

import { ScriptParser } from './parser.js';

export class Sender {
    constructor(scriptContent = '') {
        this.rate = 0;
        this.parser = new ScriptParser(scriptContent);
        this.scriptContent = scriptContent;
    }

    setScript(content) {
        this.scriptContent = content;
        this.parser = new ScriptParser(content);
    }

    setRate(rate) {
        this.rate = Math.max(0, Math.min(1, rate)); // Clamp to [0, 1]
    }

    getRate() {
        return this.rate;
    }

    /**
     * Execute one step of the congestion avoidance algorithm
     * @param {number} traffic - Total traffic (sum of all sender rates)
     * @param {Object} params - Parameter values from UI sliders
     */
    calculate(traffic, params = {}) {
        // Set parameters from sliders
        for (const [name, value] of Object.entries(params)) {
            this.parser.setVariable(name, value);
        }

        const result = this.parser.parse({
            rate: this.rate,
            traffic: traffic
        });

        if (result.errors.length > 0) {
            return { success: false, errors: result.errors };
        }

        this.rate = Math.max(0, Math.min(1, result.rate)); // Clamp to [0, 1]
        return { success: true, rate: this.rate };
    }

    getParams() {
        // Parse once to extract parameters
        this.parser.parse({ rate: 0, traffic: 0 });
        return this.parser.getParams();
    }

    resetStaticVars() {
        this.parser.resetStaticVars();
    }
}

export class SimulationEngine {
    constructor() {
        this.senders = [new Sender(), new Sender()];
        this.duration = 50;
        this.rtt = [1, 1]; // Round trip times for each sender
        this.animationDelay = 1;
        this.isRunning = false;
        this.currentStep = 0;
        this.trajectory = [];
        this.onStep = null; // Callback for each simulation step
        this.onComplete = null; // Callback when simulation completes
        this.onError = null; // Error callback
    }

    setScript(senderIndex, content) {
        this.senders[senderIndex].setScript(content);
    }

    setDuration(duration) {
        this.duration = Math.max(1, parseInt(duration) || 50);
    }

    setRTT(senderIndex, rtt) {
        this.rtt[senderIndex] = Math.max(1, parseInt(rtt) || 1);
    }

    setAnimationDelay(delay) {
        this.animationDelay = Math.max(1, parseInt(delay) || 1);
    }

    setStartPosition(x, y) {
        this.senders[0].setRate(x);
        this.senders[1].setRate(y);
    }

    getParams(senderIndex) {
        return this.senders[senderIndex].getParams();
    }

    reset() {
        this.isRunning = false;
        this.currentStep = 0;
        this.trajectory = [];
        this.senders.forEach(s => s.resetStaticVars());
    }

    /**
     * Run the simulation
     * @param {Object} params - { sender0: { alpha: 0.1, ... }, sender1: { ... } }
     */
    async run(params = { sender0: {}, sender1: {} }) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.currentStep = 0;
        this.trajectory = [];

        // Reset static variables for fresh simulation
        this.senders.forEach(s => s.resetStaticVars());

        // Record initial position
        const startX = this.senders[0].getRate();
        const startY = this.senders[1].getRate();
        this.trajectory.push({ x: startX, y: startY, step: 0 });

        for (let step = 1; step <= this.duration && this.isRunning; step++) {
            this.currentStep = step;

            const oldRates = [this.senders[0].getRate(), this.senders[1].getRate()];
            const traffic = oldRates[0] + oldRates[1];

            // Execute each sender's algorithm based on RTT
            const errors = [];
            for (let i = 0; i < this.senders.length; i++) {
                if (step % this.rtt[i] === 0) {
                    const senderParams = i === 0 ? params.sender0 : params.sender1;
                    const result = this.senders[i].calculate(traffic, senderParams);
                    if (!result.success) {
                        errors.push(...result.errors);
                    }
                }
            }

            if (errors.length > 0 && this.onError) {
                this.onError(errors);
            }

            const newX = this.senders[0].getRate();
            const newY = this.senders[1].getRate();

            // Calculate distance from optimum (0.5, 0.5)
            const distance = Math.sqrt(Math.pow(0.5 - newX, 2) + Math.pow(0.5 - newY, 2));

            const stepData = {
                step,
                oldX: oldRates[0],
                oldY: oldRates[1],
                x: newX,
                y: newY,
                traffic: newX + newY,
                distance,
                progress: step / this.duration
            };

            this.trajectory.push(stepData);

            if (this.onStep) {
                this.onStep(stepData);
            }

            // Animation delay
            await this.sleep(this.animationDelay);
        }

        this.isRunning = false;

        if (this.onComplete) {
            this.onComplete(this.trajectory);
        }
    }

    stop() {
        this.isRunning = false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTrajectory() {
        return this.trajectory;
    }
}
