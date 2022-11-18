import React from 'react';
import { Paper } from '@mui/material';
import {
  SessionState,
  WorkspaceState,
  ViewState,
  ChannelState,
} from '../../../main/src/types/SessionState';
import { ViewCard } from './ViewCard';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Modal from '@mui/material/Modal';
import Backdrop from '@mui/material/Backdrop';
import Fade from '@mui/material/Fade';
import Box from '@mui/material/Box';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import StarBorder from '@mui/icons-material/StarBorder';

export class SessionView extends React.Component<
  {},
  {
    session: SessionState;
    openWorkspaces: Array<string>;
    modalOpen: boolean;
    modalType: 'workspace' | 'view' | 'channel' | undefined;
    modalData: WorkspaceState | ViewState | ChannelState | undefined;
  }
> {
  constructor(props) {
    super(props);
    this.state = {
      session: {
        workspaces: [],
        views: [],
        channels: [],
      },
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
    const onFDC3Ready = async () => {
      //fetch apps from the directory, using system API (only available to system apps)

      const session = await globalThis.sail.getSessionState();

      this.setState({ session: session });
    };
    if (window.fdc3) {
      onFDC3Ready();
    } else {
      document.addEventListener('fdc3Ready', onFDC3Ready);
    }
  }

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
          backgroundColor: '#ccc',
        }}
      >
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Workspaces</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {this.state.session.workspaces.map(
                (workspace: WorkspaceState) => (
                  <ListItem>
                    {workspace.id}

                    <ListItemButton
                      onClick={() => {
                        this.handleClick(workspace.id);
                      }}
                    >
                      <ListItemIcon>
                        <InboxIcon />
                      </ListItemIcon>
                      <ListItemText primary="Views" />
                      {this.state.openWorkspaces.indexOf(workspace.id) > -1 ? (
                        <ExpandLess />
                      ) : (
                        <ExpandMore />
                      )}
                    </ListItemButton>
                    <Collapse
                      in={this.state.openWorkspaces.indexOf(workspace.id) > -1}
                      timeout="auto"
                      unmountOnExit
                    >
                      <List component="div" disablePadding>
                        {workspace.views.map((viewId) => (
                          <ListItemButton sx={{ pl: 4 }}>
                            <ListItemIcon>
                              <StarBorder />
                            </ListItemIcon>
                            <ListItemText
                              onClick={() => {
                                this.openModal('view', viewId);
                              }}
                              primary={this.getView(viewId)?.title}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Collapse>
                  </ListItem>
                ),
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Views</Typography>
          </AccordionSummary>
          <AccordionDetails>
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
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Channels</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {this.state.session.channels.map((channelState: ChannelState) => (
                <ListItem
                  onClick={() => {
                    this.openModal('channel', channelState.channel.id);
                  }}
                >
                  {channelState.channel.id}
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
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
