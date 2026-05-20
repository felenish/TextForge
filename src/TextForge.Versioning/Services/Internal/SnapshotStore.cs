using System.Text.Json;
using System.Text.Json.Serialization;
using TextForge.Core.Utilities;
using TextForge.Versioning.Exceptions;
using TextForge.Versioning.Models;
using Microsoft.Extensions.Logging;

namespace TextForge.Versioning.Services.Internal;

internal sealed class SnapshotStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly ILogger _logger;

    public SnapshotStore(ILogger logger) => _logger = logger;

    public async Task WriteSnapshotAsync(string seriesRoot, Snapshot snapshot, CancellationToken ct)
    {
        var path = SnapshotPath(seriesRoot, snapshot.Id);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        var json = JsonSerializer.Serialize(new SnapshotJson(snapshot), JsonOptions);
        await SafeFileWriter.WriteAsync(path, json, ct);
    }

    public async Task<Snapshot?> ReadSnapshotAsync(string seriesRoot, Guid id, CancellationToken ct)
    {
        var path = SnapshotPath(seriesRoot, id);
        if (!File.Exists(path))
            return null;

        var json = await File.ReadAllTextAsync(path, ct);
        try
        {
            var dto = JsonSerializer.Deserialize<SnapshotJson>(json, JsonOptions)
                ?? throw new InvalidVersioningDataException($"Snapshot {id} deserialized to null.");
            return dto.ToSnapshot();
        }
        catch (JsonException ex)
        {
            throw new InvalidVersioningDataException($"Snapshot {id} contains invalid JSON.", ex);
        }
    }

    public async Task<IReadOnlyList<Snapshot>> ReadAllAsync(string seriesRoot, CancellationToken ct)
    {
        var dir = Path.Combine(seriesRoot, ".textforge", "snapshots");
        if (!Directory.Exists(dir))
            return [];

        var results = new List<Snapshot>();
        foreach (var file in Directory.EnumerateFiles(dir, "*.json"))
        {
            if (!Guid.TryParse(Path.GetFileNameWithoutExtension(file), out var id))
                continue;

            try
            {
                var snapshot = await ReadSnapshotAsync(seriesRoot, id, ct);
                if (snapshot is not null)
                    results.Add(snapshot);
            }
            catch (InvalidVersioningDataException ex)
            {
                _logger.LogWarning(ex, "Skipping unreadable snapshot file: {File}", file);
            }
        }
        return results;
    }

    private static string SnapshotPath(string seriesRoot, Guid id) =>
        Path.Combine(seriesRoot, ".textforge", "snapshots", $"{id}.json");

    // Separate serialisation type to avoid exposing mutable model internals to STJ
    private sealed class SnapshotJson
    {
        public Guid Id { get; set; }
        public string Label { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTimeOffset TimestampUtc { get; set; }
        public string Branch { get; set; } = "main";
        public Guid? ParentId { get; set; }
        public Dictionary<string, string> Scenes { get; set; } = [];

        public SnapshotJson() { }

        public SnapshotJson(Snapshot s)
        {
            Id = s.Id;
            Label = s.Label;
            Message = s.Message;
            TimestampUtc = s.TimestampUtc;
            Branch = s.Branch;
            ParentId = s.ParentId;
            Scenes = s.Scenes.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value);
        }

        public Snapshot ToSnapshot() => new()
        {
            Id = Id,
            Label = Label,
            Message = Message,
            TimestampUtc = TimestampUtc,
            Branch = Branch,
            ParentId = ParentId,
            Scenes = Scenes.ToDictionary(kv => Guid.Parse(kv.Key), kv => kv.Value),
        };
    }
}
