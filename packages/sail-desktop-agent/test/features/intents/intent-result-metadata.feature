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
  Scenario: Void intent result exposes DA metadata for getResultMetadata
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "META-V0" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and void contents and raiseIntentUuid "META-V0" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.resultMetadata.source.appId | msg.payload.resultMetadata.timestamp | msg.payload.intentResult.metadata.traceId |
      | raiseIntentResultResponse | a1            | PortfolioApp                      | ISO8601-timestamp-required     | MUST-BE-NON-EMPTY                         |

  @fdc3_3.0
  Scenario: Context intent result exposes DA metadata for getResultMetadata
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "META-C0" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and contextType "fdc3.portfolio" and raiseIntentUuid "META-C0" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.intentResult.context.type | msg.payload.intentResult.metadata.traceId |
      | raiseIntentResultResponse | a1            | fdc3.portfolio                        | MUST-BE-NON-EMPTY                         |

  @fdc3_3.0
  Scenario: ContextWithMetadata unwraps plain context and merges metadata for getResultMetadata
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "META-CWM" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and contextWithMetadata type "fdc3.portfolio" and raiseIntentUuid "META-CWM" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | to.instanceId | msg.payload.intentResult.context.type | msg.payload.intentResult.metadata.signature | msg.payload.intentResult.metadata.custom.conformanceKey |
      | raiseIntentResultResponse | a1            | fdc3.portfolio                        | conformance-signature                       | value                                                   |
