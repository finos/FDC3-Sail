import './Frame.css';
import React from 'react';
import {TextField, IconButton, Menu, MenuItem, ButtonGroup, Tabs, Tab, AppBar, Paper, Stack} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {TOPICS} from '../../main/src/constants';
import { PostAdd, HiveOutlined,  CloseOutlined, MoreVert} from "@mui/icons-material";

(window as any).frameReady = false;

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

const openChannelPicker = (event : MouseEvent) => {
  const pickerButtonHeight = 40;
    document.dispatchEvent(new CustomEvent(TOPICS.OPEN_CHANNEL_PICKER_CLICK, {detail:{mouseX:event.clientX, mouseY:(event.clientY + pickerButtonHeight)}}));
};



const hideResults = () => {
  document.dispatchEvent(new CustomEvent(TOPICS.HIDE_RESULTS_WINDOW));
}



interface FrameTab {
  tabId : string;
  tabName: string;
};

export class Frame extends React.Component <{}, {anchorEl : HTMLElement | null, tabs:Array<FrameTab>, selectedTab:string}> {

      constructor(props : any) {
        super(props);
        this.state = {tabs: [], selectedTab : "newTab", anchorEl : null};
      }


    handleTabChange(newTabId : string){
      console.log("tab selected", newTabId);
        if (newTabId === "newTab") {
          newTab();
        } else {
        
        this.setState({selectedTab:newTabId});
        
        document.dispatchEvent(new CustomEvent(TOPICS.TAB_SELECTED, {detail:{
            selected:newTabId
          }}));
        }
    }


    closeTab(tabId : string) {

      document.dispatchEvent(new CustomEvent(TOPICS.CLOSE_TAB, {detail:{
        tabId:tabId
      }}));
      this.setState({tabs:this.state.tabs.filter((tab : FrameTab) => { return tab.tabId !==  tabId;})});
    }

    handleNewTab(tabName : string, tabId : string) {
        
        this.setState({tabs:[...this.state.tabs,{tabId:tabId, tabName:tabName}], selectedTab:tabId});

    }

    componentDidMount() {
      document.addEventListener(TOPICS.ADD_TAB,((event : CustomEvent) => {
          console.log("Add Tab called", event.detail);
          const tabId = event.detail.viewId;
          const tabName = event.detail.title;
          this.handleNewTab(tabName, tabId);

          const content = document.createElement("div");
          content.id = `content_${tabId}`;
          content.className = "content";
          const contentContainer = document.getElementById("contentContainer");
          if (contentContainer){
            contentContainer.appendChild(content);
            //select the new Tab?
            //selectTab(tabId);
          }
      }) as EventListener);

      document.addEventListener(TOPICS.SELECT_TAB, ((event : CustomEvent) => {
        if (event.detail.selected){
          this.setState({selectedTab:event.detail.selected});
        }
      }) as EventListener);
      console.log("setting frameReady");
      (window as any).frameReady = true;
      const readyEvent = new CustomEvent(TOPICS.FRAME_READY, {
        detail: {},
      });
      document.dispatchEvent(readyEvent);
  }

  render() {

    const open = Boolean(this.state.anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      this.setState({anchorEl:event.currentTarget});
    };
    const handleClose = () => {
      this.setState({anchorEl : null});
    };

    const openViewTools = () => {
      document.dispatchEvent(new CustomEvent(TOPICS.OPEN_TAB_TOOLS_CLICK));
      this.setState({anchorEl : null});
    };
  
    const openFrameTools = () => {
        document.dispatchEvent(new CustomEvent(TOPICS.OPEN_FRAME_TOOLS_CLICK));
        this.setState({anchorEl : null});
    };

      const debounce = (callback : any, wait : number) => {

        let timeoutId : number | undefined = undefined;
        return (...args : any[]) => {
          window.clearTimeout(timeoutId);
          timeoutId = window.setTimeout(() => {
   
            callback.apply(null, args);
          }, wait);
        };
      }

      const searchChange = debounce((event : InputEvent) => {

          const threshold = 3;
          const input : HTMLInputElement = (event.target as HTMLInputElement);
      
          const value = input && input.value ? input.value : "";
          //does the value meet the threshold
          if (value && value.length >= threshold){
            
            document.dispatchEvent(new CustomEvent(TOPICS.SEARCH, {detail:{"query":value}}));
          }
        
      }, 400);


      return (
          <ThemeProvider theme={darkTheme}>
          <Paper>
            
          <AppBar position="static" color="inherit">
              <div id="buttonsContainer">
                  <Stack direction="row">
                      <TextField id="search" label="Search" variant="outlined" size="small" onFocus={hideResults} onChange={searchChange} fullWidth/>
                      <ButtonGroup>
                      
                      <IconButton size="small"  variant="contained" id="channelPicker" onClick={openChannelPicker} title="select channel"><HiveOutlined/></IconButton>
                      
                      <IconButton
                        id="menuButton"
                        aria-controls={open ? 'more' : undefined}
                        aria-haspopup="true"
                        aria-expanded={open ? 'true' : undefined}
                        onClick={handleClick}>
                          <MoreVert/>  
                        </IconButton>
                        <Menu
                            id="moreMenu"
                            aria-labelledby="menuButton"
                            anchorEl={this.state.anchorEl}
                            open={open}
                            onClose={handleClose}
                            anchorOrigin={{
                              vertical: 'top',
                              horizontal: 'left',
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'left',
                            }}
                          >
                            <MenuItem key="frameTools" onClick={openFrameTools}>DevTools - Frame</MenuItem>
                            <MenuItem key="viewTools" onClick={openViewTools}>DevTools - View</MenuItem>
                          </Menu>
                  </ButtonGroup>
                  </Stack>
              </div>
              <Tabs
            value={this.state.selectedTab}
            onChange={(event, newTabId) => {this.handleTabChange(newTabId);}}
            variant="scrollable"
            scrollButtons="auto">
            {this.state.tabs.map((tab : FrameTab) => 
               <Tab label={tab.tabName} value={tab.tabId} iconPosition="end" icon={<CloseOutlined onClick={() => {this.closeTab(tab.tabId);}}/>} />  
            )}
            <Tab icon={<PostAdd />} value="newTab"/>
          </Tabs>
          </AppBar>
          
    
          </Paper>

          </ThemeProvider>
                    
      );
  }


}

/**
 * 
 */
           

export default Frame;