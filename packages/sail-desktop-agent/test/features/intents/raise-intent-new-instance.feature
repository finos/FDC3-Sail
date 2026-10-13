Feature: Choosing a new or existing instance when raising an intent (FDC3 3.0)

  FINOS next: website/docs/api/ref/DesktopAgent.md — raiseIntent / raiseIntentForContext `newInstance`

  Background:
    Given "portfolioApp" is an app with the following intents
      | Intent Name   | Context Type   | Result Type |
      | ViewPortfolio | fdc3.portfolio | {empty}     |
    And "uniqueIntentApp" is an app with the following intents
      | Intent Name  | Context Type    | Result Type |
      | uniqueIntent | fdc3.instrument | {empty}     |
    And A desktop agent advertising FDC3 "3.0"
    And "appId: uniqueIntentApp, instanceId: c1" is opened with connection id "c1"
    And "appId: uniqueIntentApp, instanceId: c1" registers an intent listener for "uniqueIntent" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" is opened with connection id "a1"

  @fdc3_3.0
  Scenario: newInstance false targeting an app with a running instance delivers to that instance
    When "appId: App1, instanceId: a1" raises an intent for "uniqueIntent" with contextType "fdc3.instrument" on app "uniqueIntentApp" with newInstance "false" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | msg.payload.intent | to.instanceId | msg.payload.intentResolution.source.instanceId |
      | intentEvent         | uniqueIntent       | c1            | {null}                                         |
      | raiseIntentResponse | {null}             | a1            | c1                                             |

  @fdc3_3.0
  Scenario: newInstance false targeting an app with no running instance fails with TargetInstanceUnavailable
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "portfolioApp" with newInstance "false" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error         | to.instanceId |
      | raiseIntentResponse | TargetInstanceUnavailable | a1            |
    And no instance is named "uuid-0"

  @fdc3_3.0
  Scenario: newInstance false with no target fails when no instance is running
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "{null}" with newInstance "false" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error         | to.instanceId |
      | raiseIntentResponse | TargetInstanceUnavailable | a1            |

  @fdc3_3.0
  Scenario: newInstance false with no target delivers to the running instance
    When "appId: App1, instanceId: a1" raises an intent for "uniqueIntent" with contextType "fdc3.instrument" on app "{null}" with newInstance "false" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | msg.payload.intent | to.instanceId |
      | intentEvent         | uniqueIntent       | c1            |
      | raiseIntentResponse | {null}             | a1            |

  @fdc3_3.0
  Scenario: newInstance true targeting an app launches a new instance even though one is running
    When "appId: App1, instanceId: a1" raises an intent for "uniqueIntent" with contextType "fdc3.instrument" on app "uniqueIntentApp" with newInstance "true" [fdc3.raiseIntent]
    And "uuid-0" sends validate
    And "appId: uniqueIntentApp, instanceId: uuid-0" registers an intent listener for "uniqueIntent" [fdc3.addIntentListener]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.payload.intent | to.instanceId | msg.payload.intentResolution.source.instanceId |
      | addIntentListenerResponse | {null}             | uuid-0        | {null}                                         |
      | intentEvent               | uniqueIntent       | uuid-0        | {null}                                         |
      | raiseIntentResponse       | {null}             | a1            | uuid-0                                         |

  @fdc3_3.0
  Scenario: newInstance true with no target launches a new instance even though one is running
    When "appId: App1, instanceId: a1" raises an intent for "uniqueIntent" with contextType "fdc3.instrument" on app "{null}" with newInstance "true" [fdc3.raiseIntent]
    And "uuid-0" sends validate
    And "appId: uniqueIntentApp, instanceId: uuid-0" registers an intent listener for "uniqueIntent" [fdc3.addIntentListener]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.payload.intent | to.instanceId |
      | addIntentListenerResponse | {null}             | uuid-0        |
      | intentEvent               | uniqueIntent       | uuid-0        |
      | raiseIntentResponse       | {null}             | a1            |

  @fdc3_3.0
  Scenario: raiseIntentForContext with newInstance false and no running instance fails with TargetInstanceUnavailable
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.portfolio" on app "portfolioApp" with newInstance "false" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.type                      | msg.payload.error         | to.instanceId |
      | raiseIntentForContextResponse | TargetInstanceUnavailable | a1            |

  @fdc3_3.0
  Scenario: raiseIntentForContext with newInstance true launches a new instance even though one is running
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.instrument" on app "uniqueIntentApp" with newInstance "true" [fdc3.raiseIntentForContext]
    And "uuid-0" sends validate
    And "appId: uniqueIntentApp, instanceId: uuid-0" registers an intent listener for "uniqueIntent" [fdc3.addIntentListener]
    Then messaging will include outgoing posts
      | msg.matches_type | msg.payload.intent | to.instanceId |
      | intentEvent      | uniqueIntent       | uuid-0        |
