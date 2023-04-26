import './Picker.css';
import React from 'react';
import { Grid } from '@mui/material';

import PickerItem from './components/PickerItem';
import { systemChannels } from '../../../main/src/handlers/fdc3/lib/systemChannels';

export const Picker = () => {
  return (
    <div id="container">
      <Grid container spacing={1}>
        {systemChannels.map((channel) => (
          <PickerItem
            key={channel.id}
            altColor={channel.displayMetadata.color2}
            color={channel.displayMetadata.color}
            id={channel.id}
          ></PickerItem>
        ))}
      </Grid>
    </div>
  );
};
