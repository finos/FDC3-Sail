Feature: Intent Results Are Correctly Delivered

  Background:
    Given "portfolioApp" is an app with the following intents
      | Intent Name   | Context Type   | Result Type |
      | ViewPortfolio | fdc3.portfolio | {empty}     |
    And "App1" is an app with the following intents
      | Intent Name | Context Type    | Result Type |
      | viewNews    | fdc3.instrument | {empty}     |
    And A desktop agent
    And "appId: PortfolioApp, instanceId: l1" is opened with connection id "l1"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: PortfolioApp, instanceId: l1" registers an intent listener for "ViewPortfolio" [fdc3.addIntentListener]

  @fdc3_3.0
  Scenario: Waiting for an intent listener to be Added
    When "appId: PortfolioApp, instanceId: l1" raises an intent for "viewNews" with contextType "fdc3.instrument" on app "appId: App1, instanceId: a1" with requestUuid "ABC123" [fdc3.raiseIntent]
    And "appId: App1, instanceId: a1" registers an intent listener for "viewNews" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and void contents and raiseIntentUuid "ABC123" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.meta.eventUuid    | to.appId     | to.instanceId | msg.payload.raiseIntentRequestUuid | msg.payload.intentResolution.source.instanceId | msg.payload.intentResult.context.type | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp | msg.payload.resultMetadata.source.appId | msg.payload.resultMetadata.source.instanceId | msg.payload.resultMetadata.timestamp | msg.payload.intentResult.metadata.traceId |
      | intentEvent               | {lastIntentEventUuid} | App1         | a1            | ABC123                             | {null}                                         | {null}                                | PortfolioApp                      | l1                                     | ISO8601-timestamp-required     | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResponse       | {null}                | PortfolioApp | l1            | {null}                             | a1                                             | {null}                                | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResultResponse | {null}                | PortfolioApp | l1            | {null}                             | {null}                                         | {null}                                | {null}                            | {null}                                 | {null}                         | App1                                    | a1                                           | ISO8601-timestamp-required           | MUST-BE-NON-EMPTY                         |
      | intentResultResponse      | {null}                | App1         | a1            | {null}                             | {null}                                         | {null}                                | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |

  @fdc3_3.0
  Scenario: App Returns An Intent Response
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "ABC123" [fdc3.raiseIntent]
    When "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and contextType "fdc3.portfolio" and raiseIntentUuid "ABC123" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.meta.eventUuid    | msg.meta.requestUuid          | to.appId     | to.instanceId | msg.payload.raiseIntentRequestUuid | msg.payload.intentResolution.source.instanceId | msg.payload.intentResult.context.type | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp | msg.payload.resultMetadata.source.appId | msg.payload.resultMetadata.source.instanceId | msg.payload.resultMetadata.timestamp | msg.payload.intentResult.metadata.traceId |
      | intentEvent               | {lastIntentEventUuid} | {null}                        | PortfolioApp | l1            | ABC123                             | {null}                                         | {null}                                | App1                              | a1                                     | ISO8601-timestamp-required     | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResponse       | {null}                | ABC123                        | App1         | a1            | {null}                             | l1                                             | {null}                                | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResultResponse | {null}                | ABC123                        | App1         | a1            | {null}                             | {null}                                         | fdc3.portfolio                        | {null}                            | {null}                                 | {null}                         | PortfolioApp                            | l1                                           | ISO8601-timestamp-required           | MUST-BE-NON-EMPTY                         |
      | intentResultResponse      | {null}                | {lastIntentResultRequestUuid} | PortfolioApp | l1            | {null}                             | {null}                                         | {null}                                | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |

  @fdc3_3.0
  Scenario: App Returns An Intent Result
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "ABC123" [fdc3.raiseIntent]
    When "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and private channel "pc1" and raiseIntentUuid "ABC123" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.meta.eventUuid    | to.appId     | to.instanceId | msg.payload.raiseIntentRequestUuid | msg.payload.intentResolution.source.instanceId | msg.payload.intentResult.channel.id | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp | msg.payload.resultMetadata.source.appId | msg.payload.resultMetadata.source.instanceId | msg.payload.resultMetadata.timestamp | msg.payload.intentResult.metadata.traceId |
      | intentEvent               | {lastIntentEventUuid} | PortfolioApp | l1            | ABC123                             | {null}                                         | {null}                              | App1                              | a1                                     | ISO8601-timestamp-required     | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResponse       | {null}                | App1         | a1            | {null}                             | l1                                             | {null}                              | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResultResponse | {null}                | App1         | a1            | {null}                             | {null}                                         | pc1                                 | {null}                            | {null}                                 | {null}                         | PortfolioApp                            | l1                                           | ISO8601-timestamp-required           | MUST-BE-NON-EMPTY                         |
      | intentResultResponse      | {null}                | PortfolioApp | l1            | {null}                             | {null}                                         | {null}                              | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |

  @fdc3_3.0
  Scenario: App Returns A Void Intent Result
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "ABC123" [fdc3.raiseIntent]
    When "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and void contents and raiseIntentUuid "ABC123" [IntentResolution.getResult]
    Then messaging will have outgoing posts
      | msg.matches_type          | msg.meta.eventUuid    | to.appId     | to.instanceId | msg.payload.raiseIntentRequestUuid | msg.payload.intentResolution.source.instanceId | msg.payload.intentResult.context.type | msg.payload.metadata.source.appId | msg.payload.metadata.source.instanceId | msg.payload.metadata.timestamp | msg.payload.resultMetadata.source.appId | msg.payload.resultMetadata.source.instanceId | msg.payload.resultMetadata.timestamp | msg.payload.intentResult.metadata.traceId |
      | intentEvent               | {lastIntentEventUuid} | PortfolioApp | l1            | ABC123                             | {null}                                         | {null}                                | App1                              | a1                                     | ISO8601-timestamp-required     | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResponse       | {null}                | App1         | a1            | {null}                             | l1                                             | {null}                                | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |
      | raiseIntentResultResponse | {null}                | App1         | a1            | {null}                             | {null}                                         | {null}                                | {null}                            | {null}                                 | {null}                         | PortfolioApp                            | l1                                           | ISO8601-timestamp-required           | MUST-BE-NON-EMPTY                         |
      | intentResultResponse      | {null}                | PortfolioApp | l1            | {null}                             | {null}                                         | {null}                                | {null}                            | {null}                                 | {null}                         | {null}                                  | {null}                                       | {null}                               | {null}                                    |

  @fdc3_2.0
  Scenario: IntentResolution.getResult() rejects with NoResultReturned when handler returns nothing
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "RES001" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and no result returned and raiseIntentUuid "RES001" [IntentResolution.getResult]
    Then messaging will include outgoing posts
      | msg.matches_type          | to.appId | to.instanceId | msg.payload.error |
      | raiseIntentResultResponse | App1     | a1            | NoResultReturned  |

  @fdc3_2.0
  Scenario: IntentResolution.getResult() rejects with IntentHandlerRejected when handler promise rejects
    When "appId: App1, instanceId: a1" raises an intent for "ViewPortfolio" with contextType "fdc3.portfolio" on app "appId: PortfolioApp, instanceId: l1" with requestUuid "RES002" [fdc3.raiseIntent]
    And "appId: PortfolioApp, instanceId: l1" sends a intentResultRequest with eventUuid "{lastIntentEventUuid}" and handler rejection and raiseIntentUuid "RES002" [IntentResolution.getResult]
    Then messaging will include outgoing posts
      | msg.matches_type          | to.appId | to.instanceId | msg.payload.error     |
      | raiseIntentResultResponse | App1     | a1            | IntentHandlerRejected |
