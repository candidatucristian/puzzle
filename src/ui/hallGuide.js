import { HALL_READY, WALK_MS } from '../shared/house.js';
import { mountGuide, guideBetween as between } from './guide.js';
import { GUIDE_DOOR, GUIDE_DOOR_OPEN_MS, createGuideDoor, guideDoorPoster } from './hallGuideDoor.js';

// The first introduction, in the hall: door I, one unbroken film — the
// pointer comes to the shut door and clicks, and it swings open; then, from
// the handle where it was, the pointer goes to the open doorway and clicks,
// and the eye goes in through it, to the dark; and from the dark the shut
// door comes up again for the film to come round.
export function mountHallGuide(scope, options) {
  const OPEN_AT = 1.2, IN_AT = 1.25;
  return mountGuide(scope, options, {
    id: 'hall-guide-modal', locale: 'hallGuide', place: 'Hall',
    storageKey: 'house:hall-guide:v2', readyEvent: HALL_READY,
    size: GUIDE_DOOR, poster: guideDoorPoster, createArtwork: createGuideDoor,
    // how long each step plays: the swing, then the going in
    durations: [OPEN_AT + GUIDE_DOOR_OPEN_MS / 1000 + 0.9, 3.4],
    draw(artwork, { step, t, still }) {
      if (step === 0) {
        const elapsed = still ? GUIDE_DOOR_OPEN_MS : Math.max(0, Math.min(GUIDE_DOOR_OPEN_MS, (t - OPEN_AT) * 1000));
        artwork?.draw(elapsed, 0);
        return { pressAt: OPEN_AT, target: artwork?.handle };
      }
      // the door stays as the first step left it: open
      const walkStart = IN_AT + 0.12, walkEnd = walkStart + WALK_MS / 1000;
      const near = still ? 0 : between(t, walkStart, walkEnd);
      artwork?.draw(GUIDE_DOOR_OPEN_MS, near);
      return {
        pressAt: IN_AT,
        from: artwork?.handle, target: artwork?.entry,
        pointerOpacity: still ? 1 : 1 - between(t, IN_AT + 0.25, IN_AT + 0.55),
        opacity: still ? 1 : 1 - between(t, walkEnd + 0.35, walkEnd + 0.8),
      };
    },
  });
}
