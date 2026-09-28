@performance
Feature: FDC3 3.0 metadata performance guards

  FINOS next: Metadata-Tests.md / Intents-Tests.md — metadata delivery must not add unacceptable latency.

  Background:
    Given A desktop agent advertising FDC3 "3.0"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"
    And "appId: App2, instanceId: a2" is opened with connection id "a2"

  @fdc3_3.0
  Scenario: Context metadata broadcast completes within performance budget
    When "appId: App2, instanceId: a2" adds a context listener on "fdc3.channel.1" with type "fdc3.instrument" [fdc3.addContextListener]
    And "appId: App1, instanceId: a1" broadcasts "fdc3.instrument" on "fdc3.channel.1" [fdc3.broadcast]
    Then the last broadcast event was delivered within "500" ms of the broadcast request

  @fdc3_3.0
  Scenario: Intent listener conflict check completes within performance budget
    When "appId: App1, instanceId: a1" registers an intent listener for "perfIntent" [fdc3.addIntentListener]
    And "appId: App1, instanceId: a1" registers an intent listener for "perfIntent" [fdc3.addIntentListener]
    Then the last addIntentListener response was delivered within "100" ms of the request
