using System.Net.Http.Json;
using System.Text.Json;
using KiriChess.Server.Data;
using KiriChess.Server.Games;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;

namespace KiriChess.Server.Tests;

/// <summary>
/// The lobby counts (players online / in game) are for signed-in players only. An anonymous
/// presence connection is still accepted, but must never be sent <c>PresenceChanged</c>, neither the
/// initial snapshot from <see cref="PresenceHub.OnConnectedAsync"/> nor the
/// <see cref="PresenceBroadcaster"/> tick. A signed-in connection receives both.
/// Requires Docker; skips cleanly when no Docker daemon is reachable.
/// </summary>
public sealed class PresenceHubVisibilityTests : IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Comfortably longer than the broadcaster's 3s interval, so a tick that would leak the counts to
    /// the anonymous connection has had the chance to.
    /// </summary>
    private static readonly TimeSpan QuietWindow = TimeSpan.FromSeconds(5);

    private PostgreSqlContainer? _pg;

    public async Task InitializeAsync()
    {
        if (!DockerAvailability.IsAvailable) return;
        _pg = new PostgreSqlBuilder().WithImage("postgres:16-alpine").Build();
        await _pg.StartAsync();
    }

    public async Task DisposeAsync()
    {
        if (_pg is not null) await _pg.DisposeAsync();
    }

    [SkippableFact]
    public async Task Anonymous_connection_never_receives_the_counts_but_a_signed_in_one_does()
    {
        Skip.IfNot(DockerAvailability.IsAvailable, "Docker not available");

        await using var factory = CreateHost();
        await MigrateAsync(factory);
        using var http = factory.CreateClient();

        var anonymous = BuildConnection(factory);
        var anonymousReceived = 0;
        anonymous.On<PresenceDto>("PresenceChanged", _ => Interlocked.Increment(ref anonymousReceived));
        await anonymous.StartAsync();
        Assert.Equal(HubConnectionState.Connected, anonymous.State);

        // A signed-in player arriving changes the counts, which is exactly the moment the broadcaster
        // pushes; the anonymous connection must stay silent through it.
        var token = await RegisterAsync(http, "presence-member@example.com", "Presence Member");
        var member = BuildConnection(factory, token);
        var memberSnapshot = new TaskCompletionSource<PresenceDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        member.On<PresenceDto>("PresenceChanged", p => memberSnapshot.TrySetResult(p));
        await member.StartAsync();

        var snapshot = await memberSnapshot.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(1, snapshot.Online);

        await Task.Delay(QuietWindow);
        Assert.Equal(0, Volatile.Read(ref anonymousReceived));

        await member.DisposeAsync();
        await anonymous.DisposeAsync();
    }

    private static HubConnection BuildConnection(WebApplicationFactory<Program> factory, string? token = null) =>
        new HubConnectionBuilder()
            .WithUrl(new Uri(factory.Server.BaseAddress, "hubs/presence"), options =>
            {
                // Long polling over the TestServer handler, same reasoning as TwoInstanceGameTests:
                // the in-memory transport carries no real sockets.
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.Transports = HttpTransportType.LongPolling;
                if (token is not null) options.AccessTokenProvider = () => Task.FromResult<string?>(token);
            })
            .Build();

    private WebApplicationFactory<Program> CreateHost() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, cfg) => cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Postgres"] = _pg!.GetConnectionString(),
                ["Jwt:Key"] = "presence-visibility-test-signing-key-at-least-32-bytes",
                ["Jwt:Issuer"] = "kirichess",
                ["Jwt:Audience"] = "kirichess",
                ["Jwt:ExpiryMinutes"] = "60",
                ["Jwt:RefreshTokenExpiryDays"] = "30",
                ["Auth:BreachedPasswordCheckEnabled"] = "false"
            }));
        });

    private static async Task MigrateAsync(WebApplicationFactory<Program> factory)
    {
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<KiriChessDbContext>().Database.MigrateAsync();
    }

    private static async Task<string> RegisterAsync(HttpClient client, string email, string displayName)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "P@ssword123!",
            DisplayName = displayName,
            AcceptedTerms = true,
            ConfirmedMinimumAge = true
        }, JsonOptions);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        return payload.GetProperty("token").GetString()!;
    }
}
