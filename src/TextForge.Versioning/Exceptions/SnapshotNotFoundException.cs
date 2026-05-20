namespace TextForge.Versioning.Exceptions;

public sealed class SnapshotNotFoundException : Exception
{
    public SnapshotNotFoundException(string message) : base(message) { }
}
