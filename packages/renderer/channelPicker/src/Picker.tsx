import './Picker.css';
import React from 'react';
import {Box, Grid} from '@mui/material';

import PickerItem from './components/PickerItem';
import {channels} from "../../../main/src/system-channels";


export const Picker = () => {


    return (
        <div id="container">
        <Grid container spacing={1}>
            {channels.map(channel => 
                <PickerItem key={channel.id} altColor={channel.displayMetadata.color2} color={channel.displayMetadata.color} id={channel.id}></PickerItem>
            )}
        </Grid>
        </div>

    );
};