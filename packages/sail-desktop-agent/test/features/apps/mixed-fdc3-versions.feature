Feature: FDC3 2.2 and 3.0 apps on one Desktop Agent

  Each app is served at min(WCP1Hello.fdc3Version, the agent's version). A 2.2 app gets messages
  in 2.2 shape (no 3.0 metadata, no 3.0-only events) even when the sender is a 3.0 app.

  Background:
    Given "legacyApp" is an app with the following intents
      | Intent Name | Context Type    | Result Type |
      | ViewChart   | fdc3.instrument | {empty}     |
    And "modernApp" is an app with the following intents
      | Intent Name | Context Type    | Result Type |
      | ViewNews    | fdc3.instrument | {empty}     |
    And A desktop agent advertising FDC3 "3.0"
    And "appId: legacyApp, instanceId: l1" is opened with connection id "l1" at FDC3 "2.2"
    And "appId: modernApp, instanceId: m1" is opened with connection id "m1" at FDC3 "3.0"

  @fdc3_3.0
  Scenario: getInfo reports the version each app was served at
    When "appId: legacyApp, instanceId: l1" requests info on the DesktopAgent [fdc3.getInfo]
    And "appId: modernApp, instanceId: m1" requests info on the DesktopAgent [fdc3.getInfo]
    Then messaging will have outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.implementationMetadata.fdc3Version | msg.payload.implementationMetadata.optionalFeatures.OriginatingAppMetadata |
      | getInfoResponse  | l1            | 2.2                                            | true                                                                       |
      | getInfoResponse  | m1            | 3.0                                            | {null}                                                                     |

  @fdc3_3.0
  Scenario: A broadcast with metadata reaches each app in its own version's shape
    When "appId: legacyApp, instanceId: l1" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: modernApp, instanceId: m1" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: modernApp, instanceId: m1" broadcasts "fdc3.instrument" on "fdc3.channel.1" with metadata traceId "modern-trace" [fdc3.broadcast]
    And "appId: legacyApp, instanceId: l1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.originatingApp.appId | msg.payload.metadata.source.appId | msg.payload.metadata.traceId |
      | broadcastEvent   | l1            | modernApp                        | {null}                            | {null}                       |
      | broadcastEvent   | m1            | legacyApp                        | legacyApp                         | MUST-BE-NON-EMPTY            |
    And no "broadcastEvent" sent to "l1" has a "metadata" field

  @fdc3_3.0
  Scenario: clearContext by a 3.0 app then getCurrentContext from both apps
    When "appId: modernApp, instanceId: m1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    And "appId: legacyApp, instanceId: l1" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    And "appId: modernApp, instanceId: m1" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.context.type | msg.payload.metadata.source.appId |
      | getCurrentContextResponse | l1            | fdc3.instrument          | {null}                            |
      | getCurrentContextResponse | m1            | fdc3.instrument          | modernApp                         |
    When "appId: modernApp, instanceId: m1" clears context "{null}" on "fdc3.channel.1" [Channel.clearContext]
    And "appId: legacyApp, instanceId: l1" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    And "appId: modernApp, instanceId: m1" asks for the latest context on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.getCurrentContext]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.context |
      | getCurrentContextResponse | l1            | {null}              |
      | getCurrentContextResponse | m1            | {null}              |
    And no "getCurrentContextResponse" sent to "l1" has a "metadata" field
    And the last "getCurrentContextResponse" has "context" and "metadata" set to null

  @fdc3_3.0
  Scenario: A 2.2 app listening for all events is not sent contextClearedEvent
    When "appId: legacyApp, instanceId: l1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: legacyApp, instanceId: l1" adds an event listener for all event types [fdc3.addEventListener]
    And "appId: modernApp, instanceId: m1" joins user channel "fdc3.channel.1" [fdc3.joinUserChannel]
    And "appId: modernApp, instanceId: m1" adds an event listener for all event types [fdc3.addEventListener]
    And "appId: modernApp, instanceId: m1" clears context "{null}" on "fdc3.channel.1" [Channel.clearContext]
    Then no "contextClearedEvent" is sent to "l1"
    And exactly 1 "contextClearedEvent" is sent to "m1"

  @fdc3_3.0
  Scenario: Intents raised across versions reach each app in its own version's shape
    Given "appId: legacyApp, instanceId: l1" registers an intent listener for "ViewChart" [fdc3.addIntentListener]
    And "appId: modernApp, instanceId: m1" registers an intent listener for "ViewNews" [fdc3.addIntentListener]
    When "appId: modernApp, instanceId: m1" raises an intent for "ViewChart" with contextType "fdc3.instrument" on app "legacyApp" [fdc3.raiseIntent]
    And "appId: legacyApp, instanceId: l1" raises an intent for "ViewNews" with contextType "fdc3.instrument" on app "modernApp" [fdc3.raiseIntent]
    Then messaging will include outgoing posts
      | msg.matches_type    | to.instanceId | msg.payload.intent | msg.payload.originatingApp.appId | msg.payload.metadata.source.appId |
      | intentEvent         | l1            | ViewChart          | modernApp                        | {null}                            |
      | intentEvent         | m1            | ViewNews           | legacyApp                        | legacyApp                         |
      | raiseIntentResponse | m1            | {null}             | {null}                           | {null}                            |
      | raiseIntentResponse | l1            | {null}             | {null}                           | {null}                            |
    And no "intentEvent" sent to "l1" has a "metadata" field

  @fdc3_3.0
  Scenario: A 2.2 app cannot use fdc3.close on a 3.0 agent
    When "appId: legacyApp, instanceId: l1" requests close [fdc3.close]
    Then messaging will have outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.error |
      | closeResponse    | l1            | ErrorOnClose      |
