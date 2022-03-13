import React from 'react';
import {Paper, Box, List, ListItem, ListItemText, ListItemAvatar, Avatar} from '@mui/material';
import {TOPICS} from '../../../main/src/constants';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OpenInBrowser from '@mui/icons-material/OpenInBrowser';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ensureFile } from 'fs-extra';

const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#1976d2',
      },
    },
  });

export class IntentResolver extends React.Component{

    constructor(props) {
        super(props);
        this.state = {results: [], intent: '', context: ''};
      }

    componentDidMount() {
        (document as any).addEventListener(TOPICS.RES_LOAD_INTENT_RESULTS, (event : CustomEvent) => {
    
            this.setState({results:event.detail.options || [], intent:event.detail.intent || '', context: event.detail.context || ''});
         });
    }
 

    resultSelected(result : any) {
        document.dispatchEvent(new CustomEvent(TOPICS.RES_RESOLVE_INTENT, {detail:{selected:result}}));
    }

    render() {
   const getSubTitle = (item) : string => {
        if (item.details.instanceId){
            return "instance";
        } else {
            return "new";
        }
   };

   const getAppIcon = (item) => {
    if (item.details.instanceId){
        return (<OpenInBrowser />);
    } else {
        return (<OpenInNewIcon />);
    }
   }
        
    return (
        <ThemeProvider theme={darkTheme}>
        <Paper sx={{
            width:400,
            height:400,
            margin:0
        }}>
            <h1>Resolve Intent '{this.state.intent}'</h1>
            <h2>select an app</h2>
            <Box sx={{ margin:".6rem"}}>
                <List disablePadding>
                    {this.state.results.map(result => 
                        <ListItem key={result.name} disablePadding dense 
                        sx={
                            {
                                paddingLeft:".6rem",
                                borderRadius:".3rem",
                                transition:".5s ease",
                                ":hover":{background:"#ccc", color:"#222", cursor:"pointer"},
                                
                            }}>
                                <ListItemAvatar>
                                <Avatar  sx={{backgroundColor:"#1976d2"}}>
                                    {getAppIcon(result)}
                                </Avatar>
                                </ListItemAvatar>
                                <ListItemText key={`${result.details.directoryData.name}-text`} onClick={() => {this.resultSelected(result);}}
                        primary={result.details.title} secondary={getSubTitle(result) } /></ListItem>
                    )}
                </List>
            </Box>
        </Paper>
        </ThemeProvider>

    );
                }
};

