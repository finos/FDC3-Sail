Feature: Raising Intents

  Background: 
    Given "libraryApp" is an app with the following intents
      | Intent Name | Context Type | Result Type |
      | returnBook  | fdc3.book    | {empty}     |
    And "unusedApp" is an app with the following intents
      | Intent Name | Context Type | Result Type |
    And A newly instantiated FDC3 Server
    And "App1/a1" is opened
    And "App1/b1" is opened
    And "App1/b1" sends hello
    And "App1/b1" registers an intent listener for "returnBook"

  Scenario: Raising An Intent To A Non-Existent App
    When "App1/a1" raises an intent for "returnBook" with contextType "fdc3.book" on app "NonExistentApp"
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error    | to.instanceId |
      | raiseIntentResponse | TargetAppUnavailable | a1            |

  Scenario: Raising An Intent To A Non-Existent App Instance
    When "App1/a1" raises an intent for "returnBook" with contextType "fdc3.book" on app "AppZ/b1"
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error         | to.instanceId |
      | raiseIntentResponse | TargetInstanceUnavailable | a1            |

  Scenario: Raising An Intent To A Running App
    When "App1/a1" raises an intent for "returnBook" with contextType "fdc3.book" on app "App1/b1"
    Then messaging will have outgoing posts
      | msg.type           | msg.payload.intent | to.instanceId |
      | raiseIntentRequest | returnBook         | b1            |

  Scenario: Raising An Intent To A Non-Running App
    When "App1/a1" raises an intent for "returnBook" with contextType "fdc3.book" on app "libraryApp"
    And "App1/a1" raises an intent for "returnBook" with contextType "fdc3.book" on app "unusedApp"
    And "libraryApp/0" registers an intent listener for "returnBook"
    Then running apps will be
      | appId      | instanceId |
      | App1       | a1         |
      | App1       | b1         |
      | libraryApp |          0 |
      | unusedApp  |          1 |
    Then messaging will have outgoing posts
      | msg.type           | msg.payload.intent | to.instanceId | to.appId   | msg.payload.context.type |
      | raiseIntentRequest | returnBook         |             0 | libraryApp | fdc3.book                |

  Scenario: Raising An Intent To A Non-Running App without A Context Type in the listener
    When "App1/a1" raises an intent for "stampBook" with contextType "fdc3.book" on app "libraryApp"
    And "libraryApp/0" registers an intent listener for "stampBook"
    Then running apps will be
      | appId      | instanceId |
      | App1       | a1         |
      | App1       | b1         |
      | libraryApp |          0 |
    Then messaging will have outgoing posts
      | msg.type           | msg.payload.intent | to.instanceId | to.appId   | msg.payload.context.type |
      | raiseIntentRequest | stampBook          |             0 | libraryApp | fdc3.book                |

  Scenario: Raising An Intent To A Broken App that doesn't add an intent listener
    When "App1/a1" raises an intent for "returnBook" with contextType "fdc3.book" on app "libraryApp"
    And we wait for the intent timeout
    Then running apps will be
      | appId      | instanceId |
      | App1       | a1         |
      | App1       | b1         |
      | libraryApp |          0 |
    Then messaging will have outgoing posts
      | msg.type            | msg.payload.error    | to.instanceId | to.appId |
      | raiseIntentResponse | IntentDeliveryFailed | a1            | App1     |
