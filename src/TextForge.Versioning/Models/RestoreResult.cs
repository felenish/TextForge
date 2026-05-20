namespace TextForge.Versioning.Models;

public sealed record RestoreResult(int Restored, IReadOnlyList<string> Skipped);
