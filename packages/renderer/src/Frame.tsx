import './App.css';
import React from 'react';
import {Box, Button, ButtonGroup, Tabs, Tab, AppBar, Paper, Stack} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {TOPICS} from '../../main/src/constants';
import { PostAdd, SentimentVerySatisfiedOutlined } from "@mui/icons-material";

const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#1976d2',
      },
    },
  });

const newTab = () => {
    document.dispatchEvent(new CustomEvent(TOPICS.NEW_TAB_CLICK));
};

const openChannelPicker = () => {
    document.dispatchEvent(new CustomEvent(TOPICS.OPEN_CHANNEL_PICKER_CLICK));
};

const openTabTools = () => {
    document.dispatchEvent(new CustomEvent(TOPICS.OPEN_TAB_TOOLS_CLICK));
};

const openFrameTools = () => {
    document.dispatchEvent(new CustomEvent(TOPICS.OPEN_FRAME_TOOLS_CLICK));
};

let maxTabIndex = 0;
let currentTabIndex = 0;

function Frame() {


      // Handle Tab Button Click
    const [tabId, setTabId] = React.useState(0);
    const handleTabChange = (event : Event, newTabId : string) => {
        if (newTabId === "tabProperties") {
        handleAddTab();
        } else {
        currentTabIndex = newTabId;
        setTabId(newTabId);
        
        document.dispatchEvent(new CustomEvent(TOPICS.SELECT_TAB, {detail:{
            selected:newTabId
          }}));
        }
    };

      // Handle Add Tab Button
    const [tabs, setAddTab] = React.useState([]);
    const handleAddTab = () => {
       /* maxTabIndex++;
        setAddTab([
        ...tabs,
        <Tab label={`New Tab ${maxTabIndex}`} value={maxTabIndex} />
        ]);*/
        newTab();
       // handleTabsContent();
    };

    

    const handleNewTab = (tabName : string, tabValue : string) => {
        maxTabIndex++;
        setAddTab([
        ...tabs,
        <Tab label={tabName} value={tabValue} />
        ]);
        
       // handleTabsContent();
    };

    (document as any).addEventListener(TOPICS.ADD_TAB,(event : CustomEvent) => {
        const tabId = event.detail.viewId;
        const tabName = event.detail.title;
        handleNewTab(tabName, tabId);

        const content = document.createElement("div");
        content.id = `content_${tabId}`;
        content.className = "content";
        const contentContainer = document.getElementById("contentContainer");
        if (contentContainer){
          contentContainer.appendChild(content);
          //select the new Tab?
          //selectTab(tabId);
        }
    });

    return (
        <ThemeProvider theme={darkTheme}>
        <Paper>
           
        <AppBar position="static" color="inherit">
            <div id="controlsContainer">
                <Stack direction="row">
                    <input id="autoComplete" tabindex="1"/>
                    <ButtonGroup>
                    <Button size="small" variant="contained" id="channelPicker" onClick={openChannelPicker}>C</Button>
                    <Button size="small" variant="contained" id="tabDevTools" onClick={openTabTools}>Tab Tools</Button>
                    <Button size="small" variant="contained" id="frameDevTools" onClick={openFrameTools}>Frame Tools</Button>
                </ButtonGroup>
                </Stack>
            </div>
            <Tabs
          
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons
          textColor="secondary"
            indicatorColor="secondary"
        >
          {tabs.map(child => child)}
          <Tab icon={<PostAdd />} value="tabProperties" />
        </Tabs>
        </AppBar>
        
            <div id="contentContainer">
            
            </div>
        </Paper>
        </ThemeProvider>
        
    );
}

/**
 * 
 */
           

export default Frame;