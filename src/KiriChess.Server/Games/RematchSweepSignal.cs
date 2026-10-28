namespace KiriChess.Server.Games;

/// <summary>
/// Wakes an idle <see cref="RematchNotificationSweeper"/>. The sweeper does not poll Postgres while
/// nothing is owed, because a 15s query on the one production machine that never stops is what kept
/// Neon's compute from ever suspending; it waits here instead. <see cref="RematchNotificationService"/>
/// raises it once a new offer's due-at is persisted, not when the offer is armed, so the sweep it wakes
/// can already see the row.
///
/// A capacity-one semaphore: a burst of offers while the sweeper is busy collapses into one wake,
/// which is all it needs, since one sweep reads every owed row.
/// </summary>
public sealed class RematchSweepSignal
{
    private readonly SemaphoreSlim _pending = new(0, 1);

    public void Raise()
    {
        if (_pending.CurrentCount > 0) return;
        try { _pending.Release(); }
        catch (SemaphoreFullException) { } // lost a race with another raise: already raised
    }

    /// <summary>True when raised, false when <paramref name="timeout"/> elapsed first.</summary>
    public Task<bool> WaitAsync(TimeSpan timeout, CancellationToken ct) => _pending.WaitAsync(timeout, ct);
}
