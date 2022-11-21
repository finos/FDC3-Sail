import React from 'react';
import { ViewState } from '../../../main/src/types/SessionState';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ReactJson from 'react-json-view';
import { TabPanel } from './TabPanel';

export class ViewCard extends React.Component<
  {
    data: ViewState;
  },
  { selectedTab: number }
> {
  constructor(props) {
    super(props);
    this.state = { selectedTab: 0 };
    this.data = props.data;
  }

  data: ViewState;

  render() {
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
      this.setState({ selectedTab: newValue });
    };

    const labelStyle = {
      fontWeight: 550,
      marginRight: '.6rem',
    };
    const directoryData = this.data.directoryData;

    return (
      <Box sx={{ overflow: 'scroll', height: window.innerHeight - 200 }}>
        <Card variant="elevation" elevation={0}>
          <CardHeader title={this.data.title}></CardHeader>
          <Tabs
            value={this.state.selectedTab}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="View Properties" {...a11yProps(0)} />
            <Tab label="Directory Data (View)" {...a11yProps(1)} />
            <Tab label="Directory Data (Raw)" {...a11yProps(2)} />
          </Tabs>
          <TabPanel value={this.state.selectedTab} index={0}>
            <CardContent>
              <List dense={true}>
                <ListItem>
                  <Typography component="span" sx={labelStyle}>
                    Url
                  </Typography>
                  {this.data.url}
                </ListItem>
                <ListItem>
                  <Typography component="span" sx={labelStyle}>
                    view id
                  </Typography>
                  {this.data.id}
                </ListItem>
                <ListItem>
                  <Typography component="span" sx={labelStyle}>
                    parent
                  </Typography>
                  {this.data.parent}
                </ListItem>
                <ListItem>
                  <Typography component="span" sx={labelStyle}>
                    fdc3 version
                  </Typography>
                  {this.data.fdc3Version}
                </ListItem>
                <ListItem>
                  <Typography component="span" sx={labelStyle}>
                    channel
                  </Typography>
                  {this.data.channel || 'none'}
                </ListItem>
              </List>
            </CardContent>
          </TabPanel>
          <TabPanel value={this.state.selectedTab} index={1}>
            <CardContent>
              {directoryData ? (
                <List dense={true}>
                  <ListItem>
                    <Typography component="span" sx={labelStyle}>
                      appId
                    </Typography>
                    {directoryData.appId}
                  </ListItem>
                  <ListItem>
                    <Typography component="span" sx={labelStyle}>
                      name
                    </Typography>
                    {directoryData.name}
                  </ListItem>
                  <ListItem>
                    <Typography component="span" sx={labelStyle}>
                      title
                    </Typography>
                    {directoryData.title}
                  </ListItem>
                  <ListItem>
                    <Typography component="span" sx={labelStyle}>
                      description
                    </Typography>
                    {directoryData.description}
                  </ListItem>
                </List>
              ) : (
                <Typography component="h6">
                  No Directory Data Available
                </Typography>
              )}
            </CardContent>
          </TabPanel>
          <TabPanel value={this.state.selectedTab} index={2}>
            <CardContent>
              {directoryData ? (
                <Typography component="div">
                  <ReactJson theme="hopscotch" src={directoryData} />
                </Typography>
              ) : (
                <Typography component="h6">
                  No Directory Data Available
                </Typography>
              )}
            </CardContent>
          </TabPanel>
        </Card>
      </Box>
    );
  }
}
