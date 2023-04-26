/**
 *
 * I Replaced this Component by TopNavigation.tsx
 * Kept this until we are happy it all works well
 * (Seb)
 *
 */
import './Frame.css';
import React, { SyntheticEvent } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  ButtonGroup,
  Tabs,
  Tab,
  AppBar,
  Paper,
  Stack,
} from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';
import {
  PostAdd,
  HiveOutlined,
  CloseOutlined,
  OpenInNew,
  MoreVert,
} from '@mui/icons-material';

(window as any).frameReady = false;

let draggedTab: string | null = null;

let tabDragTimeout: number = 0;

//flag to indicate we are dragging and dropping tabs within the tabset - not tearing ouut
let internalDnD: boolean = false;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
  },
});

const newTab = () => {
  window.sail.tabs.new();
};

const openChannelPicker = (event: SyntheticEvent) => {
  const pickerButtonHeight = 40;
  const native: MouseEvent = event.nativeEvent as MouseEvent;
  window.sail.menu.openChannelPicker(
    native.clientX,
    native.clientY + pickerButtonHeight,
  );
};

const hideResults = () => {
  document.dispatchEvent(new CustomEvent(RUNTIME_TOPICS.HIDE_RESULTS_WINDOW));
};

interface FrameTab {
  tabId: string;
  tabName: string;
}

