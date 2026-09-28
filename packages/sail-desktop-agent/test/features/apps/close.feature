Feature: App self-close (fdc3.close)

  FDC3 v3.0: an app requests that the Desktop Agent close its own window or frame.
  On success the app is destroyed and no success closeResponse is delivered — the
  client library may resolve with CloseError.ApiTimeout when the exchange times out.

  Background:
    Given A desktop agent advertising FDC3 "3.0"
    And "appId: App1, instanceId: a1" is opened with connection id "a1"

  @fdc3_3.0
  Scenario: App requests self-close successfully
    When "appId: App1, instanceId: a1" requests close [fdc3.close]
    Then messaging will have no closeResponse
    And "appId: App1, instanceId: a1" was closed via AppLauncher
    And "appId: App1, instanceId: a1" instance is removed from agent state

  @fdc3_3.0
  Scenario: Desktop Agent returns ErrorOnClose when host cannot close the app
    Given "appId: App1, instanceId: a1" is configured to fail on close
    When "appId: App1, instanceId: a1" requests close [fdc3.close]
    Then messaging will have outgoing posts
      | msg.type      | msg.payload.error | to.instanceId |
      | closeResponse | ErrorOnClose      | a1            |
    And "appId: App1, instanceId: a1" instance is registered in agent state
