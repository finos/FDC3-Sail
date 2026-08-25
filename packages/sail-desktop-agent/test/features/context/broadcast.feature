Feature: Relaying Broadcast messages

  Background:
    Given "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"

  @fdc3_2.0
  Scenario: Broadcast message to no-one
    When "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type  |
      | broadcastResponse |
    And messaging will have 1 posts

  @fdc3_2.0
  Scenario: Broadcast message sent to one listener
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.appId | to.instanceId | msg.payload.channelId | msg.payload.context.type | msg.payload.context.id.ticker |
      | addContextListenerResponse | App2     | a2            | {null}                | {null}                   | {null}                        |
      | broadcastEvent             | App2     | a2            | fdc3.channel.1        | fdc3.instrument          | AAPL                          |
      | broadcastResponse          | App1     | a1            | {null}                | {null}                   | {null}                        |

  @fdc3_2.0
  Scenario: Broadcast Event Includes OriginatingApp Metadata
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type  | to.appId | to.instanceId | msg.payload.originatingApp.appId | msg.payload.originatingApp.instanceId |
      | broadcastEvent    | App2     | a2            | App1                             | a1                                    |
      | broadcastResponse | App1     | a1            | {null}                           | {null}                                |

  @fdc3_2.0
  Scenario: Broadcast message sent but listener has unsubscribed
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App2, instanceId: a2" removes context listener with id "{lastContextListenerId}" [fdc3.removeContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type                   | to.appId | to.instanceId | msg.payload.listenerUUID   |
      | addContextListenerResponse         | App2     | a2            | {lastContextListenerId}  |
      | contextListenerUnsubscribeResponse | App2     | a2            | {null}                   |
      | broadcastResponse                  | App1     | a1            | {null}                   |

  @fdc3_2.0
  Scenario: Get The Latest Context From A Channel
    Given "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: App1, instanceId: a1" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.appId | to.instanceId | msg.payload.context.id.ticker | msg.payload.context.type |
      | getCurrentContextResponse | App1     | a1            | AAPL                          | fdc3.instrument          |

  @fdc3_2.0
  Scenario: Broadcast Is A No-Op When Not Joined To A User Channel
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "{null}" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type           | to.instanceId |
      | addContextListenerResponse | a2            |
      | broadcastResponse          | a1            |
    And messaging will have 2 posts

  @fdc3_2.0
  Scenario: Broadcast With Malformed Context Returns MalformedContext Error
    When "appId: App1, instanceId: a1" broadcasts "fdc3.malformed" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will have outgoing posts
      | msg.matches_type  | msg.payload.error | to.instanceId |
      | broadcastResponse | MalformedContext  | a1            |
