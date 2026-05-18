namespace TextForge.Core.Exceptions;

public sealed class SceneFileNotFoundException : Exception
{
    public SceneFileNotFoundException() { }

    public SceneFileNotFoundException(string message) : base(message) { }

    public SceneFileNotFoundException(string message, Exception innerException)
        : base(message, innerException) { }
}
