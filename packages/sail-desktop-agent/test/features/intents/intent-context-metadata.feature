Feature: Intent context metadata (FDC3 3.0)

  FINOS next: website/docs/api/conformance/Metadata-Tests.md — IntentContextMetadata

  Background:
    Given "listenerApp" is an app with the following intents
      | Intent Name   | Context Type   | Result Type |
      | lTestingIntent | testContextX  | {empty}     |
    And A desktop agent advertising FDC3 "3.0"
    And "appId: listenerApp, instanceId: l1" is opened with connection id "l1"
    And "appId: TestApp, instanceId: t1" is opened with connection id "t1"
    And "appId: listenerApp, instanceId: l1" registers an intent listener for "lTestingIntent" [fdc3.addIntentListener]

  @fdc3_3.0
  Scenario: Raised intent delivers ContextMetadata with source and timestamp
    When "appId: TestApp, instanceId: t1" raises an intent for "lTestingIntent" with contextType "testContextX" on app "appId: listenerApp, instanceId: l1" with requestUuid "META001" [fdc3.raiseIntent]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp | msg.payload.metadata.traceId |
      | intentEvent      | l1            | TestApp                           | t1                                     | ISO8601-timestamp-required     | MUST-BE-NON-EMPTY            |

  @fdc3_3.0
  Scenario: Raised intent forwards app-provided traceId in ContextMetadata
    When "appId: TestApp, instanceId: t1" raises an intent for "lTestingIntent" with contextType "testContextX" and metadata traceId "intent-trace-456" on app "appId: listenerApp, instanceId: l1" with requestUuid "META002" [fdc3.raiseIntent]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.metadata.traceId |
      | intentEvent      | l1            | intent-trace-456             |

  @fdc3_3.0
  Scenario: Raised intent forwards app-provided signature, antiReplay and custom unchanged
    When "appId: TestApp, instanceId: t1" raises an intent for "lTestingIntent" with contextType "testContextX" and metadata traceId "t-2" signature "intent-sig" antiReplay claims "1234/2345/jti-3" and custom key "EMEA" on app "appId: listenerApp, instanceId: l1" with requestUuid "META003" [fdc3.raiseIntent]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.context.type | msg.payload.metadata.source.appId | msg.payload.metadata.traceId | msg.payload.metadata.signature.signature | msg.payload.metadata.signature.protected | msg.payload.metadata.antiReplay.iat | msg.payload.metadata.antiReplay.exp | msg.payload.metadata.antiReplay.jti | msg.payload.metadata.custom.region |
      | intentEvent      | l1            | testContextX             | TestApp                           | t-2                          | intent-sig (signature part)              | intent-sig (protected part)              | 1234                                | 2345                                | jti-3                               | EMEA                               |

  @fdc3_3.0
  Scenario: raiseIntentForContext forwards app-provided traceId in ContextMetadata
    When "appId: TestApp, instanceId: t1" raises an intent with contextType "testContextX" and metadata traceId "context-trace-789" on app "appId: listenerApp, instanceId: l1" [fdc3.raiseIntentForContext]
    Then messaging will include outgoing posts
      | msg.matches_type | to.instanceId | msg.payload.intent | msg.payload.metadata.source.appId | msg.payload.metadata.traceId |
      | intentEvent      | l1            | lTestingIntent     | TestApp                           | context-trace-789            |
