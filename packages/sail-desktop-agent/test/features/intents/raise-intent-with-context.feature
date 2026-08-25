Feature: Raising Intents For Context

  Background:
    Given "portfolioApp" is an app with the following intents
      | Intent Name    | Context Type    | Result Type |
      | ViewPortfolio  | fdc3.portfolio  | {empty}     |
      | ViewChart      | fdc3.portfolio  | {empty}     |
      | ViewInstrument | fdc3.instrument | {empty}     |
    And "listenerApp" is an app with the following intents
      | Intent Name | Context Type   | Result Type |
      | ViewChart   | fdc3.portfolio | {empty}     |
    And "unusedApp" is an app with the following intents
      | Intent Name | Context Type | Result Type |
    And "nothingApp" is an app with the following intents
      | Intent Name | Context Type | Result Type |
      | StartChat   | fdc3.nothing | {empty}     |
    And A desktop agent
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: listenerApp, instanceId: b1" is opened with connection id "b1"
    And "appId: listenerApp, instanceId: b1" registers an intent listener for "ViewPortfolio" [fdc3.addIntentListener]
    And "appId: nothingApp, instanceId: n1" is opened with connection id "n1"
    And "appId: nothingApp, instanceId: n1" registers an intent listener for "StartChat" [fdc3.addIntentListener]

  @fdc3_2.0
  Scenario: Raising an Intent With Context to a Non-Existent App
    And "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.instrument" on app "completelyMadeUp" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.type                      | msg.payload.error    | to.instanceId | to.appId |
      | raiseIntentForContextResponse | TargetAppUnavailable | a1            | App1     |

  @fdc3_2.0
  Scenario: Raising An Intent With Context To A Non-Existent App Instance
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.portfolio" on app "appId: portfolioApp, instanceId: unknownInstance" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.type                      | msg.payload.error         | to.instanceId |
      | raiseIntentForContextResponse | TargetInstanceUnavailable | a1            |

  @fdc3_2.0
  Scenario: Raising An Intent With Context To A Running App
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.portfolio" on app "appId: listenerApp, instanceId: b1" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.matches_type              | msg.payload.context.type | msg.payload.intent | msg.payload.originatingApp.appId | msg.payload.originatingApp.instanceId | msg.payload.intentResolution.intent | to.instanceId | to.appId    | msg.payload.intentResolution.source.appId |
      | intentEvent                   | fdc3.portfolio           | ViewChart          | App1                             | a1                                    | {null}                              | b1            | listenerApp | {null}                                    |
      | raiseIntentForContextResponse | {null}                   | {null}             | {null}                           | {null}                                | ViewChart                           | a1            | App1        | listenerApp                               |

  @fdc3_2.0
  Scenario: Raising An Intent With Context To A Non-Running App
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.instrument" on app "portfolioApp" [fdc3.raiseIntentForContext]
    And "uuid-0" sends validate
    And "appId: portfolioApp, instanceId: uuid-0" registers an intent listener for "ViewInstrument" [fdc3.addIntentListener]
    Then messaging will have outgoing posts
      | msg.matches_type              | msg.payload.intent | to.instanceId | to.appId     | msg.payload.context.type |
      | addIntentListenerResponse     | {null}             | uuid-0        | portfolioApp | {null}                   |
      | intentEvent                   | ViewInstrument     | uuid-0        | portfolioApp | fdc3.instrument          |
      | raiseIntentForContextResponse | {null}             | a1            | App1         | {null}                   |

  @fdc3_2.0
  Scenario: Raising An Intent With Context To A Broken App that doesn't add an intent listener
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.instrument" on app "portfolioApp" [fdc3.raiseIntentForContext]
    And "uuid-0" sends validate
    And we wait for the intent timeout
    Then messaging will have outgoing posts
      | msg.type                      | msg.payload.error    | to.instanceId | to.appId |
      | raiseIntentForContextResponse | IntentDeliveryFailed | a1            | App1     |

  @fdc3_2.0
  Scenario: User Must Choose An Intent using The Intent Resolver
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.portfolio" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.type                      | msg.payload.appIntents[0].intent.name | msg.payload.appIntents[1].intent.name | to.instanceId | to.appId |
      | raiseIntentForContextResponse | ViewPortfolio                         | ViewChart                             | a1            | App1     |
    Then "raiseIntentForContextResponse" response intent "ViewPortfolio" includes app "listenerApp" with instanceId "b1"
    Then "raiseIntentForContextResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "b1"
    Then "raiseIntentForContextResponse" response intent "ViewChart" includes app "portfolioApp" with instanceId "{null}"
    Then "raiseIntentForContextResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "{null}"

  @fdc3_2.0
  Scenario: Dynamic registrations are displayed in the app resolver
    When "appId: App2, instanceId: a2" registers an intent listener for "ViewPortfolio" with contextType "fdc3.portfolio" [fdc3.addIntentListener]
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.portfolio" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.type                      | msg.payload.appIntents[0].intent.name | msg.payload.appIntents[1].intent.name | to.instanceId | to.appId |
      | raiseIntentForContextResponse | ViewPortfolio                         | ViewChart                             | a1            | App1     |
    Then "raiseIntentForContextResponse" response intent "ViewPortfolio" includes app "listenerApp" with instanceId "b1"
    Then "raiseIntentForContextResponse" response intent "ViewPortfolio" includes app "App2" with instanceId "a2"
    Then "raiseIntentForContextResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "b1"
    Then "raiseIntentForContextResponse" response intent "ViewChart" includes app "portfolioApp" with instanceId "{null}"
    Then "raiseIntentForContextResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "{null}"

  @fdc3_2.0
  Scenario: User Cancels The Intent Resolver Returns UserCancelledResolution
    Given the mock intent resolver will cancel the resolution
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.portfolio" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.matches_type              | msg.payload.error       | to.instanceId |
      | raiseIntentForContextResponse | UserCancelledResolution | a1            |

  @fdc3_2.0
  Scenario: Raising An Intent For Context With Malformed Context Returns MalformedContext
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.malformed" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.matches_type              | msg.payload.error | to.instanceId |
      | raiseIntentForContextResponse | MalformedContext  | a1            |

  @fdc3_2.0
  Scenario: Raising An Intent For fdc3.nothing Context Targets A Running App
    When "appId: App1, instanceId: a1" raises an intent with contextType "fdc3.nothing" on app "appId: nothingApp, instanceId: n1" [fdc3.raiseIntentForContext]
    Then messaging will have outgoing posts
      | msg.matches_type              | msg.payload.context.type | msg.payload.intent | msg.payload.originatingApp.appId | msg.payload.originatingApp.instanceId | msg.payload.intentResolution.intent | to.instanceId | to.appId   | msg.payload.intentResolution.source.appId |
      | intentEvent                   | fdc3.nothing             | StartChat          | App1                             | a1                                    | {null}                              | n1            | nothingApp | {null}                                    |
      | raiseIntentForContextResponse | {null}                   | {null}             | {null}                           | {null}                                | StartChat                           | a1            | App1       | nothingApp                                |
