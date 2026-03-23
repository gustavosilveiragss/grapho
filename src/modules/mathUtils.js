const PI = Math.PI;
const TWO_PI = PI * 2;

class MathUtils {
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    angleFromLastSegments(pathPoints, count) {
        const len = pathPoints.length;
        if (len < 2) return 0;

        const start = Math.max(0, len - count - 1);
        const p1 = pathPoints[start];
        const p2 = pathPoints[len - 1];

        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > PI) diff -= TWO_PI;
        while (diff < -PI) diff += TWO_PI;
        return a + diff * t;
    }
}

export const mathUtils = new MathUtils();
