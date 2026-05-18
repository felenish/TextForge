using System.Text;

namespace TextForge.Core.Validation;

public static class PathSanitizer
{
    public const int MaxSegmentLength = 80;
    private const string Fallback = "untitled";

    public static string Sanitize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return Fallback;

        var source = input.Trim().ToLowerInvariant();
        var sb = new StringBuilder(source.Length);

        foreach (var c in source)
        {
            if (char.IsAsciiLetterOrDigit(c))
                sb.Append(c);
            else
                sb.Append('-');
        }

        var result = CollapseHyphens(sb.ToString()).Trim('-');

        if (result.Length > MaxSegmentLength)
            result = result[..MaxSegmentLength].TrimEnd('-');

        return string.IsNullOrEmpty(result) ? Fallback : result;
    }

    private static string CollapseHyphens(string input)
    {
        var sb = new StringBuilder(input.Length);
        var lastWasHyphen = false;

        foreach (var c in input)
        {
            if (c == '-')
            {
                if (!lastWasHyphen)
                    sb.Append(c);
                lastWasHyphen = true;
            }
            else
            {
                sb.Append(c);
                lastWasHyphen = false;
            }
        }

        return sb.ToString();
    }
}
