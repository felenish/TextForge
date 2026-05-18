namespace TextForge.Core.Validation;

public static class TitleValidator
{
    public const int MaxLength = 200;

    public static bool IsValid(string? title, out string error)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            error = "Title must not be empty or whitespace.";
            return false;
        }
        if (title.Length > MaxLength)
        {
            error = $"Title must not exceed {MaxLength} characters.";
            return false;
        }
        error = string.Empty;
        return true;
    }

    public static void Validate(string? title, string paramName = "title")
    {
        if (!IsValid(title, out var error))
            throw new ArgumentException(error, paramName);
    }
}
