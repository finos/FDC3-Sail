Feature: App Disconnection and Cleanup

  Background:

  @fdc3_2.0
  Scenario: Apps that disconnect and reconnect to the DA should receive one copy of a broadcast message from an app channel as state was cleaned up
    Given A desktop agent
    When "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"
    And "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type           | to.appId | to.instanceId | msg.payload.channelId | msg.payload.context.type | msg.payload.context.id.ticker |
      | addContextListenerResponse | App2     | a2            | {null}                | {null}                   | {null}                        |
      | broadcastEvent             | App2     | a2            | fdc3.channel.1        | fdc3.instrument          | AAPL                          |
      | broadcastResponse          | App1     | a1            | {null}                | {null}                   | {null}                        |
    And "appId: App2, instanceId: a2" is closed
    And "appId: App2, instanceId: a2" is opened with connection id "a2"
    And "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type           | to.appId | to.instanceId | msg.payload.channelId | msg.payload.context.type | msg.payload.context.id.ticker |
      | addContextListenerResponse | App2     | a2            | {null}                | {null}                   | {null}                        |
      | broadcastEvent             | App2     | a2            | fdc3.channel.1        | fdc3.instrument          | AAPL                          |
      | broadcastResponse          | App1     | a1            | {null}                | {null}                   | {null}                        |

  @fdc3_2.0
  Scenario: Apps that disconnect and reconnect to the DA should NOT receive intent results from the previous connection as state was cleaned up
    Given "portfolioApp" is an app with the following intents
      | Intent Name   | Context Type   | Result Type |
      | ViewPortfolio | fdc3.portfolio | {empty}     |
    And "App1" is an app with the following intents
      | Intent Name | Context Type    | Result Type |
      | viewNews    | fdc3.instrument | {empty}     |
    And A desktop agent
    When "appId: PortfolioApp, instanceId: l1" is opened with connection id "l1"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: PortfolioApp, instanceId: l1" registers an intent listener for "ViewPortfolio" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "ABC123" [fdc3.raiseIntent]
    And we wait for a period of "100" ms
    And "appId: App1, instanceId: a1" is closed
    And we wait for a period of "100" ms
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and contextType "fdc3.portfolio" and raiseIntentUuid "ABC123" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type     | msg.meta.eventUuid | msg.meta.requestUuid | to.appId     | to.instanceId | msg.payload.raiseIntentRequestUuid | msg.payload.intentResolution.source.instanceId | msg.payload.intentResult.context.type |
      | intentEvent          | {empty}            | {null}               | PortfolioApp | l1            | ABC123                             | {null}                                         | {null}                                |
      | raiseIntentResponse  | {null}             | ABC123               | App1         | a1            | {null}                             | l1                                             | {null}                                |
      | intentResultResponse | {null}             | {empty}              | PortfolioApp | l1            | {null}                             | {null}                                         | {null}                                |

  @fdc3_2.0
  Scenario: Disconnecting from the DA when subscribed to a private channel channel sends unsubscribe and disconnect messages
    And A desktop agent
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"
    And "appId: App2, instanceId: a1" creates a private channel [fdc3.createPrivateChannel]
    And I alias the last private channel as "channel1Id"
    And "appId: App2, instanceId: a2" is granted access to private channel "{channel1Id}"
    When "appId: App2, instanceId: a2" adds an "disconnect" event listener on "{channel1Id}" [PrivateChannel.addEventListener]
    And "appId: App1, instanceId: a1" adds a context listener on "{channel1Id}" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App2, instanceId: a2" adds an "unsubscribe" event listener on "{channel1Id}" [PrivateChannel.addEventListener]
    And "appId: App1, instanceId: a1" is closed
    Then messaging will have outgoing posts
      | msg.matches_type                 | msg.payload.privateChannelId | msg.payload.contextType | to.appId | to.instanceId |
      | privateChannelOnUnsubscribeEvent | {channel1Id}                 | fdc3.instrument         | App2     | a2            |
      | privateChannelOnDisconnectEvent  | {channel1Id}                 | {null}                  | App2     | a2            |
