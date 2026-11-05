using KiriChess.Server.Games;
using Xunit;

namespace KiriChess.Server.Tests;

/// <summary>
/// The wake that lets <see cref="RematchNotificationSweeper"/> stop polling Postgres while no rematch
/// mail is owed. Real time, but only ever waiting on a timeout the test expects to elapse or on a
/// signal already raised, so nothing here sleeps for behaviour.
/// </summary>
public sealed class RematchSweepSignalTests
{
    private static readonly TimeSpan Short = TimeSpan.FromMilliseconds(50);

    [Fact]
    public async Task Wait_times_out_when_nothing_was_raised()
    {
        var signal = new RematchSweepSignal();

        Assert.False(await signal.WaitAsync(Short, CancellationToken.None));
    }

    [Fact]
    public async Task A_raise_before_the_wait_is_not_lost()
    {
        var signal = new RematchSweepSignal();
        signal.Raise();

        Assert.True(await signal.WaitAsync(Short, CancellationToken.None));
    }

    [Fact]
    public async Task A_burst_of_raises_collapses_into_one_wake()
    {
        var signal = new RematchSweepSignal();
        for (var i = 0; i < 5; i++) signal.Raise();

        Assert.True(await signal.WaitAsync(Short, CancellationToken.None));
        Assert.False(await signal.WaitAsync(Short, CancellationToken.None));
    }

    [Fact]
    public async Task A_raise_wakes_a_waiter_already_parked()
    {
        var signal = new RematchSweepSignal();
        var waiting = signal.WaitAsync(TimeSpan.FromSeconds(30), CancellationToken.None);
        Assert.False(waiting.IsCompleted);

        signal.Raise();

        Assert.True(await waiting.WaitAsync(TimeSpan.FromSeconds(5)));
    }
}
