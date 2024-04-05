import React from 'react';
import { Context } from '@finos/fdc3';
import { Paper } from '@mui/material';
import {
  SessionState,
  WorkspaceState,
  ViewState,
  ChannelState,
} from '../../../main/src/types/SessionState';
import { ViewCard } from './ViewCard';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Backdrop from '@mui/material/Backdrop';
import Fade from '@mui/material/Fade';
import Box from '@mui/material/Box';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { alpha, styled } from '@mui/material/styles';
import TreeView from '@mui/lab/TreeView';
import TreeItem, { TreeItemProps } from '@mui/lab/TreeItem';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { TabPanel, a11yProps } from './TabPanel';

function MinusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z" />
    </SvgIcon>
  );
}

function PlusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z" />
    </SvgIcon>
  );
}

function CloseSquare(props: SvgIconProps) {
  return (
    <SvgIcon
      className="close"
      fontSize="inherit"
      style={{ width: 14, height: 14 }}
      {...props}
    >
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z" />
    </SvgIcon>
  );
}

/*const StyledTreeItem = styled((props: TreeItemProps) => (
  <TreeItem {...props} />
))(({ theme }) => ({
  [`& .${treeItemClasses.iconContainer}`]: {
    '& .close': {
      opacity: 0.3,
    },
  },
  [`& .${treeItemClasses.group}`]: {
    marginLeft: 15,
    paddingLeft: 18,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
  },
}));*/

const StyledTreeItem = styled((props: TreeItemProps) => (
  <TreeItem {...props} />
))(({ theme }) => ({
  [`& .iconContainer}`]: {
    '& .close': {
      opacity: 0.3,
    },
  },
  [`& .group}`]: {
    marginLeft: 15,
    paddingLeft: 18,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
  },
}));

export class SessionView extends React.Component<
  {},
  {
    session: SessionState;
    openWorkspaces: Array<string>;
    modalOpen: boolean;
    modalType: 'workspace' | 'view' | 'channel' | undefined;
    modalData: WorkspaceState | ViewState | ChannelState | undefined;
    selectedTab: number;
  }
