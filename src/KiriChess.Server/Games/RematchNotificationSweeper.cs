namespace KiriChess.Server.Games;

/// <summary>
/// Runs <see cref="RematchNotificationSweep"/> while there is something for it to do. The first run
/// waits for the reason <c>RatingInactivitySweeper</c>'s does: it must not compete with migrations,
/// GameRecoveryService and the leaderboard warm-up for the same connection pool at boot. That first
/// run is the restart case this sweep exists for (P-3-7), so it always happens.
///
/// After it, the sweeper only ticks while an offer is still owed a mail. With nothing owed it waits on
/// <see cref="RematchSweepSignal"/>, which a new offer raises once its due-at is
/// persisted, instead of querying Postgres every 15s. A fixed 15s tick on the one
/// production machine that never stops (fly.backend.toml pins it) meant Neon's compute never went
/// five minutes without a query and so never suspended: it billed around the clock with no players.
///
/// <see cref="IdleFallback"/> covers the one owed row no local signal announces: an offer armed on a
/// second instance that then died before sending. That case is hours-tolerant (the offer window is
/// an hour, and the mail is a courtesy), so an hourly look is enough and still lets the compute sleep.
///
/// Tests that need the sweep call <see cref="RematchNotificationService.FlushOwedAsync"/> directly
/// and do not wait for this loop.
/// </summary>
public sealed class RematchNotificationSweeper : BackgroundService
{
    private static readonly TimeSpan InitialDelay = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan IdleFallback = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RematchSweepSignal _signal;
    private readonly ILogger<RematchNotificationSweeper> _logger;

    public RematchNotificationSweeper(
        IServiceScopeFactory scopeFactory, RematchSweepSignal signal,
        ILogger<RematchNotificationSweeper> logger)
    {
        _scopeFactory = scopeFactory;
        _signal = signal;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(InitialDelay, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                if (await RunOnceAsync(stoppingToken))
                    await Task.Delay(Interval, stoppingToken);
                else
                    await _signal.WaitAsync(IdleFallback, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown, not a failure.
        }
    }

    /// <summary>
    /// True when another tick is owed. A failed sweep counts as owed so a transient database fault
    /// is retried on the normal tick rather than parked for an hour.
    /// </summary>
    private async Task<bool> RunOnceAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var sweep = scope.ServiceProvider.GetRequiredService<RematchNotificationSweep>();
            return await sweep.RunAsync(ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw; // shutdown, not a failed sweep - let it propagate out of the loop
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Rematch notification sweep failed; will try again next tick.");
            return true;
        }
    }
}
