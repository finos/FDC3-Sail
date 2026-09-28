Feature: Raising Intents

  Background:
    Given "portfolioApp" is an app with the following intents
      | Intent Name    | Context Type    | Result Type |
      | ViewPortfolio  | fdc3.portfolio  | {empty}     |
      | ViewChart      | fdc3.portfolio  | {empty}     |
      | ViewInstrument | fdc3.instrument | {empty}     |
    And "listenerApp" is an app with the following intents
      | Intent Name | Context Type   | Result Type |
      | ViewChart   | fdc3.portfolio | {empty}     |
    And "uniqueIntentApp" is an app with the following intents
      | Intent Name  | Context Type    | Result Type |
      | uniqueIntent | fdc3.instrument | {empty}     |
    And "unusedApp" is an app with the following intents
      | Intent Name | Context Type | Result Type |
    And "nothingApp" is an app with the following intents
      | Intent Name | Context Type | Result Type |
      | StartChat   | fdc3.nothing | {empty}     |
    And A desktop agent
    And "appId: uniqueIntentApp, instanceId: c1" is opened with connection id "c1"
    And "appId: uniqueIntentApp, instanceId: c1" registers an intent listener for "uniqueIntent" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: listenerApp, instanceId: b1" is opened with connection id "b1"
    And "appId: listenerApp, instanceId: b1" registers an intent listener for "ViewPortfolio" [fdc3.addIntentListener]
    And "appId: nothingApp, instanceId: n1" is opened with connection id "n1"
    And "appId: nothingApp, instanceId: n1" registers an intent listener for "StartChat" [fdc3.addIntentListener]

  @fdc3_2.0
  Scenario: Context Not Handled By App
    When "appId: App1, instanceId: a1" raises an intent for "ViewChart" with contextType "fdc3.instrument" on app "appId: listenerApp, instanceId: b1" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error | to.instanceId |
      | raiseIntentResponse | NoAppsFound       | a1            |

  @fdc3_2.0
  Scenario: Raising an intent that should auto-resolve (only one option)
    And "appId: App1, instanceId: a1" raises an intent for "uniqueIntent" with contextType "fdc3.instrument" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | msg.payload.context.type | msg.payload.intent | msg.payload.originatingApp.appId | msg.payload.originatingApp.instanceId | msg.payload.intentResolution.intent | to.instanceId | to.appId        | msg.payload.intentResolution.source.appId |
      | intentEvent         | fdc3.instrument          | uniqueIntent       | App1                             | a1                                    | {null}                              | c1            | uniqueIntentApp | {null}                                    |
      | raiseIntentResponse | {null}                   | {null}             | {null}                           | {null}                                | uniqueIntent                        | a1            | App1            | uniqueIntentApp                           |

  @fdc3_3.0
  Scenario: Intent Event Includes ContextMetadata With Source And Timestamp
    When "appId: App1, instanceId: a1" raises an intent for "uniqueIntent" with contextType "fdc3.instrument" [fdc3.raiseIntent]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | to.appId        | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp |
      | intentEvent      | c1            | uniqueIntentApp | App1                              | a1                                     | ISO8601-timestamp-required     |

  @fdc3_2.0
  Scenario: Raising an Intent to a Non-Existent App
    And "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "completelyMadeUp" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error    | to.instanceId | to.appId |
      | raiseIntentResponse | TargetAppUnavailable | a1            | App1     |

  @fdc3_2.0
  Scenario: Raising An Intent To A Non-Existent App Instance
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: portfolioApp, instanceId: unknownInstance" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error         | to.instanceId |
      | raiseIntentResponse | TargetInstanceUnavailable | a1            |

  @fdc3_2.0
  Scenario: Raising An Intent To A Running App instance by instanceId
    And "appId: listenerApp, instanceId: b1" registers an intent listener for "ViewChart" [fdc3.addIntentListener]
    When "appId: App1, instanceId: a1" raises an intent for "ViewChart" with contextType "fdc3.portfolio" on app "appId: listenerApp, instanceId: b1" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | msg.payload.context.type | msg.payload.intent | msg.payload.originatingApp.appId | msg.payload.originatingApp.instanceId | msg.payload.intentResolution.intent | to.instanceId | to.appId    | msg.payload.intentResolution.source.appId |
      | intentEvent         | fdc3.portfolio           | ViewChart          | App1                             | a1                                    | {null}                              | b1            | listenerApp | {null}                                    |
      | raiseIntentResponse | {null}                   | {null}             | {null}                           | {null}                                | ViewChart                           | a1            | App1        | listenerApp                               |

  @fdc3_2.0
  Scenario: Raising An Intent To A Non-Running App
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "portfolioApp" [fdc3.raiseIntent]
    And "uuid-0" sends validate
    And "appId: portfolioApp, instanceId: uuid-0" registers an intent listener for "ViewPortfolio" [fdc3.addIntentListener]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.payload.intent | to.instanceId | to.appId     | msg.payload.context.type |
      | addIntentListenerResponse | {null}             | uuid-0        | portfolioApp | {null}                   |
      | intentEvent               | ViewPortfolio      | uuid-0        | portfolioApp | fdc3.portfolio           |
      | raiseIntentResponse       | {null}             | a1            | App1         | {null}                   |

  @fdc3_2.0
  Scenario: Raising An Intent That Applies to A Non-Running But Uniquely Identifiable App
    When "appId: App1, instanceId: a1" raises an intent for "ViewInstrument" with contextType "fdc3.instrument" [fdc3.raiseIntent]
    And "uuid-0" sends validate
    And "appId: portfolioApp, instanceId: uuid-0" registers an intent listener for "ViewInstrument" [fdc3.addIntentListener]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.payload.intent | to.instanceId | to.appId     | msg.payload.context.type |
      | addIntentListenerResponse | {null}             | uuid-0        | portfolioApp | {null}                   |
      | intentEvent               | ViewInstrument     | uuid-0        | portfolioApp | fdc3.instrument          |
      | raiseIntentResponse       | {null}             | a1            | App1         | {null}                   |

  @fdc3_2.0
  Scenario: Raising An Intent To A Non-Running App without A Context Type in the listener
    When "appId: App1, instanceId: a1" raises an intent for "UpdatePortfolio" with contextType "fdc3.portfolio" on app "portfolioApp" [fdc3.raiseIntent]
    And "uuid-0" sends validate
    And "appId: portfolioApp, instanceId: uuid-0" registers an intent listener for "UpdatePortfolio" [fdc3.addIntentListener]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.payload.intent | to.instanceId | to.appId     | msg.payload.context.type |
      | addIntentListenerResponse | {null}             | uuid-0        | portfolioApp | {null}                   |
      | intentEvent               | UpdatePortfolio    | uuid-0        | portfolioApp | fdc3.portfolio           |
      | raiseIntentResponse       | {null}             | a1            | App1         | {null}                   |
    And running apps will be
      | appId           | instanceId |
      | uniqueIntentApp | c1         |
      | listenerApp     | b1         |
      | App1            | a1         |
      | portfolioApp    | uuid-0     |

  @fdc3_2.0
  Scenario: Raising An Intent To A Broken App that doesn't add an intent listener
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "portfolioApp" [fdc3.raiseIntent]
    And "uuid-0" sends validate
    And we wait for the intent timeout
    Then running apps will be
      | appId           | instanceId |
      | uniqueIntentApp | c1         |
      | listenerApp     | b1         |
      | App1            | a1         |
      | nothingApp      | n1         |
      | portfolioApp    | uuid-0     |
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error    | to.instanceId | to.appId |
      | raiseIntentResponse | IntentDeliveryFailed | a1            | App1     |

  @fdc3_2.0
  Scenario: User Must Choose An Intent using The Intent Resolver
    When "appId: App1, instanceId: a1" raises an intent for "ViewChart" with contextType "fdc3.portfolio" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.appIntent.intent.name | msg.payload.appIntent.intent.displayName | to.instanceId | to.appId |
      | raiseIntentResponse | ViewChart                         | ViewChart                                | a1            | App1     |
    Then "raiseIntentResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "b1"
    Then "raiseIntentResponse" response intent "ViewChart" includes app "portfolioApp" with instanceId "{null}"
    Then "raiseIntentResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "{null}"

  @fdc3_2.0
  Scenario: Dynamic registrations are displayed in the app resolver
    When "appId: App2, instanceId: a2" registers an intent listener for "ViewChart" with contextType "fdc3.portfolio" [fdc3.addIntentListener]
    When "appId: App1, instanceId: a1" raises an intent for "ViewChart" with contextType "fdc3.portfolio" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.appIntent.intent.name | msg.payload.appIntent.intent.displayName | to.instanceId | to.appId |
      | raiseIntentResponse | ViewChart                         | ViewChart                                | a1            | App1     |
    Then "raiseIntentResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "b1"
    Then "raiseIntentResponse" response intent "ViewChart" includes app "App2" with instanceId "a2"
    Then "raiseIntentResponse" response intent "ViewChart" includes app "portfolioApp" with instanceId "{null}"
    Then "raiseIntentResponse" response intent "ViewChart" includes app "listenerApp" with instanceId "{null}"

  @fdc3_2.0
  Scenario: Raising An Invalid Intent (non existent intent)
    When "appId: App1, instanceId: a1" raises an intent for "nonExistentIntent" with contextType "fdc3.portfolio" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.payload.error | msg.type            |
      | NoAppsFound       | raiseIntentResponse |

  @fdc3_2.0
  Scenario: User Cancels The Intent Resolver Returns UserCancelledResolution
    Given the mock intent resolver will cancel the resolution
    When "appId: App1, instanceId: a1" raises an intent for "ViewChart" with contextType "fdc3.portfolio" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | msg.payload.error       | to.instanceId |
      | raiseIntentResponse | UserCancelledResolution | a1            |

  @fdc3_2.0
  Scenario: Raising An Intent With Malformed Context Returns MalformedContext
    When "appId: App1, instanceId: a1" raises an intent for "ViewChart" with contextType "fdc3.malformed" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | msg.payload.error | to.instanceId |
      | raiseIntentResponse | MalformedContext  | a1            |

  @fdc3_2.0
  Scenario: Raising An Intent With fdc3.nothing Context Auto-Resolves
    When "appId: App1, instanceId: a1" raises an intent for "StartChat" with contextType "fdc3.nothing" [fdc3.raiseIntent]
    Then messaging will have outgoing posts
      | msg.matches_type    | msg.payload.context.type | msg.payload.intent | msg.payload.originatingApp.appId | msg.payload.originatingApp.instanceId | msg.payload.intentResolution.intent | to.instanceId | to.appId   | msg.payload.intentResolution.source.appId |
      | intentEvent         | fdc3.nothing             | StartChat          | App1                             | a1                                    | {null}                              | n1            | nothingApp | {null}                                    |
      | raiseIntentResponse | {null}                   | {null}             | {null}                           | {null}                                | StartChat                           | a1            | App1       | nothingApp                                |