> {
  constructor(props) {
    super(props);
    this.state = {
      session: {
        workspaces: [],
        views: [],
        viewsMap: {},
        channels: [],
      },
      selectedTab: 0,
      openWorkspaces: [],
      modalOpen: false,
      modalType: undefined,
      modalData: undefined,
    };
  }

  closeModal() {
    this.setState({ modalOpen: false });
  }

  openModal(type: 'workspace' | 'view' | 'channel', id: string) {
    //get the object
    let object;
    if (type === 'view') {
      const viewSelect = this.state.session.views.filter((v) => {
        return v.id === id;
      });
      if (viewSelect.length > 0) {
        object = viewSelect[0];
      }
    }
    this.setState({ modalOpen: true, modalType: type, modalData: object });
  }

  componentDidMount() {
    const onFDC3Ready = () => {
      //fetch apps from the directory, using system API (only available to system apps)
      const getState = async () => {
        const session = await globalThis.sail.getSessionState();

        this.setState({ session: session });

        setTimeout(getState, 3000);
      };
      getState();
    };

    if (window.innerHeight) {
      document.getElementById('sessionView').style.height = `${
        window.innerHeight - 150
      }px`;
    }

    if (window.fdc3) {
      onFDC3Ready();
    } else {
      document.addEventListener('fdc3Ready', onFDC3Ready);
    }
  }

  tabChange = (event: React.SyntheticEvent, newValue: number) => {
    this.setState({ selectedTab: newValue });
  };

  handleClick(id: string) {
    const i = this.state.openWorkspaces.indexOf(id);
    if (i > -1) {
      this.setState({ openWorkspaces: this.state.openWorkspaces.splice(i, 1) });
    } else {
      this.setState({ openWorkspaces: [...this.state.openWorkspaces, id] });
    }
  }

  getView(id: string): ViewState | null {
    const views = this.state.session.views.filter((v) => {
      return v.id === id;
    });
    if (views.length === 0) {
      return null;
    }
    return views[0];
  }

  render() {
    const modalStyle = {
      position: 'absolute' as 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80%',
      height: '80%',
      bgcolor: 'background.paper',
      border: '2px solid #000',
      boxShadow: 24,
      p: 4,
    };

    return (
      <Paper
        sx={{
          padding: '1rem',
          margin: '1rem',
          height: '100%',
          backgroundColor: '#ccc',
        }}
      >
        <Tabs
          value={this.state.selectedTab}
          onChange={(event, newValue) => {
            this.tabChange(event, newValue);
          }}
          aria-label="Sail SessionView Tabs"
        >
          <Tab label="Workspaces" {...a11yProps(0)} />
          <Tab label="Views" {...a11yProps(1)} />
          <Tab label="Channels" {...a11yProps(2)} />
        </Tabs>
        <TabPanel value={this.state.selectedTab} index={0}>
          <TreeView
            aria-label="customized"
            defaultExpanded={['1']}
            defaultCollapseIcon={<MinusSquare />}
            defaultExpandIcon={<PlusSquare />}
            defaultEndIcon={<CloseSquare />}
            sx={{
              height: '100%',
              flexGrow: 1,
              maxWidth: '100%',
              width: '100%',
              overflowY: 'auto',
            }}
          >
            <StyledTreeItem nodeId="workspaces" label="All Workspaces">
              {this.state.session.workspaces.map(
                (workspace: WorkspaceState) => (
                  <StyledTreeItem nodeId={workspace.id} label={workspace.id}>
                    <StyledTreeItem
                      nodeId={`${workspace.id}_views`}
                      label="Views"
                    >
                      {workspace.views.map((viewId: string, i) => (
                        <StyledTreeItem
                          nodeId={`${workspace.id}_view_${i}`}
                          label={this.getView(viewId).title}
                          onClick={() => {
                            this.openModal('view', viewId);
                          }}
                        />
                      ))}
                    </StyledTreeItem>
                  </StyledTreeItem>
                ),
              )}
            </StyledTreeItem>
          </TreeView>
        </TabPanel>
        <TabPanel
          value={this.state.selectedTab}
          index={1}
          sx={{ height: '100%' }}
        >
          <TreeView
            aria-label="customized"
            defaultExpanded={['1']}
            defaultCollapseIcon={<MinusSquare />}
            defaultExpandIcon={<PlusSquare />}
            defaultEndIcon={<CloseSquare />}
            sx={{
              height: '100%',
              flexGrow: 1,
              maxWidth: '100%',
              width: '100%',
              overflowY: 'auto',
            }}
          >
            <StyledTreeItem nodeId="views" label="All Views">
              {Object.keys(this.state.session.viewsMap).map(
                (key: string, i: number) => (
                  <StyledTreeItem nodeId={`view_${i}`} label={key}>
                    {this.state.session.viewsMap[key].map((viewId: string) => (
                      <StyledTreeItem
                        nodeId={viewId}
                        label={`${this.getView(viewId).title} (${viewId})`}
                        onClick={() => {
                          this.openModal('view', viewId);
                        }}
                      />
                    ))}
                  </StyledTreeItem>
                ),
              )}
            </StyledTreeItem>
          </TreeView>
          <List>
            {this.state.session.views.map((view: ViewState) => (
              <ListItem
                onClick={() => {
                  this.openModal('view', view.id);
                }}
              >
                {view.title}
              </ListItem>
            ))}
          </List>
        </TabPanel>
        <TabPanel value={this.state.selectedTab} index={2}>
          <TreeView
            aria-label="customized"
            defaultExpanded={['1']}
            defaultCollapseIcon={<MinusSquare />}
            defaultExpandIcon={<PlusSquare />}
            defaultEndIcon={<CloseSquare />}
            sx={{
              height: '100%',
              flexGrow: 1,
              maxWidth: '100%',
              width: '100%',
              overflowY: 'auto',
            }}
          >
            <StyledTreeItem nodeId="channels" label="Channels">
              {this.state.session.channels.map((channelState: ChannelState) => (
                <StyledTreeItem
                  nodeId={channelState.channel.id}
                  label={channelState.channel.id}
                >
                  <StyledTreeItem
                    nodeId={`${channelState.channel.id}_contexts`}
                    label="Contexts"
                  >
                    {channelState.contexts.map((context: Context, i) => (
                      <StyledTreeItem
                        nodeId={`${channelState.channel.id}_context_${i}`}
                        label={context.type}
                      >
                        <StyledTreeItem
                          nodeId={`${channelState.channel.id}_context_${i}_content`}
                          label={JSON.stringify(context)}
                        ></StyledTreeItem>
                      </StyledTreeItem>
                    ))}
                  </StyledTreeItem>
                </StyledTreeItem>
              ))}
            </StyledTreeItem>
          </TreeView>
        </TabPanel>
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={this.state.modalOpen}
          onClose={() => {
            this.closeModal();
          }}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
          }}
        >
          <Fade in={this.state.modalOpen}>
            <Box sx={modalStyle}>
              {this.state.modalType === 'view' ? (
                <ViewCard data={this.state.modalData as ViewState}></ViewCard>
              ) : this.state.modalType === 'workspace' ? (
                <Typography
                  id="transition-modal-title"
                  variant="h6"
                  component="h2"
                >
                  Workspace
                </Typography>
              ) : this.state.modalType === 'channel' ? (
                <Typography
                  id="transition-modal-title"
                  variant="h6"
                  component="h2"
                >
                  Channel
                </Typography>
              ) : (
                <Typography
                  id="transition-modal-title"
                  variant="h6"
                  component="h2"
                >
                  nothing selected
                </Typography>
              )}
            </Box>
          </Fade>
        </Modal>
      </Paper>
    );
  }
}
