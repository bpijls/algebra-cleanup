/* The button that writes a given value in: n = 10 (labelled by what it does). */
import { defineToolMove } from '../../ui/tiles.js';
import { opSubstitute } from './rules.js';

defineToolMove('substitute', opSubstitute);
