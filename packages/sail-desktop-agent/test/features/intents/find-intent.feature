Feature: Find Intent API

  Background:
    Given "portfolioApp" is an app with the following intents
      | Intent Name      | Context Type   | Result Type    | Display Name       |
      | ViewChart        | fdc3.portfolio | fdc3.chart     | View Chart         |
      | StreamChart      | fdc3.portfolio | channel<chart> | Stream Chart       |
      | ViewPortfolio    | fdc3.portfolio | {empty}        | View Portfolio     |
      | StreamInstrument | fdc3.portfolio | channel        | Stream Instrument  |
    And "researchApp" is an app with the following intents
      | Intent Name | Context Type | Result Type | Display Name |
      | viewStock   | fdc3.product | {empty}     | View Stock   |
    And "analyticsApp" is an app with the following intents
      | Intent Name | Context Type | Result Type | Display Name |
      | viewStock   | fdc3.product | {empty}     | View Stock   |
    And "marketDataApp" is an app with the following intents
      | Intent Name | Context Type | Result Type | Display Name |
      | viewStock   | fdc3.product | {empty}     | View Stock   |
    And A desktop agent
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App1, instanceId: b1" is opened with connection id "b1"
    And "appId: App1, instanceId: b1" registers an intent listener for "ViewPortfolio" [fdc3.addIntentListener]
    And "appId: analyticsApp, instanceId: b2" is opened with connection id "b2"
    And "appId: analyticsApp, instanceId: b2" registers an intent listener for "viewStock" [fdc3.addIntentListener]
    # Running listeners for researchApp and analyticsApp must exist before findIntent merges directory + instance results.
    And "appId: researchApp, instanceId: b3" is opened with connection id "b3"
    And "appId: researchApp, instanceId: b3" registers an intent listener for "viewStock" [fdc3.addIntentListener]
    And we wait for a period of "100" ms

  @fdc3_2.0
  Scenario: Unsuccessful Find Intents Request
    When "appId: App1, instanceId: a1" finds intents with intent "ViewChart" and contextType "fdc3.instrument" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.error | to.instanceId |
      | findIntentResponse | NoAppsFound       | a1            |

  @fdc3_2.0
  Scenario: Unsuccessful Find Intents Request With Result Type
    When "appId: App1, instanceId: a1" finds intents with intent "ViewChart" and contextType "{empty}" and result type "unknownContext" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.error | to.instanceId |
      | findIntentResponse | NoAppsFound       | a1            |

  @fdc3_2.0
  Scenario: Find Intent for non-existent intent returns NoAppsFound
    When "appId: App1, instanceId: a1" finds intents with intent "nonExistentIntent" and contextType "fdc3.instrument" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.error | to.instanceId |
      | findIntentResponse | NoAppsFound       | a1            |

  @fdc3_2.0
  Scenario: Successful Find Intents Request
    When "appId: App1, instanceId: a1" finds intents with intent "ViewChart" and contextType "{empty}" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.appIntent.intent.name | msg.payload.appIntent.apps.length | msg.payload.appIntent.apps[0].appId | to.instanceId | msg.payload.appIntent.intent.displayName |
      | findIntentResponse | ViewChart                         |                                 1 | portfolioApp                        | a1            | View Chart                               |

  @fdc3_2.0
  Scenario: Find Intents Requests should include both the app and running instances of it
    When "appId: App1, instanceId: a1" finds intents with intent "viewStock" and contextType "fdc3.product" and result type "{empty}" [fdc3.findIntent]
    Then "findIntentResponse" response intent "viewStock" includes app "researchApp" with instanceId "b3"
    Then "findIntentResponse" response intent "viewStock" includes app "analyticsApp" with instanceId "b2"
    Then "findIntentResponse" response intent "viewStock" includes app "marketDataApp" with instanceId "{null}"
    When "appId: analyticsApp, instanceId: b2" is closed
    And "appId: App1, instanceId: a1" finds intents with intent "viewStock" and contextType "fdc3.product" and result type "{empty}" [fdc3.findIntent]
    Then "findIntentResponse" response intent "viewStock" includes app "researchApp" with instanceId "b3"
    Then "findIntentResponse" response intent "viewStock" includes app "marketDataApp" with instanceId "{null}"
    Then "findIntentResponse" response intent "viewStock" does not include app "analyticsApp" with instanceId "b2"

  @fdc3_2.0
  Scenario: Find Intents by Context Request
    When "appId: App, instanceId: a1" finds intents with contextType "fdc3.portfolio" and result type "{empty}" [fdc3.findIntentsByContext]
    Then messaging will have outgoing posts
      | msg.matches_type             | msg.payload.appIntents[0].intent.name | msg.payload.appIntents.length | to.instanceId | msg.payload.appIntents[0].intent.displayName |
      | findIntentsByContextResponse | ViewChart                             |                             4 | a1            | View Chart                                   |

  @fdc3_2.0
  Scenario: Find Intents by Context for non-existent context returns NoAppsFound
    When "appId: App, instanceId: a1" finds intents with contextType "nonExistentContext" and result type "{empty}" [fdc3.findIntentsByContext]
    Then messaging will have outgoing posts
      | msg.matches_type             | msg.payload.error | to.instanceId |
      | findIntentsByContextResponse | NoAppsFound       | a1            |

  @fdc3_2.0
  Scenario: Find Intents by Context Request with multiple results
    When "appId: App, instanceId: a1" finds intents with contextType "fdc3.product" and result type "{empty}" [fdc3.findIntentsByContext]
    Then messaging will have outgoing posts
      | msg.matches_type             | msg.payload.appIntents[0].intent.name | msg.payload.appIntents.length | to.instanceId | msg.payload.appIntents[0].intent.displayName |
      | findIntentsByContextResponse | viewStock                             |                             1 | a1            | View Stock                                   |
    Then "findIntentsByContextResponse" response intent "viewStock" includes app "researchApp" with instanceId "b3"
    Then "findIntentsByContextResponse" response intent "viewStock" includes app "analyticsApp" with instanceId "b2"
    Then "findIntentsByContextResponse" response intent "viewStock" includes app "marketDataApp" with instanceId "{null}"

  @fdc3_2.0
  Scenario: Find Intent with matching context returns app metadata
    When "appId: App1, instanceId: a1" finds intents with intent "ViewChart" and contextType "fdc3.portfolio" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.appIntent.intent.name | msg.payload.appIntent.apps.length | msg.payload.appIntent.apps[0].appId | to.instanceId |
      | findIntentResponse | ViewChart                         |                                 1 | portfolioApp                        | a1            |

  @fdc3_2.0
  Scenario: Find Intent with wrong context returns NoAppsFound
    When "appId: App1, instanceId: a1" finds intents with intent "ViewChart" and contextType "fdc3.instrument" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.error | to.instanceId |
      | findIntentResponse | NoAppsFound       | a1            |

  @fdc3_2.0
  Scenario: Find Intents by Context Request with multiple results which should not include an instance that has closed
    When "appId: analyticsApp, instanceId: b2" is closed
    When "appId: App, instanceId: a1" finds intents with contextType "fdc3.product" and result type "{empty}" [fdc3.findIntentsByContext]
    Then messaging will have outgoing posts
      | msg.matches_type             | msg.payload.appIntents[0].intent.name | msg.payload.appIntents.length | to.instanceId |
      | findIntentsByContextResponse | viewStock                             |                             1 | a1            |
    Then "findIntentsByContextResponse" response intent "viewStock" includes app "researchApp" with instanceId "b3"
    Then "findIntentsByContextResponse" response intent "viewStock" includes app "marketDataApp" with instanceId "{null}"
    Then "findIntentsByContextResponse" response intent "viewStock" does not include app "analyticsApp" with instanceId "b2"

  @fdc3_2.0
  Scenario: Successful Find Intents Request With Channel
    When "appId: App1, instanceId: a1" finds intents with intent "StreamChart" and contextType "fdc3.portfolio" and result type "channel" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.appIntent.intent.name | msg.payload.appIntent.apps.length | msg.payload.appIntent.apps[0].appId | to.instanceId |
      | findIntentResponse | StreamChart                       |                                 1 | portfolioApp                        | a1            |

  @fdc3_2.0
  Scenario: Successful Find Intents Request With A Typed Channel
    When "appId: App1, instanceId: a1" finds intents with intent "StreamChart" and contextType "{empty}" and result type "channel<chart>" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.appIntent.intent.name | msg.payload.appIntent.apps.length | msg.payload.appIntent.apps[0].appId | to.instanceId |
      | findIntentResponse | StreamChart                       |                                 1 | portfolioApp                        | a1            |

  @fdc3_2.0
  Scenario: Unsuccessful Find Intents Request With an untyped Channel
    When "appId: App1, instanceId: a1" finds intents with intent "StreamInstrument" and contextType "{empty}" and result type "channel<spurious>" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.error |
      | findIntentResponse | NoAppsFound       |

  @fdc3_2.0
  Scenario: Find Intent includes results for a running app with intent listener
    When "appId: App1, instanceId: a1" finds intents with intent "ViewPortfolio" and contextType "fdc3.portfolio" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.appIntent.intent.name | msg.payload.appIntent.apps.length | to.instanceId |
      | findIntentResponse | ViewPortfolio                     |                                 2 | a1            |
    And messaging will have outgoing posts
      | msg.payload.appIntent.apps[1].appId | msg.payload.appIntent.apps[1].instanceId |
      | App1                                | b1                                       |
    And messaging will have outgoing posts
      | msg.payload.appIntent.apps[0].appId | msg.payload.appIntent.apps[0].instanceId |
      | portfolioApp                        | {empty}                                  |

  @fdc3_2.0
  Scenario: Disconnecting The Intent Listener
    When "appId: App1, instanceId: b1" unsubscribes an intent listener with id "{lastIntentListenerId}" [fdc3.removeIntentListener]
    And "appId: App1, instanceId: a1" finds intents with intent "ViewPortfolio" and contextType "fdc3.portfolio" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type                  | msg.payload.appIntent.intent.name | msg.payload.appIntent.apps.length | to.instanceId | msg.payload.appIntent.apps[0].appId |
      | intentListenerUnsubscribeResponse | {null}                            | {null}                            | b1            | {null}                              |
      | findIntentResponse                | ViewPortfolio                     |                                 1 | a1            | portfolioApp                        |

  @fdc3_2.0
  Scenario: Find Intent excludes results for a closed app with intent listener
    When "appId: App1, instanceId: b1" is closed
    And "appId: App1, instanceId: a1" finds intents with intent "ViewPortfolio" and contextType "fdc3.portfolio" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.appIntent.intent.name | to.instanceId |
      | findIntentResponse | ViewPortfolio                     | a1            |
    Then "findIntentResponse" response intent "ViewPortfolio" includes app "portfolioApp" with instanceId "{null}"
    Then "findIntentResponse" response intent "ViewPortfolio" does not include app "App1" with instanceId "b1"

  @fdc3_2.0
  Scenario: Find Intents by Context with resultType filter returns only matching intents
    When "appId: App1, instanceId: a1" finds intents with contextType "fdc3.portfolio" and result type "channel" [fdc3.findIntentsByContext]
    Then messaging will have outgoing posts
      | msg.matches_type             | msg.payload.appIntents.length | msg.payload.appIntents[0].intent.name | to.instanceId |
      | findIntentsByContextResponse | 2                             | StreamChart                           | a1            |

  @fdc3_2.0
  Scenario: Find Intent With Malformed Context Returns MalformedContext
    When "appId: App1, instanceId: a1" finds intents with intent "ViewChart" and contextType "fdc3.malformed" and result type "{empty}" [fdc3.findIntent]
    Then messaging will have outgoing posts
      | msg.matches_type   | msg.payload.error | to.instanceId |
      | findIntentResponse | MalformedContext  | a1            |

  @fdc3_2.0
  Scenario: Find Intents By Context With Malformed Context Returns MalformedContext
    When "appId: App1, instanceId: a1" finds intents with contextType "fdc3.malformed" and result type "{empty}" [fdc3.findIntentsByContext]
    Then messaging will have outgoing posts
      | msg.matches_type             | msg.payload.error | to.instanceId |
      | findIntentsByContextResponse | MalformedContext  | a1            |
