namespace TextForge.Core.Exceptions;

public sealed class ManifestNotFoundException : Exception
{
    public ManifestNotFoundException() { }

    public ManifestNotFoundException(string message) : base(message) { }

    public ManifestNotFoundException(string message, Exception innerException)
        : base(message, innerException) { }
}
