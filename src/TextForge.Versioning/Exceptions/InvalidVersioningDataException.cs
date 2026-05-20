namespace TextForge.Versioning.Exceptions;

public sealed class InvalidVersioningDataException : Exception
{
    public InvalidVersioningDataException(string message) : base(message) { }
    public InvalidVersioningDataException(string message, Exception inner) : base(message, inner) { }
}
