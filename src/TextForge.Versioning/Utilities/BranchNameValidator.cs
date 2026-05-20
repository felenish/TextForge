using System.Text.RegularExpressions;

namespace TextForge.Versioning.Utilities;

public static class BranchNameValidator
{
    private static readonly Regex ValidPattern = new(@"^[a-zA-Z0-9._-]+$", RegexOptions.Compiled);

    public static void Validate(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Branch name must not be empty.", nameof(name));

        if (name.Length > 100)
            throw new ArgumentException("Branch name must not exceed 100 characters.", nameof(name));

        if (!ValidPattern.IsMatch(name))
            throw new ArgumentException(
                "Branch name may only contain letters, numbers, hyphens, underscores, and dots.", nameof(name));

        if (name.StartsWith('.') || name.StartsWith('-') || name.EndsWith('.') || name.EndsWith('-'))
            throw new ArgumentException(
                "Branch name must not start or end with a dot or hyphen.", nameof(name));
    }
}
