/* Practice: the skill map in pick mode (pick skills, a difficulty, start). The problems come from the picked
   skills' generators (`gen` in content/tree.js and the topics). */
import { showMap } from './map.js';

export const showPractice = () => showMap({ pick: true });
