Feature: Intent result metadata (FDC3 3.0)

  FINOS next: website/docs/api/conformance/Intents-Tests.md — getResultMetadata

  Background:
    Given "portfolioApp" is an app with the following intents
      | Intent Name   | Context Type   | Result Type |
      | ViewPortfolio | fdc3.portfolio | {empty}     |
    And A desktop agent advertising FDC3 "3.0"
    And "appId: PortfolioApp, instanceId: l1" is opened with connection id "l1"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: PortfolioApp, instanceId: l1" registers an intent listener for "ViewPortfolio" [fdc3.addIntentListener]

  @fdc3_3.0
  Scenario: Void intent result carries DA-generated resultMetadata
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "META-V0" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and void contents and raiseIntentUuid "META-V0" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.resultMetadata.source.appId | msg.payload.resultMetadata.source.instanceId | msg.payload.resultMetadata.timestamp | msg.payload.resultMetadata.traceId | msg.payload.intentResult.metadata |
      | raiseIntentResultResponse | a1            | PortfolioApp                            | l1                                           | ISO8601-timestamp-required           | MUST-BE-NON-EMPTY                  | {null}                            |

  @fdc3_3.0
  Scenario: Context intent result carries DA-generated resultMetadata
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "META-C0" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and contextType "fdc3.portfolio" and raiseIntentUuid "META-C0" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.intentResult.context.type | msg.payload.resultMetadata.source.appId | msg.payload.resultMetadata.traceId |
      | raiseIntentResultResponse | a1            | fdc3.portfolio                        | PortfolioApp                            | MUST-BE-NON-EMPTY                  |

  # Types.md IntentResolution.getResultMetadata(): app fields are merged "with the Desktop Agent's
  # traceId taking precedence".
  @fdc3_3.0
  Scenario: Handler-provided result metadata is merged into resultMetadata
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "META-CWM" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and contextType "fdc3.portfolio" and raiseIntentUuid "META-CWM" with metadata traceId "handler-trace" signature "result-sig" antiReplay claims "1234/2345/jti-4" and custom key "APAC" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.intentResult.context.type | msg.payload.intentResult.metadata | msg.payload.resultMetadata.source.instanceId | msg.payload.resultMetadata.signature.signature | msg.payload.resultMetadata.signature.protected | msg.payload.resultMetadata.antiReplay.jti | msg.payload.resultMetadata.custom.region |
      | raiseIntentResultResponse | a1            | fdc3.portfolio                        | {null}                            | l1                                           | result-sig (signature part)                    | result-sig (protected part)                    | jti-4                                     | APAC                                     |