export class Frame extends React.Component<
  {},
  {
    anchorEl: HTMLElement | null;
    tabs: Array<FrameTab>;
    selectedTab: string;
    channelColor: string;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      tabs: [],
      selectedTab: 'newTab',
      anchorEl: null,
      channelColor: '',
    };
  }

  handleTabChange(newTabId: string) {
    console.log('tab selected', newTabId);
    if (newTabId === 'newTab') {
      newTab();
    } else {
      this.setState({ selectedTab: newTabId });
      window.sail.tabs.select(newTabId);
    }
  }

  closeTab(tabId: string) {
    window.sail.tabs.close(tabId);

    this.setState({
      tabs: this.state.tabs.filter((tab: FrameTab) => {
        return tab.tabId !== tabId;
      }),
    });
  }

  tearOut(tabId: string) {
    //only tear out if there is more than one tab in the set
    //only tear out if the 'internalDnD' flag is not set
    console.log('tearOut', tabId, this.state.tabs.length);
    if (this.state.tabs.length > 1) {
      window.sail.tabs.tearOut(tabId);
    }
  }

  handleNewTab(tabName: string, tabId: string) {
    this.setState({
      tabs: [...this.state.tabs, { tabId: tabId, tabName: tabName }],
      selectedTab: tabId,
    });
  }

  componentDidMount() {
    document.addEventListener(RUNTIME_TOPICS.ADD_TAB, ((event: CustomEvent) => {
      console.log('Add Tab called', event.detail);
      const tabId = event.detail.viewId;
      const tabName = event.detail.title;
      this.handleNewTab(tabName, tabId);

      const content = document.createElement('div');
      content.id = `content_${tabId}`;
      content.className = 'content';
      const contentContainer = document.getElementById('contentContainer');
      if (contentContainer) {
        contentContainer.appendChild(content);
        //select the new Tab?
        //selectTab(tabId);
      }
    }) as EventListener);

    document.addEventListener(RUNTIME_TOPICS.REMOVE_TAB, ((
      event: CustomEvent,
    ) => {
      console.log('Remove Tab called', event.detail);
      const tabId = event.detail.tabId;
      this.setState({
        tabs: this.state.tabs.filter((tab) => {
          return tab.tabId !== tabId;
        }),
      });
    }) as EventListener);

    document.addEventListener(RUNTIME_TOPICS.SELECT_TAB, ((
      event: CustomEvent,
    ) => {
      if (event.detail.selected) {
        this.setState({ selectedTab: event.detail.selected });
      }
    }) as EventListener);

    document.addEventListener(RUNTIME_TOPICS.CHANNEL_SELECTED, ((
      event: CustomEvent,
    ) => {
      this.setState({
        channelColor: event.detail?.channel?.displayMetadata?.color,
      });
    }) as EventListener);

    window.sail.isReady();
  }

  render() {
    const open = Boolean(this.state.anchorEl);

    const debounce = (callback: any, wait: number) => {
      let timeoutId: number | undefined = undefined;
      return (...args: any[]) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          callback.apply(null, args);
        }, wait);
      };
    };

    const searchChange = debounce((event: InputEvent) => {
      const threshold = 3;
      const input: HTMLInputElement = event.target as HTMLInputElement;

      const value = input && input.value ? input.value : '';
      //does the value meet the threshold
      if (value && value.length >= threshold) {
        window.sail.search.searchDirectory(value);
      }
    }, 400);

    const devToolsClick = (event: SyntheticEvent) => {
      window.sail.menu.openTools(
        (event.nativeEvent as PointerEvent).clientX,
        (event.nativeEvent as PointerEvent).clientY,
      );
    };

    const allowDrop = (ev: SyntheticEvent) => {
      ev.preventDefault();
      if (tabDragTimeout > 0) {
        window.clearTimeout(tabDragTimeout);
        tabDragTimeout = 0;
      }
      //internalDnD = false;
    };

    const allowFrameDrop = (ev: SyntheticEvent) => {
      ev.preventDefault();
    };

    const drag = (tabId: string) => {
      //start with internal drag and drop operation assumed
      internalDnD = true;
      draggedTab = tabId;
      //inform of the tab dragstart
      window.sail.tabs.dragStart(tabId);
    };

    const drop = (ev: SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      const target: HTMLElement = ev.target as HTMLElement;
      console.log('tabDrop', ev, target, target.id);
      if (internalDnD && draggedTab && target) {
        const tabId = draggedTab;
        //rewrite the tablist
        //find the selected tab, and pop it out of the list

        let dropTab: FrameTab | undefined = undefined;
        let targetIndex = 0;
        const newTabList: Array<FrameTab> = [];

        this.state.tabs.forEach((tab, i) => {
          if (tab.tabId !== tabId) {
            newTabList.push(tab);
          } else {
            dropTab = tab;
          }
          if (tab.tabId === target.id) {
            targetIndex = i;
          }
        });

        if (dropTab) {
          newTabList.splice(targetIndex, 0, dropTab);
        }
        this.setState({ tabs: newTabList });
        //select the dragged tab
        //do this with a delay to prevent race conditions with re-rendering the tab order
        setTimeout(() => {
          window.sail.tabs.select(tabId);
        }, 100);

        draggedTab = null;
        internalDnD = false;
      } else {
        //raise drop event for tear out
        window.sail.tabs.drop(true);
      }
    };

    const frameDrop = (ev: SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      console.log('tabDropped on frame target');
      window.sail.tabs.drop(true);
    };

    const leaveTab = () => {
      tabDragTimeout = window.setTimeout(() => {
        internalDnD = false;
      }, 300);
    };

    const dragEnd = (ev: SyntheticEvent) => {
      ev.preventDefault();
    };

    return (
      <ThemeProvider theme={darkTheme}>
        <Paper>
          <div
            className="frameContainer"
            onDrop={frameDrop}
            onDragOver={allowFrameDrop}
          >
            <AppBar position="static" color="inherit">
              <div id="buttonsContainer">
                <Stack direction="row">
                  <TextField
                    id="search"
                    className="frameSearch"
                    variant="outlined"
                    margin="dense"
                    size="small"
                    onFocus={hideResults}
                    onChange={searchChange}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <ButtonGroup className="frameButtons">
                    <IconButton
                      size="small"
                      id="channelPicker"
                      sx={{
                        background: this.state.channelColor,
                      }}
                      onClick={openChannelPicker}
                      title="select channel"
                    >
                      <HiveOutlined />
                    </IconButton>

                    <IconButton
                      id="menuButton"
                      aria-controls={open ? 'more' : undefined}
                      aria-haspopup="true"
                      aria-expanded={open ? 'true' : undefined}
                      onClick={devToolsClick}
                    >
                      <MoreVert />
                    </IconButton>
                  </ButtonGroup>
                </Stack>
              </div>
              <Tabs
                value={this.state.selectedTab}
                onChange={(event, newTabId) => {
                  this.handleTabChange(newTabId);
                }}
                variant="scrollable"
                scrollButtons="auto"
              >
                {this.state.tabs.map((tab: FrameTab) => (
                  <Tab
                    label={tab.tabName}
                    value={tab.tabId}
                    id={tab.tabId}
                    key={tab.tabId}
                    iconPosition="end"
                    onDrop={drop}
                    onDragLeave={leaveTab}
                    onDragOver={allowDrop}
                    onDragEnd={dragEnd}
                    draggable="true"
                    onDragStart={() => {
                      drag(tab.tabId);
                    }}
                    icon={
                      <div>
                        <OpenInNew
                          onClick={() => {
                            this.tearOut(tab.tabId);
                          }}
                        />
                        <CloseOutlined
                          onClick={() => {
                            this.closeTab(tab.tabId);
                          }}
                        />
                      </div>
                    }
                  />
                ))}
                <Tab icon={<PostAdd />} value="newTab" />
              </Tabs>
            </AppBar>
          </div>
        </Paper>
      </ThemeProvider>
    );
  }
}

/**
 *
 */

export default Frame;
