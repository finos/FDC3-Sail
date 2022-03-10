/**
 * metadata for the system channels
 */

import type { Channel } from './types/FDC3Data';

export const channels: Array<Channel> = [
  {
    id: 'red',
    type: 'system',
    displayMetadata: { color: '#da2d2d', color2: '#9d0b0b', name: 'Red' },
  },
  {
    id: 'orange',
    type: 'system',
    displayMetadata: { color: '#eb8242', color2: '#e25822', name: 'Orange' },
  },
  {
    id: 'yellow',
    type: 'system',
    displayMetadata: { color: '#f6da63', color2: '#e3c878', name: 'Yellow' },
  },
  {
    id: 'green',
    type: 'system',
    displayMetadata: { color: '#42b883', color2: '#347474', name: 'Green' },
  },
  {
    id: 'blue',
    type: 'system',
    displayMetadata: { color: '#1089ff', color2: '#505BDA', name: 'Blue' },
  },
  {
    id: 'purple',
    type: 'system',
    displayMetadata: { color: '#C355F5', color2: '#AA26DA', name: 'Purple' },
  },
];
