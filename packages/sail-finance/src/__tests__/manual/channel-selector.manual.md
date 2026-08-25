## Channel Selector Manual Test

### Prerequisites
- Run `npm run dev`
- Open `http://localhost:8090`
- Ensure at least two example apps are available to launch

### Checklist
- Channel selector appears on connected app panels
- Current channel is highlighted correctly
- Clicking opens dropdown with all channels
- Selecting a channel changes the app's channel
- "No channel" option removes app from channel
- Loading state shows during channel change
- Error message shows if change fails
- Clicking outside closes dropdown
- Multiple apps can be on different channels
- Two apps on same channel can share context (broadcast test)

### Scenario: Context Sharing
1. Open two example apps (e.g., Chart and Blotter).
2. Join both to the same channel (e.g., Red).
3. In one app, broadcast a context.
4. Verify the other app receives the context.
5. Change one app to a different channel.
6. Broadcast again and verify it is not received by the app on a different channel.

### Scenario: Error Handling
1. Modify code temporarily to attempt joining a non-existent channel.
2. Verify the error message appears.
3. Verify the app remains on the original channel.
