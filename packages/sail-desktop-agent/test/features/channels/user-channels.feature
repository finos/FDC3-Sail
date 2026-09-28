Feature: User channels

  Background:
      This creates 8 user channels: fdc3.channel.1 through fdc3.channel.8

    Given "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"

  @fdc3_2.0
  Scenario: List User Channels
    When "appId: App1, instanceId: a1" gets the list of user channels [fdc3.getUserChannels]
    Then messaging will have outgoing posts
      | msg.payload.userChannels[0].id | msg.payload.userChannels[1].id | msg.payload.userChannels[2].id | msg.payload.userChannels[3].id | msg.payload.userChannels[4].id | msg.payload.userChannels[5].id | msg.payload.userChannels[6].id | msg.payload.userChannels[7].id | msg.payload.userChannels[0].type | to.instanceId | msg.matches_type        |
      | fdc3.channel.1                 | fdc3.channel.2                 | fdc3.channel.3                 | fdc3.channel.4                 | fdc3.channel.5                 | fdc3.channel.6                 | fdc3.channel.7                 | fdc3.channel.8                 | user                             | a1            | getUserChannelsResponse |

  @fdc3_2.0
  Scenario: User channels include displayMetadata for all predefined channels
    When "appId: App1, instanceId: a1" gets the list of user channels [fdc3.getUserChannels]
    Then messaging will have outgoing posts
      | msg.matches_type        | to.instanceId | msg.payload.userChannels[0].displayMetadata.name | msg.payload.userChannels[0].displayMetadata.color | msg.payload.userChannels[1].displayMetadata.name | msg.payload.userChannels[2].displayMetadata.name | msg.payload.userChannels[3].displayMetadata.name | msg.payload.userChannels[4].displayMetadata.name | msg.payload.userChannels[5].displayMetadata.name | msg.payload.userChannels[6].displayMetadata.name | msg.payload.userChannels[7].displayMetadata.name |
      | getUserChannelsResponse | a1            | Channel 1                                        | #FF0000                                           | Channel 2                                        | Channel 3                                        | Channel 4                                        | Channel 5                                        | Channel 6                                        | Channel 7                                        | Channel 8                                        |

  @fdc3_2.0
  Scenario: Initial User Channel
        At startup, the user channel shouldn't be set

    When "appId: App1, instanceId: a1" gets the current user channel [fdc3.getCurrentChannel]
    Then messaging will have outgoing posts
      | msg.payload.channel.id | to.instanceId | msg.matches_type          |
      | {null}                 | a1            | getCurrentChannelResponse |

  @fdc3_2.0
  Scenario: Changing Channel
        You should be able to join a channel knowing it's ID.

    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App1, instanceId: a1" gets the current user channel [fdc3.getCurrentChannel]
    Then messaging will have outgoing posts
      | msg.payload.channel.id | to.instanceId | msg.matches_type          |
      | {null}                 | a1            | joinUserChannelResponse   |
      | fdc3.channel.1         | a1            | getCurrentChannelResponse |

  @fdc3_2.0
  Scenario: Adding a Typed Listener on a given User Channel
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.payload.channelId | msg.payload.context.type | msg.matches_type  | to.instanceId |
      | fdc3.channel.1        | fdc3.instrument          | broadcastEvent    | a1            |
      | {null}                | {null}                   | broadcastResponse | a2            |

  @fdc3_2.0
  Scenario: Adding an Un-Typed Listener on a given User Channel
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" adds a context listener on "fdc3.channel.1" with type "{null}" [fdc3.addContextListener]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.payload.channelId | msg.payload.context.type | msg.matches_type  | to.instanceId |
      | fdc3.channel.1        | fdc3.instrument          | broadcastEvent    | a1            |
      | {null}                | {null}                   | broadcastResponse | a2            |

  @fdc3_2.0
  Scenario: If you haven't joined a channel, your listener receives nothing
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" adds a context listener on "fdc3.channel.1" with type "{null}" [fdc3.addContextListener]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.2" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId |
      | joinUserChannelResponse    | a1            |
      | addContextListenerResponse | a1            |
      | broadcastResponse          | a2            |

  @fdc3_2.0
  Scenario: After unsubscribing, my listener shouldn't receive any more messages
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" adds a context listener on "fdc3.channel.1" with type "{null}" [fdc3.addContextListener]
    And "appId: App, instanceId: a1" removes context listener with id "{lastContextListenerId}" [fdc3.removeContextListener]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type                   | msg.payload.listenerUUID |
      | joinUserChannelResponse            | {null}                   |
      | addContextListenerResponse         | {lastContextListenerId}  |
      | contextListenerUnsubscribeResponse | {null}                   |
      | broadcastResponse                  | {null}                   |

  @fdc3_2.0
  Scenario: I should be able to leave a user channel, and not receive messages on it
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" adds a context listener on "fdc3.channel.1" with type "{null}" [fdc3.addContextListener]
    And "appId: App, instanceId: a1" leaves the current user channel [fdc3.leaveCurrentChannel]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type            |
      | joinUserChannelResponse     |
      | addContextListenerResponse  |
      | leaveCurrentChannelResponse |
      | broadcastResponse           |

  @fdc3_2.0
  Scenario: Joining a user channel that doesn't exist throws an error
    When "appId: App, instanceId: a1" joins user channel "twenty" [fdc3.joinUserChannel]
    Then messaging will have outgoing posts
      | msg.payload.error | msg.type                |
      | NoChannelFound    | joinUserChannelResponse |

  @fdc3_2.0
  Scenario: Joining an app channel throws an error
    When "appId: App, instanceId: a2" creates or gets an app channel called "bizboz" [fdc3.getOrCreateChannel]
    When "appId: App, instanceId: a1" joins user channel "bizboz" [fdc3.joinUserChannel]
    Then messaging will have outgoing posts
      | msg.payload.error | msg.type                |
      | NoChannelFound    | joinUserChannelResponse |

  @fdc3_2.0
  Scenario: You can get the details of the last context type sent
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.country" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App, instanceId: a1" gets the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    And "appId: App, instanceId: a1" gets the latest context on "fdc3.channel.1" with type "fdc3.country" [fdc3.getCurrentContext]
    And "appId: App, instanceId: a1" gets the latest context on "fdc3.channel.1" with type "{null}" [fdc3.getCurrentContext]
    And "appId: App, instanceId: a1" gets the latest context on "fdc3.channel.1" with type "fdc3.sausage" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.payload.context.type | msg.payload.context.name | msg.matches_type          |
      | fdc3.instrument          | Apple                    | getCurrentContextResponse |
      | fdc3.country             | Sweden                   | getCurrentContextResponse |
      | fdc3.country             | Sweden                   | getCurrentContextResponse |
      | {null}                   | {null}                   | getCurrentContextResponse |

  @fdc3_2.0
  Scenario: Changing channel changes the listener channels too
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" adds a context listener on "{null}" with type "{null}" [fdc3.addContextListener]
    And "appId: App, instanceId: a1" joins user channel "fdc3.channel.2" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.2" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.country" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.payload.channelId | msg.payload.context.type | msg.matches_type  |
      | fdc3.channel.2        | fdc3.instrument          | broadcastEvent    |
      | {null}                | {null}                   | broadcastResponse |
      | {null}                | {null}                   | broadcastResponse |

  @fdc3_2.0
  Scenario: You can get the details of the last context type when none is set
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" gets the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    And "appId: App, instanceId: a1" gets the latest context on "fdc3.channel.1" with type "{null}" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.payload.context.type | msg.payload.context.name | msg.matches_type          |
      | {null}                   | {null}                   | getCurrentContextResponse |
      | {null}                   | {null}                   | getCurrentContextResponse |

  @fdc3_2.0
  Scenario: Current context is delivered when joining a user channel
    When "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App, instanceId: a1" adds a context listener on "{null}" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.channelId | msg.payload.context.type | to.instanceId |
      | broadcastResponse          | {null}                | {null}                   | a2            |
      | addContextListenerResponse | {null}                | {null}                   | a1            |
      | joinUserChannelResponse    | {null}                | {null}                   | a1            |
      | broadcastEvent             | fdc3.channel.1        | fdc3.instrument          | a1            |

  @fdc3_2.0
  Scenario: Current context is delivered when adding a listener on a joined channel
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App, instanceId: a1" adds a context listener on "{null}" with type "fdc3.instrument" [fdc3.addContextListener]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.channelId | msg.payload.context.type | to.instanceId |
      | joinUserChannelResponse    | {null}                | {null}                   | a1            |
      | broadcastResponse          | {null}                | {null}                   | a2            |
      | addContextListenerResponse | {null}                | {null}                   | a1            |
      | broadcastEvent             | fdc3.channel.1        | fdc3.instrument          | a1            |

  @fdc3_2.0
  Scenario: Broadcasting on a user channel does not echo back to the sender
    When "appId: App, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App, instanceId: a1" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId |
      | joinUserChannelResponse    | a1            |
      | addContextListenerResponse | a1            |
      | broadcastResponse          | a1            |
    And messaging will have 3 posts

  @fdc3_2.0
  Scenario: App channel listener does not change current user channel
    When "appId: App1, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App1, instanceId: a1" creates or gets an app channel called "workflow" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" adds a context listener on "workflow" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" gets the current user channel [fdc3.getCurrentChannel]
    Then messaging will include outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.channel.id |
      | getCurrentChannelResponse | a1            | fdc3.channel.1         |

  @fdc3_2.0
  Scenario: Broadcast without channel id is rejected as malformed, not routed to the joined user channel
    When "appId: App1, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" without channel id [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type  | to.instanceId | msg.payload.error |
      | broadcastResponse | a1            | NoChannelFound     |
    And messaging will have 0 posts matching type "broadcastEvent"

  @fdc3_2.0
  Scenario: App channel explicit broadcast still reaches listeners while joined to a user channel
    When "appId: App1, instanceId: a1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: App1, instanceId: a1" creates or gets an app channel called "workflow" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "workflow" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "workflow" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type  | to.instanceId | msg.payload.channelId | msg.payload.context.type |
      | broadcastEvent    | a2            | workflow              | fdc3.instrument          |
      | broadcastResponse | a1            | {null}                | {null}                   |
