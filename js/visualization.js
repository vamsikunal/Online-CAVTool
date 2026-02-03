/**
 * Canvas Visualization
 * Handles the coordinate system canvas and trajectory plotting
 */

export class CanvasVisualization {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.width = 500;
        this.height = 500;
        this.padding = 0;
        this.trajectoryPoints = [];

        // Set canvas size
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    /**
     * Convert rate (0-1) to canvas pixel coordinates
     */
    rateToPixel(rateX, rateY) {
        const x = this.padding + rateX * (this.width - 2 * this.padding);
        const y = this.height - this.padding - rateY * (this.height - 2 * this.padding);
        return { x, y };
    }

    /**
     * Convert canvas pixel to rate coordinates
     */
    pixelToRate(pixelX, pixelY) {
        const rateX = (pixelX - this.padding) / (this.width - 2 * this.padding);
        const rateY = 1 - (pixelY - this.padding) / (this.height - 2 * this.padding);
        return {
            x: Math.max(0, Math.min(1, rateX)),
            y: Math.max(0, Math.min(1, rateY))
        };
    }

    /**
     * Clear the canvas and redraw base elements
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.trajectoryPoints = [];
    }

    /**
     * Draw the efficiency line (x + y = 1)
     */
    drawEfficiencyLine() {
        const start = this.rateToPixel(0, 1);
        const end = this.rateToPixel(1, 0);

        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = '#22C55E'; // Green
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Draw the fairness line (x = y)
     */
    drawFairnessLine() {
        const start = this.rateToPixel(0, 0);
        const end = this.rateToPixel(1, 1);

        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = '#EF4444'; // Red
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Draw the optimum point (0.5, 0.5)
     */
    drawOptimumPoint() {
        const point = this.rateToPixel(0.5, 0.5);

        // Glow effect
        const gradient = this.ctx.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, 15
        );
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.8)');
        gradient.addColorStop(0.5, 'rgba(37, 99, 235, 0.3)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

        this.ctx.beginPath();
        this.ctx.fillStyle = gradient;
        this.ctx.arc(point.x, point.y, 15, 0, Math.PI * 2);
        this.ctx.fill();

        // Center dot
        this.ctx.beginPath();
        this.ctx.fillStyle = '#2563EB';
        this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    /**
     * Initialize the canvas with base elements
     */
    init() {
        this.clear();
        this.drawEfficiencyLine();
        this.drawFairnessLine();
        this.drawOptimumPoint();
    }

    /**
     * Draw a trajectory segment
     * @param {Object} from - { x, y } rates
     * @param {Object} to - { x, y } rates
     * @param {number} progress - 0-1 for color fading
     */
    drawSegment(from, to, progress = 1) {
        const fromPixel = this.rateToPixel(from.x, from.y);
        const toPixel = this.rateToPixel(to.x, to.y);

        // Blue with fading alpha based on progress
        const alpha = 0.3 + (1 - progress) * 0.7;
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(fromPixel.x, fromPixel.y);
        this.ctx.lineTo(toPixel.x, toPixel.y);
        this.ctx.stroke();

        // Draw point at end
        this.ctx.beginPath();
        this.ctx.fillStyle = '#1e293b';
        this.ctx.arc(toPixel.x, toPixel.y, 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#2563EB';
        this.ctx.lineWidth = 1.5;
        this.ctx.arc(toPixel.x, toPixel.y, 4, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    /**
     * Draw a starting point marker
     */
    drawStartPoint(x, y) {
        const pixel = this.rateToPixel(x, y);

        // Outer ring
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#F59E0B'; // Amber
        this.ctx.lineWidth = 2;
        this.ctx.arc(pixel.x, pixel.y, 8, 0, Math.PI * 2);
        this.ctx.stroke();

        // Inner dot
        this.ctx.beginPath();
        this.ctx.fillStyle = '#F59E0B';
        this.ctx.arc(pixel.x, pixel.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw current position marker
     */
    drawCurrentPoint(x, y) {
        const pixel = this.rateToPixel(x, y);

        // Glow
        const gradient = this.ctx.createRadialGradient(
            pixel.x, pixel.y, 0,
            pixel.x, pixel.y, 12
        );
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        this.ctx.beginPath();
        this.ctx.fillStyle = gradient;
        this.ctx.arc(pixel.x, pixel.y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Dot
        this.ctx.beginPath();
        this.ctx.fillStyle = '#10B981';
        this.ctx.arc(pixel.x, pixel.y, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.arc(pixel.x, pixel.y, 5, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    /**
     * Redraw the entire trajectory
     */
    redrawTrajectory(trajectory) {
        this.init();

        if (trajectory.length === 0) return;

        // Draw start point
        this.drawStartPoint(trajectory[0].x, trajectory[0].y);

        // Draw all segments
        for (let i = 1; i < trajectory.length; i++) {
            const prev = trajectory[i - 1];
            const curr = trajectory[i];
            const progress = i / trajectory.length;
            this.drawSegment(
                { x: prev.x, y: prev.y },
                { x: curr.x, y: curr.y },
                progress
            );
        }

        // Draw current position
        const last = trajectory[trajectory.length - 1];
        this.drawCurrentPoint(last.x, last.y);
    }
}

/**
 * Timeline Visualization
 * Shows rate over time for both users
 */
export class TimelineVisualization {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.width = 600;
        this.height = 200;
        this.padding = { top: 20, right: 20, bottom: 30, left: 40 };

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.data = {
            user1: [],  // Y-axis user rates
            user2: [],  // X-axis user rates
            distance: [] // Distance from optimum
        };
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.data = { user1: [], user2: [], distance: [] };
    }

    addDataPoint(step, user1Rate, user2Rate, distance) {
        this.data.user1.push({ step, value: user1Rate });
        this.data.user2.push({ step, value: user2Rate });
        this.data.distance.push({ step, value: distance });
    }

    drawAxes() {
        const { top, right, bottom, left } = this.padding;
        const chartWidth = this.width - left - right;
        const chartHeight = this.height - top - bottom;

        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 1;

        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(left, top);
        this.ctx.lineTo(left, this.height - bottom);
        this.ctx.stroke();

        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(left, this.height - bottom);
        this.ctx.lineTo(this.width - right, this.height - bottom);
        this.ctx.stroke();

        // Y-axis labels
        this.ctx.fillStyle = '#94A3B8';
        this.ctx.font = '10px Inter, sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('1.0', left - 5, top + 5);
        this.ctx.fillText('0.5', left - 5, top + chartHeight / 2);
        this.ctx.fillText('0.0', left - 5, this.height - bottom);

        // X-axis label
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Time', this.width / 2, this.height - 5);
    }

    drawLine(data, color, maxSteps) {
        if (data.length < 2) return;

        const { top, right, bottom, left } = this.padding;
        const chartWidth = this.width - left - right;
        const chartHeight = this.height - top - bottom;

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;

        for (let i = 0; i < data.length; i++) {
            const x = left + (data[i].step / maxSteps) * chartWidth;
            const y = this.height - bottom - data[i].value * chartHeight;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
    }

    render(maxSteps = 50) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawAxes();
        this.drawLine(this.data.user1, '#EF4444', maxSteps); // Red for User 1
        this.drawLine(this.data.user2, '#22C55E', maxSteps); // Green for User 2
        this.drawLine(this.data.distance, '#3B82F6', maxSteps); // Blue for distance
    }

    drawLegend() {
        const legends = [
            { color: '#EF4444', label: 'User 1 (Y)' },
            { color: '#22C55E', label: 'User 2 (X)' },
            { color: '#3B82F6', label: 'Distance' }
        ];

        let x = this.width - this.padding.right - 150;
        const y = this.padding.top;

        this.ctx.font = '11px Inter, sans-serif';

        legends.forEach((legend, i) => {
            const lx = x + i * 70;

            // Color box
            this.ctx.fillStyle = legend.color;
            this.ctx.fillRect(lx, y, 12, 12);

            // Label
            this.ctx.fillStyle = '#CBD5E1';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(legend.label, lx + 16, y + 10);
        });
    }
}
