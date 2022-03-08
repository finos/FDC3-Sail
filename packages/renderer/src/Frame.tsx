import './Frame.css';
import React from 'react';
import {IconButton, Button, ButtonGroup, Tabs, Tab, AppBar, Paper, Stack} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {TOPICS} from '../../main/src/constants';
import { PostAdd, HiveOutlined, ConstructionOutlined, CloseOutlined } from "@mui/icons-material";


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

let value = "";

function Frame() {

    

      // Handle Tab Button Click
    const [tabId, setTabId] = React.useState(0);
    const handleTabChange = (event : Event, newTabId : string) => {
        if (newTabId === "tabProperties") {
        handleAddTab();
        } else {
        value = newTabId;
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

    const closeTab = (tabId : string) => {
      document.dispatchEvent(new CustomEvent(TOPICS.CLOSE_TAB, {detail:{
        tabId:tabId
      }}));
      setAddTab(tabs.filter((tab) => { return (tab as any).value !==  tabId;}));
    };

    const handleNewTab = (tabName : string, tabValue : string) => {
        value = tabValue;

        setAddTab([
        ...tabs,
        <Tab label={tabName} value={tabValue} iconPosition="end" icon={<CloseOutlined onClick={() => {closeTab(tabValue);}}/>} />
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
                    <div id="channelButton">
                      <IconButton size="small"  variant="contained" id="channelPicker" onClick={openChannelPicker} title="select channel"><HiveOutlined/></IconButton>
                    </div>
                    
                    <Button size="small" variant="contained" id="frameDevTools" onClick={openFrameTools} endIcon={<ConstructionOutlined/>} title="Open Dev Tools for the Workspace Frame">Frame</Button>
                    <Button size="small"  variant="contained" id="tabDevTools" onClick={openTabTools} endIcon={<ConstructionOutlined/>}  title="Open Dev Tools for the View">View</Button>
                </ButtonGroup>
                </Stack>
            </div>
            <Tabs
          value={value}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons

        >
          {tabs.map(child => child)}
          <Tab icon={<PostAdd />} value="tabProperties"/>
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