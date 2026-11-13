import { ROOM_READY } from '../shared/house.js';
import { mountGuide } from './guide.js';
import { STUDY_GUIDE_SIZE, createStudyGuideArt, studyGuidePoster } from './studyGuideArt.js';

// The second introduction, in Room I, one unbroken film: the glass case
// glints and the pointer clicks it, the eye goes to it and the puzzle grows
// out of it, the answer row coming up under it; then, on that same picture,
// the answer is typed in the game's own field and sent.
export function mountStudyGuide(scope, options) {
  return mountGuide(scope, options, {
    id: 'study-guide-modal', locale: 'studyGuide', place: 'Study',
    storageKey: 'house:study-guide:v2', readyEvent: ROOM_READY,
    size: STUDY_GUIDE_SIZE, poster: studyGuidePoster, createArtwork: createStudyGuideArt,
    durations: [4.2, 5.6],
    draw: (artwork, frame) => artwork?.draw(frame) ?? {},
  });
}
