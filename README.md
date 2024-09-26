<p align="center">
    <img height="300" src="./images/logo_bg_white_2x.png" alt="FDC3 Sail Icon">
</p>

<h1 align="center">FDC3 Sail</h3>

<h3 align="center">Develop easier. &nbsp; Build faster. &nbsp; Integrate quicker.</h3>

<br />

<p align="center">
    <a href="https://finosfoundation.atlassian.net/wiki/display/FINOS/Incubating"><img src="https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg"></a>
    <a href="https://bestpractices.coreinfrastructure.org/projects/6303"><img src="https://bestpractices.coreinfrastructure.org/projects/6303/badge"></a>
    <a href="https://github.com/finos/fdc3-sail/blob/main/LICENSE"><img src="https://img.shields.io/github/license/finos/fdc3-sail"></a>
</p>

## What is FDC3 Sail?

If you are new to FDC3, it may be helpful to check out [The FDC3 Website](https://fdc3.finos.org)

This project provides a fully open source implementation of the [FDC3](https://fdc3.finos.com) interoperability standard. Including:

- A fully featured and browser-based desktop agent featuring:
  - intent resolution
  - channel linking
  - directory search
  - workspace tabs

## Sail v2 at OSFF!

Sail v2 is a ground-up reimplementation of the FDC3-Sail project. It is a browser-based desktop agent that allows users to run and manage FDC3 apps in browser tabs or iframes. Sail v2 is built using React and makes use of [FDC3 On The Web](https://github.com/finos/FDC3/issues?q=is%3Aissue+is%3Aopen+label%3A%22FDC3+for+Web+Browsers%22) a forthcoming addition to the FDC3 standard.

FDC3 For the Web and Sail v2 will be featured at FINOS' [OSFF New York event](https://osffny2024.sched.com) in September 2024.

### Design Decisions

1.  We should support multiple app directories.
2.  Each user channel will be a HTML tab within the main browser tab.
3.  User can name and colour the user channels, and move apps between them.
4.  This is the ONLY way to control the user channel (unless the app loads outside of the main browser tab)
5.  Message passing will happen server-side as opposed to client side as in the demo.
6.  React will be used.
7.  User state will be held in a cookie, so there's no session persistence.

## Getting Started

### Prerequisites

1.  You'll need to install `git` on your machine. Git is a version-control system and in this case will be used for downloading code from https://github.com
2.  You'll need an editor. We recommend Visual Studio Code, but you can use any editor you like.

### Checking Out the Repo

From the command line (you can open a terminal in Visual Studio Code), run the following command:

```
git clone -b sail2-osff https://github.com/finos/FDC3-Sail.git fdc3-workshop
```

Next, open the `fdc3-workshop` folder in Visual Studio Code.

### Running The Project

From the terminal in Visual Studio Code (and assuming your current directory is now `fdc3-workshop`), run the following commands:

```
npm install
npm run dev
```

Point your browser at http://localhost:8090/static/index.html

![Sail Initial Screen](images/blank-screen.png)

### Opening Apps

This tutorial version of Sail contains several apps that you can open. To open an app, click the plus icon in the bottom left corner of the sail window. You'll be given a choice of applications to open like so:

![Sail App Picker](images/open-app.png)

Once an application is opened, you'll be able to see it, and interact with it, in the main window.

![FDC3 Workbench](images/workbench.png)

## Tutorial Applications

For the purposes of the training tutorial, Sail has been bundled with two toy applications:

- `Pricer`: A simple application that displays a price for a given instrument.
- `TradeList`: A simple application that displays a list of trades.

You can start these from the app picker.

These applications are hed in the `training` folder within the Sail distribution that you downloaded and are run on their own web server on port 5000. You can access them directly by visiting http://localhost:5000/static/pricer/index.html or http://localhost:5000/static/tradelist/index.html.

**Note**: If you want to run the training apps _without running Sail_ you can do this by running `npm run dev-training` instead of `npm run dev` as described above.

## About Application Directories

The list of applications available to Sail is provided in what's called an "Application Directory Record". You can find the Application Directory Records for the tutorial applications in the `directory/training-appd.v2.json` file. This includes details about where the application is run from (e.g. http://localhost:5000/static/pricer/index.html), what it's called, images, icons and what FDC3 messages it responds to (in a section of the json called `interop:`).

## Other FDC3 Desktop Agents

FDC3 is an open standard and there are other desktop agents available. You can find a list of them on the [FDC3 Website](https://fdc3.finos.org). Sail is just a 'toy' desktop agent, but if you would rather follow the tutorial using a different desktop agent, you can do so. Here are some instructions provided by other vendors to get started with their desktop agents.

- [Connectifi](training/instructions/Connectifi.md)

## Mailing List

To join the Electron FDC3 Desktop Agent & App Directory mailing list please email [fdc3-sail+subscribe@lists.finos.org](mailto:fdc3-sail+subscribe@lists.finos.org).

## Contributing

1. Fork it (<https://github.com/finos/fdc3-sail/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Read our [contribution guidelines](.github/CONTRIBUTING.md) and [Community Code of Conduct](https://www.finos.org/code-of-conduct)
4. Commit your changes (`git commit -am 'Add some fooBar'`)
5. Push to the branch (`git push origin feature/fooBar`)
6. Create a new Pull Request

_NOTE:_ Commits and pull requests to FINOS repositories will only be accepted from those contributors with an active, executed Individual Contributor License Agreement (ICLA) with FINOS OR who are covered under an existing and active Corporate Contribution License Agreement (CCLA) executed with FINOS. Commits from individuals not covered under an ICLA or CCLA will be flagged and blocked by the FINOS Clabot tool (or [EasyCLA](https://github.com/finos/community/blob/master/governance/Software-Projects/EasyCLA.md)). Please note that some CCLAs require individuals/employees to be explicitly named on the CCLA.

_Need an ICLA? Unsure if you are covered under an existing CCLA? Email [help@finos.org](mailto:help@finos.org)_

## License

Copyright 2022 FINOS

Distributed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

SPDX-License-Identifier: [Apache-2.0](https://spdx.org/licenses/Apache-2.0)
