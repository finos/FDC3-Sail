Feature: App Channels

  App channels are created on-demand by applications for sharing context
  in specific workflows. Unlike user channels, app channels are not
  pre-defined and can be created with any name.

  Background:
    Given "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"

  @fdc3_2.0
  Scenario: Creating a new app channel
    When "appId: App1, instanceId: a1" creates or gets an app channel called "myAppChannel" [fdc3.getOrCreateChannel]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.channel.id | msg.payload.channel.type | to.instanceId |
      | getOrCreateChannelResponse | myAppChannel           | app                      | a1            |

  @fdc3_2.0
  Scenario: App channel IDs cannot match user channel IDs
    When "appId: App1, instanceId: a1" creates or gets an app channel called "one" [fdc3.getOrCreateChannel]
    Then messaging will have outgoing posts
      | msg.type                   | msg.payload.error | to.instanceId |
      | getOrCreateChannelResponse | AccessDenied      | a1            |

  @fdc3_2.0
  Scenario: Getting an existing app channel
    When "appId: App1, instanceId: a1" creates or gets an app channel called "sharedChannel" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" creates or gets an app channel called "sharedChannel" [fdc3.getOrCreateChannel]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.channel.id | msg.payload.channel.type | to.instanceId |
      | getOrCreateChannelResponse | sharedChannel          | app                      | a1            |
      | getOrCreateChannelResponse | sharedChannel          | app                      | a2            |

  @fdc3_2.0
  Scenario: Broadcasting context on an app channel
    When "appId: App1, instanceId: a1" creates or gets an app channel called "dataChannel" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "dataChannel" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "dataChannel" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId | msg.payload.channelId | msg.payload.context.type |
      | getOrCreateChannelResponse | a1            | {null}                | {null}                   |
      | addContextListenerResponse | a2            | {null}                | {null}                   |
      | broadcastEvent             | a2            | dataChannel           | fdc3.instrument          |
      | broadcastResponse          | a1            | {null}                | {null}                   |

  @fdc3_2.0
  Scenario: Getting the latest context from an app channel
    When "appId: App1, instanceId: a1" creates or gets an app channel called "contextChannel" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "contextChannel" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" gets the latest context on "contextChannel" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.context.type | msg.payload.context.id.ticker | to.instanceId |
      | getOrCreateChannelResponse | {null}                   | {null}                        | a1            |
      | broadcastResponse          | {null}                   | {null}                        | a1            |
      | getCurrentContextResponse  | fdc3.instrument          | AAPL                          | a2            |

  @fdc3_2.0
  Scenario: Getting the latest context when none has been broadcast
    When "appId: App1, instanceId: a1" creates or gets an app channel called "emptyChannel" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" gets the latest context on "emptyChannel" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.context.type | to.instanceId |
      | getOrCreateChannelResponse | {null}                   | a1            |
      | getCurrentContextResponse  | {null}                   | a2            |

  @fdc3_2.0
  Scenario: Multiple context types on an app channel
    When "appId: App1, instanceId: a1" creates or gets an app channel called "multiContextChannel" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "multiContextChannel" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.country" on "multiContextChannel" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" gets the latest context on "multiContextChannel" with type "fdc3.instrument" [fdc3.getCurrentContext]
    And "appId: App2, instanceId: a2" gets the latest context on "multiContextChannel" with type "fdc3.country" [fdc3.getCurrentContext]
    And "appId: App2, instanceId: a2" gets the latest context on "multiContextChannel" with type "{null}" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.context.type | msg.payload.context.name | to.instanceId |
      | getOrCreateChannelResponse | {null}                   | {null}                   | a1            |
      | broadcastResponse          | {null}                   | {null}                   | a1            |
      | broadcastResponse          | {null}                   | {null}                   | a1            |
      | getCurrentContextResponse  | fdc3.instrument          | Apple                    | a2            |
      | getCurrentContextResponse  | fdc3.country             | Sweden                   | a2            |
      | getCurrentContextResponse  | fdc3.country             | Sweden                   | a2            |

  @fdc3_2.0
  Scenario: Untyped context listener on app channel receives all context types
    When "appId: App1, instanceId: a1" creates or gets an app channel called "anyContextChannel" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "anyContextChannel" with type "{null}" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "anyContextChannel" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.country" on "anyContextChannel" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId | msg.payload.channelId  | msg.payload.context.type |
      | getOrCreateChannelResponse | a1            | {null}                 | {null}                   |
      | addContextListenerResponse | a2            | {null}                 | {null}                   |
      | broadcastEvent             | a2            | anyContextChannel      | fdc3.instrument          |
      | broadcastResponse          | a1            | {null}                 | {null}                   |
      | broadcastEvent             | a2            | anyContextChannel      | fdc3.country             |
      | broadcastResponse          | a1            | {null}                 | {null}                   |

  @fdc3_2.0
  Scenario: Unsubscribing from app channel context listener
    When "appId: App1, instanceId: a1" creates or gets an app channel called "unsubChannel" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "unsubChannel" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App2, instanceId: a2" removes context listener with id "{lastContextListenerId}" [fdc3.removeContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "unsubChannel" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type                   | to.instanceId |
      | getOrCreateChannelResponse         | a1            |
      | addContextListenerResponse         | a2            |
      | contextListenerUnsubscribeResponse | a2            |
      | broadcastResponse                  | a1            |

  @fdc3_2.0
  Scenario: App channel names are case-sensitive
    When "appId: App1, instanceId: a1" creates or gets an app channel called "MyChannel" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" creates or gets an app channel called "mychannel" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "MyChannel" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" gets the latest context on "mychannel" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.channel.id | msg.payload.context.type | to.instanceId |
      | getOrCreateChannelResponse | MyChannel              | {null}                   | a1            |
      | getOrCreateChannelResponse | mychannel              | {null}                   | a2            |
      | broadcastResponse          | {null}                 | {null}                   | a1            |
      | getCurrentContextResponse  | {null}                 | {null}                   | a2            |

  @fdc3_2.0
  Scenario: Broadcasts do not cross app channels
    When "appId: App1, instanceId: a1" creates or gets an app channel called "channelA" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "channelA" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" creates or gets an app channel called "channelB" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "channelB" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId | msg.payload.channelId | msg.payload.context.type |
      | getOrCreateChannelResponse | a1            | {null}                | {null}                   |
      | addContextListenerResponse | a2            | {null}                | {null}                   |
      | getOrCreateChannelResponse | a1            | {null}                | {null}                   |
      | broadcastResponse          | a1            | {null}                | {null}                   |

  @fdc3_2.0
  Scenario: Broadcasting on an app channel does not echo back to the sender
    When "appId: App1, instanceId: a1" creates or gets an app channel called "selfChannel" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" adds a context listener on "selfChannel" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "selfChannel" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId |
      | getOrCreateChannelResponse | a1            |
      | addContextListenerResponse | a1            |
      | broadcastResponse          | a1            |
    And messaging will have 3 posts

  # Contrast with fdc3.addContextListener (DA-level): when a DA-level listener is added while
  # already joined to a user channel, the existing context IS auto-delivered. Channel.addContextListener
  # on an app (or any named) channel must NOT auto-deliver prior context — callers must use
  # getCurrentContext() to retrieve it explicitly.
  @fdc3_2.0
  Scenario: Channel.addContextListener does not auto-deliver prior context
    When "appId: App1, instanceId: a1" creates or gets an app channel called "priorContextChannel" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "priorContextChannel" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" adds a context listener on "priorContextChannel" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId |
      | getOrCreateChannelResponse | a1            |
      | broadcastResponse          | a1            |
      | addContextListenerResponse | a2            |
    And messaging will have 3 posts

  @app-channels
  @fdc3_2.0
  Scenario: Listener subscribed after two broadcasts only receives subsequent broadcasts
    When "appId: App1, instanceId: a1" creates or gets an app channel called "historyChannel" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "historyChannel" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.country" on "historyChannel" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" adds a context listener on "historyChannel" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "historyChannel" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId | msg.payload.channelId | msg.payload.context.type |
      | getOrCreateChannelResponse | a1            | {null}                | {null}                   |
      | broadcastResponse          | a1            | {null}                | {null}                   |
      | broadcastResponse          | a1            | {null}                | {null}                   |
      | addContextListenerResponse | a2            | {null}                | {null}                   |
      | broadcastEvent             | a2            | historyChannel        | fdc3.instrument          |
      | broadcastResponse          | a1            | {null}                | {null}                   |

  @app-channels
  @fdc3_2.0
  Scenario: getCurrentContext returns latest after multiple broadcasts in order
    When "appId: App1, instanceId: a1" creates or gets an app channel called "orderChannel" [fdc3.getOrCreateChannel]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.country" on "orderChannel" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "orderChannel" [fdc3.broadcast]
    And "appId: App2, instanceId: a2" gets the latest context on "orderChannel" with type "{null}" [fdc3.getCurrentContext]
    And "appId: App2, instanceId: a2" gets the latest context on "orderChannel" with type "fdc3.country" [fdc3.getCurrentContext]
    And "appId: App2, instanceId: a2" gets the latest context on "orderChannel" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type           | msg.payload.context.type | msg.payload.context.name | to.instanceId |
      | getOrCreateChannelResponse | {null}                   | {null}                   | a1            |
      | broadcastResponse          | {null}                   | {null}                   | a1            |
      | broadcastResponse          | {null}                   | {null}                   | a1            |
      | getCurrentContextResponse  | fdc3.instrument          | Apple                    | a2            |
      | getCurrentContextResponse  | fdc3.country             | Sweden                   | a2            |
      | getCurrentContextResponse  | fdc3.instrument          | Apple                    | a2            |

  @fdc3_2.0
  Scenario: Multiple typed listeners on an app channel receive matching contexts
    When "appId: App3, instanceId: a3" is opened with connection id "a3"
    And "appId: App1, instanceId: a1" creates or gets an app channel called "multiListenerChannel" [fdc3.getOrCreateChannel]
    And "appId: App2, instanceId: a2" adds a context listener on "multiListenerChannel" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App3, instanceId: a3" adds a context listener on "multiListenerChannel" with type "fdc3.country" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "multiListenerChannel" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.country" on "multiListenerChannel" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId | msg.payload.channelId    | msg.payload.context.type |
      | getOrCreateChannelResponse | a1            | {null}                   | {null}                   |
      | addContextListenerResponse | a2            | {null}                   | {null}                   |
      | addContextListenerResponse | a3            | {null}                   | {null}                   |
      | broadcastEvent             | a2            | multiListenerChannel     | fdc3.instrument          |
      | broadcastResponse          | a1            | {null}                   | {null}                   |
      | broadcastEvent             | a3            | multiListenerChannel     | fdc3.country             |
      | broadcastResponse          | a1            | {null}                   | {null}                   |
