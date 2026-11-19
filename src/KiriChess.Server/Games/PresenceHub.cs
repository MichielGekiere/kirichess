using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace KiriChess.Server.Games;

/// <summary>
/// Presence channel for the home screen: pushes the live "players online / in game" counts.
/// The counts are for signed-in players only: an anonymous connection is still accepted (so the
/// connection budget and the hub's wire shape stay as they were) but it is never counted, never
/// sent the initial snapshot, and never joins <see cref="MembersGroup"/>, which is the only audience
/// <see cref="PresenceBroadcaster"/> pushes to. Gating on the server rather than only hiding the
/// readout in the UI is the point: the numbers must not be readable off the wire by a visitor.
/// </summary>
public sealed class PresenceHub : Hub
{
    /// <summary>SignalR group holding every authenticated presence connection.</summary>
    public const string MembersGroup = "presence:members";

    private readonly PresenceTracker _presence;
    private readonly PresenceBroadcaster _broadcaster;

    public PresenceHub(PresenceTracker presence, PresenceBroadcaster broadcaster)
    {
        _presence = presence;
        _broadcaster = broadcaster;
    }

    public override async Task OnConnectedAsync()
    {
        var raw = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? Context.User?.FindFirstValue("sub");
        if (Guid.TryParse(raw, out var userId))
        {
            _presence.Track(Context.ConnectionId, userId);
            await Groups.AddToGroupAsync(Context.ConnectionId, MembersGroup, Context.ConnectionAborted);

            // Send straight away so the client paints a number instead of waiting for the next sweep.
            await Clients.Caller.SendAsync("PresenceChanged", await _broadcaster.CurrentAsync(Context.ConnectionAborted));
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _presence.Remove(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
