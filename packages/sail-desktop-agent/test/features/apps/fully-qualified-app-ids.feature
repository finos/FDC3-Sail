Feature: Fully-qualified and unqualified appIds (FDC3 3.0)

  FINOS next: website/docs/api/spec.md — Fully-Qualified AppIds. An AppIdentifier's appId is matched
  exactly first, then by its unqualified part (before "@"). Results use the appId that was matched.

  Background:
    Given "chartApp@appd.example.com" is an app with the following intents
      | Intent Name | Context Type    | Result Type |
      | ViewChart   | fdc3.instrument | {empty}     |
    And "newsApp" is an app with the following intents
      | Intent Name | Context Type    | Result Type |
      | ViewNews    | fdc3.instrument | {empty}     |
    And A desktop agent advertising FDC3 "3.0"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"

  @fdc3_3.0
  Scenario: getAppMetadata with an unqualified appId returns the fully-qualified app
    When "appId: App1, instanceId: a1" requests metadata for "chartApp" [fdc3.getAppMetadata]
    Then messaging will have outgoing posts
      | msg.matches_type       | to.instanceId | msg.payload.appMetadata.appId |
      | getAppMetadataResponse | a1            | chartApp@appd.example.com     |

  @fdc3_3.0
  Scenario: getAppMetadata with a fully-qualified appId matches a known unqualified app
    When "appId: App1, instanceId: a1" requests metadata for "newsApp@appd.example.com" [fdc3.getAppMetadata]
    Then messaging will have outgoing posts
      | msg.matches_type       | to.instanceId | msg.payload.appMetadata.appId |
      | getAppMetadataResponse | a1            | newsApp                       |

  @fdc3_3.0
  Scenario: findInstances with an unqualified appId finds the fully-qualified app's instances
    When "appId: chartApp@appd.example.com, instanceId: c1" is opened with connection id "c1"
    And "appId: App1, instanceId: a1" findsInstances of "chartApp" [fdc3.findInstances]
    Then messaging will have outgoing posts
      | msg.matches_type      | to.instanceId | msg.payload.appIdentifiers.length | msg.payload.appIdentifiers[0].appId | msg.payload.appIdentifiers[0].instanceId |
      | findInstancesResponse | a1            | 1                                 | chartApp@appd.example.com           | c1                                       |

  @fdc3_3.0
  Scenario: open with an unqualified appId launches the fully-qualified app
    When "appId: App1, instanceId: a1" opens app "chartApp" [fdc3.open]
    And "uuid-0" sends validate
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.appIdentifier.appId |
      | openResponse     | a1            | chartApp@appd.example.com       |

  @fdc3_3.0
  Scenario: raiseIntent targeting an unqualified appId resolves to the fully-qualified app
    When "appId: chartApp@appd.example.com, instanceId: c1" is opened with connection id "c1"
    And "appId: chartApp@appd.example.com, instanceId: c1" registers an intent listener for "ViewChart" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" raises an intent for "ViewChart" with contextType "fdc3.instrument" on app "chartApp" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | to.instanceId | msg.payload.intentResolution.source.appId |
      | intentEvent         | c1            | {null}                                    |
      | raiseIntentResponse | a1            | chartApp@appd.example.com                 |
