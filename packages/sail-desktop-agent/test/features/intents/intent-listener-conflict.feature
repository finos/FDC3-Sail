Feature: Intent listener conflict (FDC3 3.0)

  FINOS next: website/docs/api/conformance/Intents-Tests.md — Avoiding Adding Multiple Intent Listeners

  Background:
    Given A desktop agent advertising FDC3 "3.0"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"

  @fdc3_3.0
  Scenario: Adding a second unfiltered intent listener causes IntentListenerConflict
    Given "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" [fdc3.addIntentListener]
    Then messaging will include outgoing posts
      | msg.matches_type            | msg.payload.error        | to.instanceId |
      | addIntentListenerResponse   | {null}                   | a1            |
      | addIntentListenerResponse   | IntentListenerConflict   | a1            |

  @fdc3_3.0
  Scenario: Adding filtered listener when unfiltered exists causes IntentListenerConflict
    Given "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" with contextType "fdc3.instrument" [fdc3.addIntentListenerWithContext]
    Then messaging will include outgoing posts
      | msg.matches_type            | msg.payload.error        | to.instanceId |
      | addIntentListenerResponse   | IntentListenerConflict   | a1            |

  @fdc3_3.0
  Scenario: Adding unfiltered listener when filtered exists causes IntentListenerConflict
    Given "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" with contextType "fdc3.instrument" [fdc3.addIntentListenerWithContext]
    And "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" [fdc3.addIntentListener]
    Then messaging will include outgoing posts
      | msg.matches_type            | msg.payload.error        | to.instanceId |
      | addIntentListenerResponse   | IntentListenerConflict   | a1            |

  @fdc3_3.0
  Scenario: Adding overlapping filtered listeners causes IntentListenerConflict
    Given "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" with contextTypes "fdc3.instrument,fdc3.contact" [fdc3.addIntentListenerWithContext]
    And "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" with contextTypes "fdc3.contact,fdc3.order" [fdc3.addIntentListenerWithContext]
    Then messaging will include outgoing posts
      | msg.matches_type            | msg.payload.error        | to.instanceId |
      | addIntentListenerResponse   | IntentListenerConflict   | a1            |

  @fdc3_3.0
  Scenario: Adding non-overlapping filtered listeners is allowed
    Given "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" with contextType "fdc3.instrument" [fdc3.addIntentListenerWithContext]
    And "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" with contextType "fdc3.order" [fdc3.addIntentListenerWithContext]
    Then messaging will have 2 posts matching type "addIntentListenerResponse"

  @fdc3_3.0
  Scenario: Adding listeners for different intents is allowed
    Given "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent12" [fdc3.addIntentListener]
    Then messaging will have 2 posts matching type "addIntentListenerResponse"

  @fdc3_3.0
  Scenario: Re-adding an intent listener after unsubscribe is allowed
    Given "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" unsubscribes an intent listener with id "{lastIntentListenerId}" [fdc3.removeIntentListener]
    And "appId: App1, instanceId: a1" registers an intent listener for "aTestingIntent1" [fdc3.addIntentListener]
    Then messaging will have 2 posts matching type "addIntentListenerResponse"
