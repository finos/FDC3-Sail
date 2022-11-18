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
    interface TabPanelProps {
      children?: React.ReactNode;
      index: number;
      value: number;
    }

    function TabPanel(props: TabPanelProps) {
      const { children, value, index, ...other } = props;

      return (
        <div
          role="tabpanel"
          hidden={value !== index}
          id={`simple-tabpanel-${index}`}
          aria-labelledby={`simple-tab-${index}`}
          {...other}
        >
          {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
      );
    }

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
      this.setState({ selectedTab: newValue });
    };

    function a11yProps(index: number) {
      return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
      };
    }

    const labelStyle = {
      fontWeight: 550,
      marginRight: '.6rem',
    };
    const directoryData = this.data.directoryData;

    return (
      <Box>
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
          <Card variant="elevation" elevation={0}>
            <CardHeader
              title={this.data.title}
              subheader={this.data.url}
            ></CardHeader>
            <CardContent>
              <List dense={true}>
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
          </Card>
        </TabPanel>
        <TabPanel value={this.state.selectedTab} index={1}>
          <Card variant="elevation" elevation={0}>
            <CardHeader title="Directory Data"></CardHeader>
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
          </Card>
        </TabPanel>
        <TabPanel value={this.state.selectedTab} index={2}>
          <Card variant="elevation" elevation={0}>
            <CardHeader title="Directory Data"></CardHeader>
            <CardContent>
              {directoryData ? (
                <Typography component="div">
                  {JSON.stringify(directoryData)}
                </Typography>
              ) : (
                <Typography component="h6">
                  No Directory Data Available
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      </Box>
    );
  }
}
