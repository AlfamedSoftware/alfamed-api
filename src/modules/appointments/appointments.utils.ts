export const CLINIC_TZ = "-03:00";

export type Interval = {
    start: Date;
    end: Date;
};

export function createLocalDateTime(date: string, time: string) {
    return new Date(`${date}T${time}${CLINIC_TZ}`);
}

export function overlaps(left: Interval, right: Interval) {
    return left.start < right.end && right.start < left.end;
}

export function mergeIntervals(intervals: Interval[]) {
    const sorted = [...intervals].sort((left, right) => left.start.getTime() - right.start.getTime());
    const merged: Interval[] = [];

    for (const interval of sorted) {
        const last = merged[merged.length - 1];

        if (!last || interval.start > last.end) {
            merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
            continue;
        }

        if (interval.end > last.end) {
            last.end = new Date(interval.end);
        }
    }

    return merged;
}

export function subtractIntervals(base: Interval, blocks: Interval[]) {
    const sorted = [...blocks]
        .filter((block) => overlaps(base, block))
        .sort((left, right) => left.start.getTime() - right.start.getTime());

    const free: Interval[] = [];
    let cursor = new Date(base.start);

    for (const block of sorted) {
        if (block.start > cursor) {
            free.push({ start: new Date(cursor), end: new Date(Math.min(block.start.getTime(), base.end.getTime())) });
        }

        if (block.end > cursor) {
            cursor = new Date(Math.max(cursor.getTime(), block.end.getTime()));
        }

        if (cursor >= base.end) {
            break;
        }
    }

    if (cursor < base.end) {
        free.push({ start: new Date(cursor), end: new Date(base.end) });
    }

    return free.filter((interval) => interval.end > interval.start);
}
